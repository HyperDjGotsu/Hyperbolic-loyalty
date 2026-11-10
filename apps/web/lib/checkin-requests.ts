// Printable check-in QR: pending requests. This file only DECIDES things (who may manage an event, what an approval result means).
// It writes nothing and awards nothing. The award itself stays in app/api/events/[id]/checkin/route.ts + lib/attendance-award.ts.

import type { StaffContext } from '@/lib/auth-helpers';

export type RequestStatus = 'pending' | 'approving' | 'approved' | 'dismissed' | 'expired' | 'needs_review';

export const MAX_APPROVE_BATCH = 10;      // the kiosk sends 10 at a time and shows progress; the server refuses more than this per call
export const MAX_OPEN_PER_EVENT = 300;    // cap on open requests per event, so a leaked photo cannot flood the staff list
export const APPROVING_STALE_MS = 2 * 60_000; // an approval claim older than this is treated as an unknown outcome

/** Same rule as the check-in route and the kiosk token route: staff of the event's store, or a network admin. Network events need a manager or admin. */
export function staffMayManageEvent(staff: StaffContext, eventStoreId: string | null): boolean {
  if (eventStoreId === null) return staff.isNetworkAdmin || staff.managedStoreIds.length > 0;
  return staff.isNetworkAdmin || staff.allStoreIds.includes(eventStoreId);
}

export type ApprovalOutcome =
  | { kind: 'approved'; resolution: 'checked_in' | 'already_checked_in' }
  | { kind: 'renewal_required' }                      // nothing written; needs the kiosk's renewal prompt
  | { kind: 'not_active' }                            // event ended meanwhile; nothing written
  | { kind: 'failed'; error: string }                 // a definite refusal; nothing was written; staff may try again by hand
  | { kind: 'needs_review'; error: string };          // unknown outcome; NEVER retried automatically

/**
 * Turn the response of the existing check-in endpoint into one outcome. Only two results count as "checked in":
 * success, and the endpoint's own "already checked in" (the unique attendance row is the authority). Anything unclear is needs_review.
 */
export function classifyCheckinResult(status: number, body: unknown): ApprovalOutcome {
  const b = (body && typeof body === 'object' ? body : null) as Record<string, unknown> | null;
  if (!b) return { kind: 'needs_review', error: `unreadable_response_${status}` };

  if (status === 200 && b.success === true) return { kind: 'approved', resolution: 'checked_in' };
  if (status === 400 && b.alreadyCheckedIn === true) return { kind: 'approved', resolution: 'already_checked_in' };
  if (status === 200 && b.renewalOpportunity === true) return { kind: 'renewal_required' };

  const code = typeof b.code === 'string' ? b.code : '';
  if (code === 'award_needs_review') return { kind: 'needs_review', error: 'award_needs_review' };
  if (code === 'award_failed') return { kind: 'failed', error: 'award_failed' }; // the route says it rolled back and nothing was awarded

  if (status === 400 && b.error === 'Event is not active') return { kind: 'not_active' };
  if (status === 401 || status === 403 || status === 404 || status === 429) return { kind: 'failed', error: `refused_${status}` };

  // 5xx without a recognised code, a 200 that is not a success, a 400 we do not know: we cannot tell what was written.
  return { kind: 'needs_review', error: `unexpected_${status}` };
}

// ---------------------------------------------------------------------------------------------------------------------
// Feature flag: which stores may use printable check-in requests. OFF everywhere unless CHECKIN_REQUESTS_STORES lists the store.
//   CHECKIN_REQUESTS_STORES = comma-separated store ids (uuid), e.g. the Benicia id; "*" = every store; "network" = events with no store.
// Unset or empty = disabled for everyone. Changing it needs a redeploy (Vercel env vars apply to new deployments).
export function checkinRequestsEnabledFor(storeId: string | null, raw: string | undefined = process.env.CHECKIN_REQUESTS_STORES): boolean {
  const list = (raw ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return false;
  if (list.includes('*')) return true;
  if (storeId === null) return list.includes('network');
  return list.includes(storeId.toLowerCase());
}

/** A manager (or network admin) may reconcile a needs_review request; plain store staff may not. */
export function staffMayReconcile(staff: StaffContext, eventStoreId: string | null): boolean {
  if (staff.isNetworkAdmin) return true;
  return eventStoreId === null ? staff.managedStoreIds.length > 0 : staff.managedStoreIds.includes(eventStoreId);
}

// ---------------------------------------------------------------------------------------------------------------------
// Award evidence: what the database says a check-in actually wrote (public.checkin_award_evidence).
export type AwardEvidence = { attendanceRows: number; xpRows: number; pointsRows: number; pointsExpected: boolean };
export type AwardVerdict = 'complete' | 'empty' | 'partial';

/** Parse the SQL function's answer. Anything unreadable is null, and callers must treat null as "unknown", never as success. */
export function parseEvidence(raw: unknown): AwardEvidence | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null);
  const a = n(r.attendance_rows), x = n(r.xp_rows), p = n(r.points_rows);
  if (a === null || x === null || p === null || typeof r.points_expected !== 'boolean') return null;
  return { attendanceRows: a, xpRows: x, pointsRows: p, pointsExpected: r.points_expected };
}

/**
 * complete = exactly one attendance row, exactly one XP row, and exactly one Prize Point row when Prize Points are expected
 *            (none when they are not). The whole award, not just the lock.
 * empty    = nothing at all was written.
 * partial  = anything else (attendance without XP, XP without attendance, a duplicate, missing points...). Never settled by the app.
 */
export function classifyEvidence(e: AwardEvidence): AwardVerdict {
  if (e.attendanceRows === 0 && e.xpRows === 0 && e.pointsRows === 0) return 'empty';
  const pointsOk = e.pointsExpected ? e.pointsRows === 1 : e.pointsRows === 0;
  if (e.attendanceRows === 1 && e.xpRows === 1 && pointsOk) return 'complete';
  return 'partial';
}
