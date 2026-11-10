import { supabaseAdmin } from '@/lib/supabase';
import { APPROVING_STALE_MS, classifyEvidence, parseEvidence, type AwardEvidence, type AwardVerdict } from '@/lib/checkin-requests';

// DB-touching helpers for pending check-in requests. They read award records and move a REQUEST between statuses.
// They never write attendance, XP, Prize Points, home store or titles: that stays in the existing check-in route.

export type RequestRow = {
  id: string; status: string; event_id: string; player_id: string; requested_at: string; updated_at: string;
  attempts: number; last_error: string | null; resolution: string | null; reopened_count: number;
};

export const REQUEST_COLUMNS = 'id, status, event_id, player_id, requested_at, updated_at, attempts, last_error, resolution, reopened_count';

/** What the database says this check-in wrote. null = could not be read (treat as unknown, never as success). */
export async function fetchEvidence(eventId: string, playerId: string): Promise<{ evidence: AwardEvidence; verdict: AwardVerdict } | null> {
  const { data, error } = await supabaseAdmin.rpc('checkin_award_evidence', { p_event: eventId, p_player: playerId });
  if (error) { console.error('checkin_award_evidence failed:', error); return null; }
  const evidence = parseEvidence(data);
  return evidence ? { evidence, verdict: classifyEvidence(evidence) } : null;
}

const nowIso = () => new Date().toISOString();

/** Conditional status change: only applies if the row is still in one of `from`. Returns true if it changed. */
async function move(id: string, from: string[], patch: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('checkin_requests')
    .update({ ...patch, updated_at: nowIso() }).eq('id', id).in('status', from).select('id');
  if (error) { console.error('checkin_requests move failed:', id, error); return false; }
  return !!data && data.length > 0;
}

/**
 * Tidy the open requests of one event WITHOUT touching an approval that is running:
 *  - 'approving' younger than the stale window: left completely alone (the approval will record its own outcome).
 *  - 'approving' older than the window: decided from the award records, never assumed:
 *      complete -> approved (recovered_complete)
 *      partial  -> needs_review
 *      empty    -> needs_review too. "Nothing written yet" does not prove the original call is dead: a serverless call can outlive our
 *                  window and still write. Only a manager, from the records, can release it (reconcile), and the check-in route's unique
 *                  attendance row keeps even a late original from paying twice.
 *      evidence unreadable -> left as is for the next look.
 *  - 'pending' whose player already has a COMPLETE award (checked in by NFC / another path): approved (already_checked_in).
 *      Attendance alone is never enough: a check-in that is still being written, or is about to roll back, stays as it is.
 * Mutates the rows it changes so the caller can show the result.
 */
export async function settleOpenRequests(rows: RequestRow[], now = Date.now()): Promise<void> {
  // One query for "who already has an attendance row" across all pending requests of the event.
  const pending = rows.filter(r => r.status === 'pending');
  let attended = new Set<string>();
  if (pending.length > 0) {
    const { data } = await supabaseAdmin.from('event_attendances').select('player_id')
      .eq('event_id', pending[0].event_id).in('player_id', pending.map(r => r.player_id));
    attended = new Set((data ?? []).map((x: { player_id: string | null }) => x.player_id).filter((x): x is string => !!x));
  }
  for (const r of rows) {
    if (r.status === 'approving') {
      if (now - new Date(r.updated_at).getTime() <= APPROVING_STALE_MS) continue; // actively approving: hands off
      const ev = await fetchEvidence(r.event_id, r.player_id);
      if (!ev) continue;
      if (ev.verdict === 'complete') {
        if (await move(r.id, ['approving'], { status: 'approved', resolution: 'recovered_complete', last_error: null, decided_at: nowIso() })) { r.status = 'approved'; r.resolution = 'recovered_complete'; }
      } else {
        const why = ev.verdict === 'empty' ? 'approval_interrupted_no_evidence' : 'approval_interrupted_partial';
        if (await move(r.id, ['approving'], { status: 'needs_review', last_error: why })) { r.status = 'needs_review'; r.last_error = why; }
      }
    } else if (r.status === 'pending' && attended.has(r.player_id)) {
      const ev = await fetchEvidence(r.event_id, r.player_id);
      if (ev?.verdict === 'complete' && await move(r.id, ['pending'], { status: 'approved', resolution: 'already_checked_in', decided_at: nowIso() })) {
        r.status = 'approved'; r.resolution = 'already_checked_in';
      }
    }
  }
}

export type ReopenResult = 'reopened' | 'already_checked_in' | 'needs_review' | 'event_not_active' | 'unavailable' | 'not_reopenable';

/**
 * Put a dismissed or expired request back to pending so the player can be checked in. Safe by construction:
 *  - only while the event is active;
 *  - only from dismissed/expired (a conditional update, so a request that moved meanwhile is untouched);
 *  - the award records decide: nothing written -> pending; a complete award -> approved (no second award possible);
 *    a partial award -> needs_review (a manager reconciles it). Evidence unreadable -> nothing changes.
 * The check-in route's unique attendance row remains the final guard against a duplicate award either way.
 */
export async function reopenRequest(r: Pick<RequestRow, 'id' | 'status' | 'event_id' | 'player_id' | 'reopened_count'>, eventStatus: string, decidedBy: string | null): Promise<ReopenResult> {
  if (r.status !== 'dismissed' && r.status !== 'expired') return 'not_reopenable';
  if (eventStatus !== 'active') return 'event_not_active';
  const ev = await fetchEvidence(r.event_id, r.player_id);
  if (!ev) return 'unavailable';
  const from = ['dismissed', 'expired'];
  if (ev.verdict === 'empty') {
    return (await move(r.id, from, { status: 'pending', resolution: 'reopened', last_error: null, reopened_count: (r.reopened_count ?? 0) + 1, decided_by: decidedBy, decided_at: nowIso() }))
      ? 'reopened' : 'not_reopenable';
  }
  if (ev.verdict === 'complete') {
    return (await move(r.id, from, { status: 'approved', resolution: 'already_checked_in', last_error: null, decided_at: nowIso() }))
      ? 'already_checked_in' : 'not_reopenable';
  }
  return (await move(r.id, from, { status: 'needs_review', last_error: 'reopen_found_partial_award' })) ? 'needs_review' : 'not_reopenable';
}
