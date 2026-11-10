import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStaffContext, type StaffContext } from '@/lib/auth-helpers';
import { enforceRateLimitPermissive, enforceRateLimitStrict } from '@/lib/rate-limit';
import {
  MAX_APPROVE_BATCH, checkinRequestsEnabledFor, classifyCheckinResult, staffMayManageEvent, staffMayReconcile,
} from '@/lib/checkin-requests';
import {
  REQUEST_COLUMNS, fetchEvidence, reopenRequest, settleOpenRequests, type RequestRow,
} from '@/lib/checkin-requests-server';
import { PIN_GRANT_COOKIE, extendPinGrant, pinCookieOptions, pinGrantScope, readCookie, readPinGrant, type PinGrant } from '@/lib/pin-grant';
// The ONE place attendance, XP, Prize Points, home-store verification and Founding Member are written. Approving a request
// calls this exact handler (not a copy), inside the same signed-in staff request, so its staff-permission checks run for real.
import { POST as staffCheckIn } from '@/app/api/events/[id]/checkin/route';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

type Ev = { id: string; status: string; store_id: string | null };

async function loadEvent(eventId: string): Promise<Ev | null> {
  const { data } = await supabaseAdmin.from('events').select('id, status, store_id').eq('id', eventId).maybeSingle();
  return data as Ev | null;
}

/** Everything every request here must pass, in this order: Clerk staff session, event exists, store scope, feature flag. */
async function gate(eventId: string): Promise<{ res: NextResponse } | { staff: StaffContext; event: Ev }> {
  if (!UUID_RE.test(eventId)) return { res: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  const staff = await getStaffContext();
  if (!staff) return { res: NextResponse.json({ error: 'Staff access required' }, { status: 403 }) };
  const event = await loadEvent(eventId);
  if (!event) return { res: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  if (!staffMayManageEvent(staff, event.store_id)) return { res: NextResponse.json({ error: 'Staff access required for this store' }, { status: 403 }) };
  return { staff, event };
}

const pinRequired = () => NextResponse.json({ error: 'Enter your PIN to continue.', code: 'pin_required' }, { status: 403 });

function withGrant(res: NextResponse, staff: StaffContext, event: Ev, grant: PinGrant): NextResponse {
  const next = extendPinGrant(staff.appUserId, pinGrantScope(event.store_id), grant);
  res.cookies.set(PIN_GRANT_COOKIE, next.value, pinCookieOptions(next.grant));
  res.headers.set('X-Pin-Expires', String(next.grant.expiresAt));
  return res;
}

async function playersById(ids: string[]) {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map<string, { id: string; display_name: string | null; player_id: string }>();
  const { data } = await supabaseAdmin.from('players').select('id, display_name, player_id').in('id', unique);
  return new Map((data ?? []).map(p => [p.id, p]));
}

// GET: the kiosk's view. Counts for any staff member of the store; names, ids and the actionable list ONLY with a valid PIN grant.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const g = await gate(params.id);
    if ('res' in g) return g.res;
    const { staff, event } = g;
    if (!checkinRequestsEnabledFor(event.store_id)) return NextResponse.json({ enabled: false }, { headers: NO_STORE });

    const limited = await enforceRateLimitPermissive(`checkin-requests-list:${staff.clerkUserId}`, 60, 120);
    if (limited) return limited;

    // Pending requests of any event that is no longer active become 'expired' (history stays).
    const { error: expErr } = await supabaseAdmin.rpc('expire_checkin_requests', { p_event: null });
    if (expErr) console.error('expire_checkin_requests failed:', expErr);

    const { data: raw } = await supabaseAdmin
      .from('checkin_requests').select(REQUEST_COLUMNS)
      .eq('event_id', event.id).in('status', ['pending', 'approving', 'needs_review', 'dismissed'])
      .order('requested_at', { ascending: true });
    const rows = (raw ?? []) as RequestRow[];

    // Housekeeping from the award records. A request that is actively being approved is never touched here.
    await settleOpenRequests(rows.filter(r => r.status === 'pending' || r.status === 'approving'));
    const live = rows.filter(r => r.status !== 'approved');

    const grant = readPinGrant(readCookie(request, PIN_GRANT_COOKIE), staff.appUserId, pinGrantScope(event.store_id));
    const canReconcile = staffMayReconcile(staff, event.store_id);
    const counts = {
      waiting: live.filter(r => r.status === 'pending' || r.status === 'approving').length,
      needsReview: live.filter(r => r.status === 'needs_review').length,
      dismissed: live.filter(r => r.status === 'dismissed').length,
    };
    const base = { enabled: true, eventStatus: event.status, authorized: !!grant, pinExpiresAt: grant?.expiresAt ?? null, canReconcile, counts };
    if (!grant) return NextResponse.json({ ...base, requests: [] }, { headers: NO_STORE });

    const byId = await playersById(live.map(r => r.player_id));
    const requests = await Promise.all(live.map(async r => {
      let evidence: unknown = undefined;
      if (r.status === 'needs_review' && canReconcile) {
        const ev = await fetchEvidence(r.event_id, r.player_id);
        evidence = ev ? { ...ev.evidence, verdict: ev.verdict } : null;
      }
      return {
        id: r.id, status: r.status, playerName: byId.get(r.player_id)?.display_name || 'Player', playerId: byId.get(r.player_id)?.player_id || '',
        requestedAt: r.requested_at, lastError: r.last_error, resolution: r.resolution, ...(evidence !== undefined ? { evidence } : {}),
      };
    }));
    // Reading never slides the grant: an idle, open panel must still lock itself.
    return NextResponse.json({ ...base, requests }, { headers: NO_STORE });
  } catch (err) {
    console.error('checkin-requests GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

type Result = { id: string; playerName: string; result: string; error?: string; verdict?: string };

// POST { action: 'approve' | 'dismiss' | 'reopen' | 'reconcile', request_ids, resolution? }
// Every action needs: staff session, store scope, the feature flag, and a current server-validated PIN grant.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const g = await gate(params.id);
    if ('res' in g) return g.res;
    const { staff, event } = g;
    if (!checkinRequestsEnabledFor(event.store_id)) return NextResponse.json({ error: 'Not available', code: 'feature_disabled' }, { status: 404 });

    const limited = await enforceRateLimitStrict(`checkin-requests-act:${staff.clerkUserId}`, 60, 60);
    if (limited) return limited;

    const grant = readPinGrant(readCookie(request, PIN_GRANT_COOKIE), staff.appUserId, pinGrantScope(event.store_id));
    if (!grant) return pinRequired();

    let body: { action?: unknown; request_ids?: unknown; resolution?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
    const action = body.action;
    if (action !== 'approve' && action !== 'dismiss' && action !== 'reopen' && action !== 'reconcile') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    if (!Array.isArray(body.request_ids) || body.request_ids.length === 0 || !body.request_ids.every(i => typeof i === 'string' && UUID_RE.test(i))) {
      return NextResponse.json({ error: 'Pick at least one player' }, { status: 400 });
    }
    const requestIds = Array.from(new Set(body.request_ids as string[]));
    if (requestIds.length > MAX_APPROVE_BATCH) return NextResponse.json({ error: `Pick at most ${MAX_APPROVE_BATCH} players at a time` }, { status: 400 });

    if (action === 'reconcile' && !staffMayReconcile(staff, event.store_id)) {
      return NextResponse.json({ error: 'A manager has to reconcile this.', code: 'manager_required' }, { status: 403 });
    }
    if ((action === 'approve' || action === 'dismiss' || action === 'reopen') && event.status !== 'active') {
      await supabaseAdmin.rpc('expire_checkin_requests', { p_event: event.id });
      return NextResponse.json({ error: 'This event has ended, so its requests have expired.', code: 'event_not_active' }, { status: 409 });
    }

    // Validate against the stored record: only rows that belong to THIS event count. The browser never supplies a player.
    const { data: found } = await supabaseAdmin
      .from('checkin_requests').select(REQUEST_COLUMNS)
      .eq('event_id', event.id).in('id', requestIds).order('requested_at', { ascending: true });
    const rows = (found ?? []) as RequestRow[];
    const foundIds = new Set(rows.map(r => r.id));
    const byId = await playersById(rows.map(r => r.player_id));
    const { data: me } = await supabaseAdmin.from('players').select('id').eq('clerk_user_id', staff.clerkUserId).maybeSingle();
    const decidedBy: string | null = me?.id ?? null;
    const nameOf = (r: RequestRow) => byId.get(r.player_id)?.display_name || 'Player';
    const results: Result[] = requestIds.filter(id => !foundIds.has(id)).map(id => ({ id, playerName: '', result: 'not_found' }));
    const reply = (extra: Record<string, unknown> = {}) => withGrant(NextResponse.json({ results, ...extra }), staff, event, grant);

    if (action === 'dismiss') {
      for (const r of rows) {
        if (r.status !== 'pending') { results.push({ id: r.id, playerName: nameOf(r), result: 'skipped', error: r.status }); continue; }
        const { data: upd } = await supabaseAdmin.from('checkin_requests')
          .update({ status: 'dismissed', resolution: 'dismissed', decided_by: decidedBy, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', r.id).eq('status', 'pending').select('id');
        results.push({ id: r.id, playerName: nameOf(r), result: upd && upd.length ? 'dismissed' : 'skipped' });
      }
      return reply();
    }

    if (action === 'reopen') {
      for (const r of rows) {
        const out = await reopenRequest(r, event.status, decidedBy);
        results.push({ id: r.id, playerName: nameOf(r), result: out === 'reopened' ? 'reopened' : out === 'already_checked_in' ? 'already_checked_in' : out === 'needs_review' ? 'needs_review' : 'skipped', ...(out !== 'reopened' && out !== 'already_checked_in' && out !== 'needs_review' ? { error: out } : {}) });
      }
      return reply();
    }

    if (action === 'reconcile') {
      const resolution = body.resolution;
      if (resolution !== 'confirm_complete' && resolution !== 'release' && resolution !== 'recheck') return NextResponse.json({ error: 'Bad request' }, { status: 400 });
      if (requestIds.length !== 1) return NextResponse.json({ error: 'Reconcile one player at a time' }, { status: 400 });
      const r = rows[0];
      if (!r) return reply();
      if (r.status !== 'needs_review') { results.push({ id: r.id, playerName: nameOf(r), result: 'skipped', error: r.status }); return reply(); }
      const ev = await fetchEvidence(r.event_id, r.player_id);
      if (!ev) return NextResponse.json({ error: 'Could not read the award records. Nothing was changed.', code: 'evidence_unavailable' }, { status: 503 });
      const evidence = { ...ev.evidence, verdict: ev.verdict };
      if (resolution === 'recheck') { results.push({ id: r.id, playerName: nameOf(r), result: 'rechecked', verdict: ev.verdict }); return reply({ evidence }); }

      const nowIso = new Date().toISOString();
      const reviewed = { reviewed_by: decidedBy, reviewed_at: nowIso, updated_at: nowIso };
      if (resolution === 'confirm_complete') {
        if (ev.verdict !== 'complete') return withGrant(NextResponse.json({ error: 'The records do not show a complete check-in, so it cannot be confirmed.', code: 'not_complete', evidence }, { status: 409 }), staff, event, grant);
        const { data: upd } = await supabaseAdmin.from('checkin_requests')
          .update({ status: 'approved', resolution: 'reconciled_complete', last_error: null, decided_at: nowIso, ...reviewed })
          .eq('id', r.id).eq('status', 'needs_review').select('id');
        results.push({ id: r.id, playerName: nameOf(r), result: upd && upd.length ? 'confirmed_complete' : 'skipped', verdict: ev.verdict });
        return reply({ evidence });
      }
      // release: nothing was written, so the request may go back to the waiting list (or expire if the event is over). Never for partial.
      if (ev.verdict !== 'empty') return withGrant(NextResponse.json({ error: 'The records show part of a check-in, so it cannot be released. Repair it first.', code: 'not_empty', evidence }, { status: 409 }), staff, event, grant);
      const patch = event.status === 'active'
        ? { status: 'pending', resolution: 'reconciled_released', last_error: null, ...reviewed }
        : { status: 'expired', resolution: 'event_ended', last_error: null, decided_at: nowIso, ...reviewed };
      const { data: upd } = await supabaseAdmin.from('checkin_requests').update(patch).eq('id', r.id).eq('status', 'needs_review').select('id');
      results.push({ id: r.id, playerName: nameOf(r), result: upd && upd.length ? (event.status === 'active' ? 'released' : 'expired') : 'skipped', verdict: ev.verdict });
      return reply({ evidence });
    }

    // approve: one person at a time, in order. Each goes through the existing staff check-in handler; nothing is retried here.
    for (const r of rows) {
      const player = byId.get(r.player_id);
      const name = nameOf(r);
      if (r.status !== 'pending' || !player?.player_id) { results.push({ id: r.id, playerName: name, result: 'skipped', error: r.status }); continue; }

      // Claim it. Only one staff member's approval can hold a request at a time.
      const { data: claimed } = await supabaseAdmin.from('checkin_requests')
        .update({ status: 'approving', attempts: (r.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', r.id).eq('status', 'pending').select('id');
      if (!claimed || claimed.length === 0) { results.push({ id: r.id, playerName: name, result: 'skipped', error: 'claimed_elsewhere' }); continue; }

      let outcome;
      try {
        const res = await staffCheckIn(
          new Request(new URL(`/api/events/${event.id}/checkin`, request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: player.player_id }),
          }),
          { params: { id: event.id } },
        );
        const parsed = await res.json().catch(() => null);
        outcome = classifyCheckinResult(res.status, parsed);
      } catch (err) {
        console.error('checkin-requests approve: check-in handler threw:', err);
        outcome = { kind: 'needs_review' as const, error: 'handler_threw' };
      }

      const nowIso = new Date().toISOString();
      // Records the outcome. Returns false if the row was no longer 'approving' (someone else moved it), which is reported, not hidden.
      const finish = async (patch: Record<string, unknown>) => {
        const { data, error } = await supabaseAdmin.from('checkin_requests').update({ ...patch, updated_at: nowIso }).eq('id', r.id).eq('status', 'approving').select('id');
        if (error || !data || data.length === 0) {
          console.error('checkin-requests: could not record the outcome (the list will settle it from the award records):', r.id, error);
          return false;
        }
        return true;
      };

      let recorded = true;
      let result: string; let error: string | undefined;
      switch (outcome.kind) {
        case 'approved':
          recorded = await finish({ status: 'approved', resolution: outcome.resolution, last_error: null, decided_by: decidedBy, decided_at: nowIso });
          result = outcome.resolution; break;
        case 'renewal_required':
          recorded = await finish({ status: 'pending', resolution: 'renewal_required', last_error: 'renewal_required' });
          result = 'renewal_required'; break;
        case 'not_active':
          recorded = await finish({ status: 'expired', resolution: 'event_ended', decided_at: nowIso });
          result = 'event_ended'; break;
        case 'failed':
          recorded = await finish({ status: 'pending', last_error: outcome.error });
          result = 'failed'; error = outcome.error; break;
        default:
          console.error(`CHECKIN_REQUEST_NEEDS_REVIEW event=${event.id} request=${r.id} player=${r.player_id} reason=${outcome.error}`);
          recorded = await finish({ status: 'needs_review', last_error: outcome.error });
          result = 'needs_review'; error = outcome.error;
      }
      results.push({ id: r.id, playerName: name, result, ...(error ? { error } : {}), ...(recorded ? {} : { error: error ?? 'not_recorded' }) });
    }
    return reply();
  } catch (err) {
    console.error('checkin-requests POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
