import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db, type Row } from './checkin-requests-helpers';

vi.mock('@/lib/supabase', async () => {
  const h = await import('./checkin-requests-helpers');
  return { supabase: {}, supabaseAdmin: h.db.client };
});
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-helpers', () => ({ getStaffContext: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ enforceRateLimitStrict: vi.fn(async () => null), enforceRateLimitPermissive: vi.fn(async () => null) }));
vi.mock('@/lib/staff-pin', () => ({ verifyStaffPin: vi.fn() }));
vi.mock('@/app/api/events/[id]/checkin/route', () => ({ POST: vi.fn() }));

import { auth } from '@clerk/nextjs/server';
import { getStaffContext } from '@/lib/auth-helpers';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import { verifyStaffPin } from '@/lib/staff-pin';
import { POST as existingCheckIn } from '@/app/api/events/[id]/checkin/route';
import * as playerRoute from '@/app/api/events/[id]/checkin-request/route';
import * as staffRoute from '@/app/api/events/[id]/checkin-requests/route';
import * as unlockRoute from '@/app/api/events/[id]/checkin-requests/unlock/route';
import { issuePinGrant, extendPinGrant, readPinGrant, pinGrantScope, PIN_GRANT_COOKIE, PIN_GRANT_IDLE_MS, PIN_GRANT_MAX_MS } from '@/lib/pin-grant';
import {
  classifyCheckinResult, classifyEvidence, parseEvidence, checkinRequestsEnabledFor, staffMayManageEvent, staffMayReconcile,
  MAX_OPEN_PER_EVENT, MAX_APPROVE_BATCH, APPROVING_STALE_MS,
} from '../checkin-requests';

process.env.CHECKIN_TOKEN_SECRET = 'test-secret-for-pin-grants';

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockStaff = getStaffContext as unknown as ReturnType<typeof vi.fn>;
const mockCheckIn = existingCheckIn as unknown as ReturnType<typeof vi.fn>;
const mockRate = enforceRateLimitStrict as unknown as ReturnType<typeof vi.fn>;
const mockPin = verifyStaffPin as unknown as ReturnType<typeof vi.fn>;

const EV = '11111111-1111-4111-8111-111111111111';
const EV_OTHER = '22222222-2222-4222-8222-222222222222';
const EV_B = '44444444-4444-4444-8444-444444444444'; // an event at OTHER_STORE
const STORE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_STORE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const P = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const R = (n: number) => `99999999-0000-4000-8000-${String(n).padStart(12, '0')}`;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const staff = { appUserId: 'app-user-1', clerkUserId: 'clerk_staff', isNetworkAdmin: false, managedStoreIds: [] as string[], staffStoreIds: [STORE], allStoreIds: [STORE] };
const manager = { ...staff, appUserId: 'app-user-2', clerkUserId: 'clerk_mgr', managedStoreIds: [STORE], staffStoreIds: [], allStoreIds: [STORE] };

const grantFor = (appUserId = staff.appUserId, scope: string = STORE, now = Date.now()) => `${PIN_GRANT_COOKIE}=${issuePinGrant(appUserId, scope, now).value}`;
const call = (m: 'GET' | 'POST' | 'DELETE', id: string, body?: unknown, cookie?: string) =>
  new Request(`http://localhost/api/events/${id}/x`, {
    method: m,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
const ctx = (id = EV) => ({ params: { id } });
// cookie: omit = a valid grant for the default staff member; null = NO grant at all
const act = (body: unknown, cookie: string | null = grantFor(), id = EV) => staffRoute.POST(call('POST', id, body, cookie ?? undefined), ctx(id));
const list = (cookie: string | null = grantFor(), id = EV) => staffRoute.GET(call('GET', id, undefined, cookie ?? undefined), ctx(id));

function seed(opts: { eventStatus?: string; requests?: Row[] } = {}) {
  db.state.reset({
    events: [{ id: EV, status: opts.eventStatus ?? 'active', store_id: STORE }, { id: EV_OTHER, status: 'active', store_id: STORE }, { id: EV_B, status: 'active', store_id: OTHER_STORE }],
    players: [...[1, 2, 3, 4, 5].map(n => ({ id: P(n), player_id: `GGOB-PLAYER${n}`, display_name: `Player ${n}`, clerk_user_id: `clerk_${n}`, home_store_id: STORE })),
      { id: P(9), player_id: 'GGOB-STAFF', display_name: 'Staff', clerk_user_id: 'clerk_staff', home_store_id: STORE },
      { id: P(8), player_id: 'GGOB-MGR', display_name: 'Manager', clerk_user_id: 'clerk_mgr', home_store_id: STORE }],
    event_attendances: [], xp_ledger: [], prize_point_transactions: [],
    checkin_requests: opts.requests ?? [],
  });
}
const req = (n: number, over: Row = {}): Row => ({ id: R(n), event_id: EV, player_id: P(n), status: 'pending', attempts: 0, last_error: null, resolution: null, reopened_count: 0, requested_at: new Date(2026, 10, 10, 19, n).toISOString(), updated_at: new Date().toISOString(), ...over });
const rowOf = (n: number) => db.state.tables.checkin_requests.find(r => r.id === R(n))!;
const old = () => new Date(Date.now() - (APPROVING_STALE_MS + 60_000)).toISOString();
// what a successful check-in writes, piece by piece
const writeAttendance = (n: number) => db.state.tables.event_attendances.push({ id: db.state.uuid(), event_id: EV, player_id: P(n) });
const writeXp = (n: number) => db.state.tables.xp_ledger.push({ id: db.state.uuid(), event_id: EV, player_id: P(n), source: 'event_attendance' });
const writePoints = (n: number) => db.state.tables.prize_point_transactions.push({ id: db.state.uuid(), reference_id: EV, player_id: P(n), source: 'event_checkin', type: 'earn' });
const fullAward = (n: number) => { writeAttendance(n); writeXp(n); writePoints(n); };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CHECKIN_REQUESTS_STORES = `${STORE},${OTHER_STORE}`;
  mockStaff.mockResolvedValue(staff);
  mockRate.mockResolvedValue(null);
  mockAuth.mockResolvedValue({ userId: 'clerk_1' });
  mockCheckIn.mockReset(); mockCheckIn.mockImplementation(async () => json({ success: true }));
  mockPin.mockReset(); mockPin.mockResolvedValue({ ok: true });
  seed();
});

// ====================================================================================================================
describe('pure rules', () => {
  it('classifyCheckinResult: only success and the endpoint\'s own "already checked in" count as checked in', () => {
    expect(classifyCheckinResult(200, { success: true })).toEqual({ kind: 'approved', resolution: 'checked_in' });
    expect(classifyCheckinResult(400, { alreadyCheckedIn: true })).toEqual({ kind: 'approved', resolution: 'already_checked_in' });
    expect(classifyCheckinResult(200, { renewalOpportunity: true })).toEqual({ kind: 'renewal_required' });
    expect(classifyCheckinResult(500, { code: 'award_needs_review' }).kind).toBe('needs_review');
    expect(classifyCheckinResult(500, { error: 'Internal server error' }).kind).toBe('needs_review');
    expect(classifyCheckinResult(502, null).kind).toBe('needs_review');
    expect(classifyCheckinResult(200, { ok: true }).kind).toBe('needs_review');
    expect(classifyCheckinResult(400, { error: 'something new' }).kind).toBe('needs_review');
    expect(classifyCheckinResult(500, { code: 'award_failed' })).toEqual({ kind: 'failed', error: 'award_failed' });
    expect(classifyCheckinResult(403, {}).kind).toBe('failed');
    expect(classifyCheckinResult(400, { error: 'Event is not active' })).toEqual({ kind: 'not_active' });
  });
  it('award evidence: complete needs attendance AND XP AND Prize Points as expected; duplicates and fragments are partial', () => {
    const e = (a: number, x: number, p: number, exp = true) => classifyEvidence({ attendanceRows: a, xpRows: x, pointsRows: p, pointsExpected: exp });
    expect(e(1, 1, 1)).toBe('complete');
    expect(e(1, 1, 0, false)).toBe('complete');
    expect(e(0, 0, 0)).toBe('empty');
    expect(e(1, 0, 0)).toBe('partial');      // the lock only
    expect(e(1, 1, 0)).toBe('partial');      // points missing
    expect(e(1, 1, 1, false)).toBe('partial'); // points written where none are expected
    expect(e(0, 1, 0)).toBe('partial');      // orphaned XP
    expect(e(0, 0, 1)).toBe('partial');      // orphaned points
    expect(e(1, 2, 1)).toBe('partial');      // paid twice
    expect(e(2, 1, 1)).toBe('partial');
  });
  it('parseEvidence: unreadable answers are null (unknown), never success', () => {
    expect(parseEvidence(null)).toBeNull();
    expect(parseEvidence({})).toBeNull();
    expect(parseEvidence({ attendance_rows: 1, xp_rows: 1, points_rows: 1 })).toBeNull();
    expect(parseEvidence({ attendance_rows: '1', xp_rows: 1, points_rows: 1, points_expected: true })).toEqual({ attendanceRows: 1, xpRows: 1, pointsRows: 1, pointsExpected: true });
  });
  it('feature flag: off unless the store is listed; Benicia-only leaves other stores off', () => {
    delete process.env.CHECKIN_REQUESTS_STORES;
    expect(checkinRequestsEnabledFor(STORE)).toBe(false);          // variable unset
    expect(checkinRequestsEnabledFor(STORE, '')).toBe(false);
    expect(checkinRequestsEnabledFor(STORE, ` ${STORE.toUpperCase()} , x`)).toBe(true);
    expect(checkinRequestsEnabledFor(OTHER_STORE, STORE)).toBe(false);
    expect(checkinRequestsEnabledFor(OTHER_STORE, '*')).toBe(true);
    expect(checkinRequestsEnabledFor(null, STORE)).toBe(false);
    expect(checkinRequestsEnabledFor(null, `${STORE},network`)).toBe(true);
  });
  it('staff scope rules', () => {
    expect(staffMayManageEvent(staff as any, STORE)).toBe(true);
    expect(staffMayManageEvent(staff as any, OTHER_STORE)).toBe(false);
    expect(staffMayManageEvent({ ...staff, isNetworkAdmin: true } as any, OTHER_STORE)).toBe(true);
    expect(staffMayReconcile(staff as any, STORE)).toBe(false);          // plain store staff cannot reconcile
    expect(staffMayReconcile(manager as any, STORE)).toBe(true);
    expect(staffMayReconcile(manager as any, OTHER_STORE)).toBe(false);
    expect(staffMayReconcile({ ...staff, isNetworkAdmin: true } as any, OTHER_STORE)).toBe(true);
  });
});

// ====================================================================================================================
describe('PIN grant: short-lived, server-validated, bound to the staff member AND the store', () => {
  it('accepts a fresh grant for the same staff member and store only', () => {
    const { value } = issuePinGrant('u1', 'storeA');
    expect(readPinGrant(value, 'u1', 'storeA')).not.toBeNull();
    expect(readPinGrant(value, 'u2', 'storeA')).toBeNull();      // another account
    expect(readPinGrant(value, 'u1', 'storeB')).toBeNull();      // another store
    expect(readPinGrant(value, 'u1', 'network')).toBeNull();
  });
  it('scope is the event\'s store, or "network" for a store-less event', () => {
    expect(pinGrantScope(STORE)).toBe(STORE);
    expect(pinGrantScope(null)).toBe('network');
  });
  it('rejects tampering, junk, expiry and the hard cap', () => {
    const now = Date.now();
    const { value, grant } = issuePinGrant('u1', 'A', now);
    const [iat, exp, sig] = value.split('.');
    expect(readPinGrant(`${iat}.${Number(exp) + 600000}.${sig}`, 'u1', 'A', now)).toBeNull();   // stretched expiry
    expect(readPinGrant(`${iat}.${exp}.${sig.slice(0, -2)}xx`, 'u1', 'A', now)).toBeNull();
    expect(readPinGrant('garbage', 'u1', 'A', now)).toBeNull();
    expect(readPinGrant('', 'u1', 'A', now)).toBeNull();
    expect(readPinGrant(null, 'u1', 'A', now)).toBeNull();
    expect(readPinGrant(value, 'u1', 'A', grant.expiresAt + 1)).toBeNull();                     // idle window passed
    let g = grant; let t = now;
    for (let i = 0; i < 20; i++) { t += 4 * 60_000; g = extendPinGrant('u1', 'A', g, t).grant; expect(g.expiresAt).toBeLessThanOrEqual(grant.issuedAt + PIN_GRANT_MAX_MS); }
    const last = extendPinGrant('u1', 'A', g, t).value;
    expect(readPinGrant(last, 'u1', 'A', grant.issuedAt + PIN_GRANT_MAX_MS + 1)).toBeNull();    // hard cap
  });
  it('an extended grant keeps its scope: it cannot be moved to another store by extending', () => {
    const { grant } = issuePinGrant('u1', 'A');
    const ext = extendPinGrant('u1', 'A', grant);
    expect(readPinGrant(ext.value, 'u1', 'A')).not.toBeNull();
    expect(readPinGrant(ext.value, 'u1', 'B')).toBeNull();
  });
  it('sliding adds the idle window but never moves backwards', () => {
    const now = Date.now();
    const { grant } = issuePinGrant('u1', 'A', now);
    expect(extendPinGrant('u1', 'A', grant, now + 60_000).grant.expiresAt).toBe(now + 60_000 + PIN_GRANT_IDLE_MS);
  });
});

describe('unlock route: the server checks the PIN', () => {
  const post = (body: unknown, cookie?: string, id = EV) => unlockRoute.POST(call('POST', id, body, cookie), ctx(id));
  it('a wrong PIN sets no cookie; the lockout answer is passed through', async () => {
    mockPin.mockResolvedValueOnce({ ok: false, status: 401, error: 'Wrong PIN' });
    const bad = await post({ pin: '0000' });
    expect(bad.status).toBe(401);
    expect(bad.headers.get('set-cookie')).toBeNull();
    mockPin.mockResolvedValueOnce({ ok: false, status: 429, error: 'Too many tries', locked: true });
    expect((await post({ pin: '1111' })).status).toBe(429);
    mockPin.mockResolvedValueOnce({ ok: false, status: 409, error: 'No PIN set', needsSetup: true });
    const none = await post({ pin: '1111' });
    expect(none.status).toBe(409); expect((await none.json()).needsSetup).toBe(true);
  });
  it('the right PIN sets an HttpOnly, SameSite=Strict cookie scoped to /api/events and bound to this staff member', async () => {
    const res = await post({ pin: '1234' });
    expect(res.status).toBe(200);
    expect(mockPin).toHaveBeenCalledWith(staff.appUserId, '1234');
    const c = res.headers.get('set-cookie') ?? '';
    expect(c).toContain(`${PIN_GRANT_COOKIE}=`); expect(c.toLowerCase()).toContain('httponly'); expect(c.toLowerCase()).toContain('samesite=strict'); expect(c).toContain('Path=/api/events');
    const value = decodeURIComponent(c.split(';')[0].split('=').slice(1).join('='));
    expect(readPinGrant(value, staff.appUserId, STORE)).not.toBeNull();
    expect(readPinGrant(value, manager.appUserId, STORE)).toBeNull();
    expect(readPinGrant(value, staff.appUserId, OTHER_STORE)).toBeNull();
  });
  it('extend needs an existing valid grant, and never creates one from nothing', async () => {
    expect((await post({ extend: true })).status).toBe(403);
    expect(mockPin).not.toHaveBeenCalled();
    expect((await post({ extend: true }, `${PIN_GRANT_COOKIE}=forged.value.here`)).status).toBe(403);
    const ok = await post({ extend: true }, grantFor());
    expect(ok.status).toBe(200);
    expect(ok.headers.get('set-cookie')).toContain(PIN_GRANT_COOKIE);
  });
  it('DELETE clears the cookie', async () => {
    const res = await unlockRoute.DELETE(call('DELETE', EV, undefined, grantFor()), ctx());
    expect(res.headers.get('set-cookie') ?? '').toMatch(/Max-Age=0/i);
  });
  it('non-staff, other store and a switched-off store cannot unlock', async () => {
    mockStaff.mockResolvedValueOnce(null);
    expect((await post({ pin: '1234' })).status).toBe(403);
    mockStaff.mockResolvedValueOnce({ ...staff, allStoreIds: [OTHER_STORE] });
    expect((await post({ pin: '1234' })).status).toBe(403);
    process.env.CHECKIN_REQUESTS_STORES = OTHER_STORE;
    const off = await post({ pin: '1234' });
    expect(off.status).toBe(404); expect((await off.json()).code).toBe('feature_disabled');
    expect(mockPin).not.toHaveBeenCalled();
  });
});

// ====================================================================================================================
describe('authorization is enforced by the server on every staff operation, independent of the kiosk PIN screen', () => {
  const bodies = (id: string) => ({
    approve: { action: 'approve', request_ids: [id] }, dismiss: { action: 'dismiss', request_ids: [id] },
    reopen: { action: 'reopen', request_ids: [id] }, reconcile: { action: 'reconcile', request_ids: [id], resolution: 'recheck' },
  });
  it('approve / dismiss / reopen / reconcile without a PIN grant: 403 pin_required, nothing written, nothing called', async () => {
    seed({ requests: [req(1), req(2, { status: 'dismissed' }), req(3, { status: 'needs_review' })] });
    mockStaff.mockResolvedValue(manager);
    for (const [name, b] of Object.entries(bodies(R(1)))) {
      const res = await act(b, null);
      expect(res.status, name).toBe(403);
      expect((await res.json()).code, name).toBe('pin_required');
    }
    expect(db.state.writes).toEqual([]);
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
  it('a forged, expired, or another staff member\'s grant is the same as no grant', async () => {
    seed({ requests: [req(1)] });
    for (const cookie of [`${PIN_GRANT_COOKIE}=1.2.3`, grantFor(staff.appUserId, STORE, Date.now() - PIN_GRANT_IDLE_MS - 1000), grantFor('someone-else')]) {
      const res = await act({ action: 'approve', request_ids: [R(1)] }, cookie);
      expect(res.status).toBe(403); expect((await res.json()).code).toBe('pin_required');
    }
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(rowOf(1).status).toBe('pending');
  });
  it('the name list needs the grant too: without it the list returns counts only, never names or ids', async () => {
    seed({ requests: [req(1), req(2, { status: 'needs_review' })] });
    const out = await (await list(null)).json();
    expect(out.authorized).toBe(false);
    expect(out.requests).toEqual([]);
    expect(out.counts).toEqual({ waiting: 1, needsReview: 1, dismissed: 0 });
    expect(JSON.stringify(out)).not.toContain('Player 1');
    expect(JSON.stringify(out)).not.toContain('GGOB-PLAYER');
  });
  it('with a valid grant but no staff session / the wrong store / switched off: refused', async () => {
    seed({ requests: [req(1)] });
    mockStaff.mockResolvedValueOnce(null);
    expect((await act({ action: 'approve', request_ids: [R(1)] })).status).toBe(403);
    mockStaff.mockResolvedValueOnce({ ...staff, allStoreIds: [OTHER_STORE] });
    expect((await act({ action: 'approve', request_ids: [R(1)] })).status).toBe(403);
    mockStaff.mockResolvedValueOnce({ ...staff, allStoreIds: [OTHER_STORE] });
    expect((await list()).status).toBe(403);
    process.env.CHECKIN_REQUESTS_STORES = OTHER_STORE;
    const off = await act({ action: 'approve', request_ids: [R(1)] });
    expect(off.status).toBe(404); expect((await off.json()).code).toBe('feature_disabled');
    expect(await (await list()).json()).toEqual({ enabled: false });
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(rowOf(1).status).toBe('pending');
  });
  it('event ownership: a request id from another event is not found and never reaches the check-in handler', async () => {
    seed({ requests: [req(1, { event_id: EV_OTHER })] });
    const out = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(out.results[0].result).toBe('not_found');
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(rowOf(1).status).toBe('pending');
  });
  it('a successful action slides the grant; reading the list does not', async () => {
    seed({ requests: [req(1)] });
    const reading = await list();
    expect(reading.headers.get('set-cookie')).toBeNull();
    const acting = await act({ action: 'dismiss', request_ids: [R(1)] });
    expect(acting.headers.get('set-cookie') ?? '').toContain(PIN_GRANT_COOKIE);
  });
  it('bad input: unknown action, no ids, non-uuid ids, more than 10 ids', async () => {
    seed({ requests: [req(1)] });
    const bad = async (b: unknown) => (await act(b)).status;
    expect(await bad({ action: 'approve_all', request_ids: [R(1)] })).toBe(400);
    expect(await bad({ action: 'approve', request_ids: [] })).toBe(400);
    expect(await bad({ action: 'approve', request_ids: ['1; drop table'] })).toBe(400);
    expect(await bad({ action: 'approve' })).toBe(400);
    expect(await bad({ action: 'approve', request_ids: Array.from({ length: MAX_APPROVE_BATCH + 1 }, (_, i) => R(i + 1)) })).toBe(400);
    expect(MAX_APPROVE_BATCH).toBe(10);
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
});

describe('PIN grant scope: a PIN entered for one store cannot authorize another', () => {
  const admin = { ...staff, appUserId: 'app-admin', clerkUserId: 'clerk_admin', isNetworkAdmin: true, allStoreIds: [STORE, OTHER_STORE] };
  beforeEach(() => { mockStaff.mockResolvedValue(admin); });
  const reqB = (n: number, over: Row = {}) => req(n, { event_id: EV_B, ...over });

  it('a grant unlocked at store A is refused for actions on an event at store B, even for a network admin allowed at both', async () => {
    seed({ requests: [req(1), reqB(2)] });
    const grantA = grantFor('app-admin', STORE);
    expect((await act({ action: 'approve', request_ids: [R(1)] }, grantA)).status).toBe(200);
    const atB = await act({ action: 'approve', request_ids: [R(2)] }, grantA, EV_B);
    expect(atB.status).toBe(403); expect((await atB.json()).code).toBe('pin_required');
    expect(rowOf(2).status).toBe('pending');
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
  });
  it('and the other way round; each store needs its own PIN entry', async () => {
    seed({ requests: [req(1), reqB(2)] });
    const grantB = grantFor('app-admin', OTHER_STORE);
    expect((await act({ action: 'approve', request_ids: [R(2)] }, grantB, EV_B)).status).toBe(200);
    expect((await act({ action: 'approve', request_ids: [R(1)] }, grantB)).status).toBe(403);
    expect(rowOf(1).status).toBe('pending');
  });
  it('the name list stays hidden at store B with a store-A grant', async () => {
    seed({ requests: [reqB(2)] });
    const out = await (await list(grantFor('app-admin', STORE), EV_B)).json();
    expect(out.authorized).toBe(false); expect(out.requests).toEqual([]);
  });
  it('extend cannot carry a store-A grant over to store B', async () => {
    const res = await unlockRoute.POST(call('POST', EV_B, { extend: true }, grantFor('app-admin', STORE)), ctx(EV_B));
    expect(res.status).toBe(403);
  });
  it('unlocking at store B issues a grant that is valid at B and not at A', async () => {
    const res = await unlockRoute.POST(call('POST', EV_B, { pin: '1234' }), ctx(EV_B));
    expect(res.status).toBe(200);
    const value = decodeURIComponent((res.headers.get('set-cookie') ?? '').split(';')[0].split('=').slice(1).join('='));
    expect(readPinGrant(value, 'app-admin', OTHER_STORE)).not.toBeNull();
    expect(readPinGrant(value, 'app-admin', STORE)).toBeNull();
  });
  it('a grant never widens what the role tables allow: store staff with a valid grant for their store are still refused at another', async () => {
    mockStaff.mockResolvedValue(staff);   // staff of STORE only
    seed({ requests: [reqB(2)] });
    const res = await act({ action: 'approve', request_ids: [R(2)] }, grantFor(staff.appUserId, OTHER_STORE), EV_B);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBeUndefined();   // refused by store scope, not by the PIN rule
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
});

// ====================================================================================================================
describe('approve: only ticked players, through the existing check-in handler', () => {
  it('approves exactly the ticked requests, oldest first, one handler call each, with the stored player id and this event', async () => {
    seed({ requests: [req(1), req(2), req(3)] });
    const out = await (await act({ action: 'approve', request_ids: [R(2), R(1)] })).json();
    expect(out.results.map((r: any) => r.result)).toEqual(['checked_in', 'checked_in']);
    const bodies = await Promise.all(mockCheckIn.mock.calls.map(c => (c[0] as Request).json()));
    expect(bodies).toEqual([{ player_id: 'GGOB-PLAYER1' }, { player_id: 'GGOB-PLAYER2' }]);
    expect(mockCheckIn.mock.calls.every(c => c[1].params.id === EV)).toBe(true);
    expect(rowOf(1).status).toBe('approved'); expect(rowOf(1).resolution).toBe('checked_in'); expect(rowOf(1).decided_by).toBe(P(9));
    expect(rowOf(3).status).toBe('pending');
  });
  it('the body cannot name a player or event: only stored request ids', async () => {
    seed({ requests: [req(1), req(2)] });
    await act({ action: 'approve', request_ids: [R(1)], player_id: 'GGOB-PLAYER2', event_id: EV_OTHER, all: true });
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
    expect(await (mockCheckIn.mock.calls[0][0] as Request).json()).toEqual({ player_id: 'GGOB-PLAYER1' });
    expect(rowOf(2).status).toBe('pending');
  });
  it('RACE A: a list refresh while an approval is running does not settle it; the approval records its own outcome', async () => {
    seed({ requests: [req(1)] });
    let duringStatus = ''; let duringList: any = null;
    mockCheckIn.mockImplementationOnce(async () => {
      writeAttendance(1);                         // the check-in has taken its lock; XP and points are not written yet
      duringList = await (await list()).json();   // another kiosk / the open panel polls right now
      duringStatus = rowOf(1).status;
      writeXp(1); writePoints(1);
      return json({ success: true });
    });
    const out = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(duringStatus).toBe('approving');                         // untouched by the refresh
    expect(duringList.requests.map((r: any) => r.status)).toEqual(['approving']);
    expect(out.results[0].result).toBe('checked_in');
    expect(rowOf(1).status).toBe('approved'); expect(rowOf(1).resolution).toBe('checked_in'); expect(rowOf(1).decided_by).toBe(P(9)); // not mislabelled
  });
  it('RACE A (failure): attendance written, then the award rolls back: never shows approved', async () => {
    seed({ requests: [req(1)] });
    mockCheckIn.mockImplementationOnce(async () => {
      writeAttendance(1);
      await list();                                // refresh in the middle
      db.state.tables.event_attendances.length = 0; // rolled back
      return json({ code: 'award_failed', error: 'x' }, 500);
    });
    const out = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(out.results[0].result).toBe('failed');
    expect(rowOf(1).status).toBe('pending'); expect(rowOf(1).last_error).toBe('award_failed');
  });
  it('marked approved only after a confirmed success; authoritative "already checked in" is approved/already_checked_in', async () => {
    seed({ requests: [req(1), req(2)] });
    let during = '';
    mockCheckIn.mockImplementationOnce(async () => { during = rowOf(1).status; return json({ success: true }); });
    mockCheckIn.mockImplementationOnce(async () => json({ error: 'Already checked in', alreadyCheckedIn: true }, 400));
    const out = await (await act({ action: 'approve', request_ids: [R(1), R(2)] })).json();
    expect(during).toBe('approving');
    expect(out.results.map((r: any) => r.result)).toEqual(['checked_in', 'already_checked_in']);
    expect(rowOf(2).resolution).toBe('already_checked_in');
  });
  it('ambiguous failures become needs_review and are NEVER retried', async () => {
    seed({ requests: [req(1), req(2), req(3), req(4)] });
    mockCheckIn
      .mockImplementationOnce(async () => json({ code: 'award_needs_review', error: 'x' }, 500))
      .mockImplementationOnce(async () => { throw new Error('socket hang up'); })
      .mockImplementationOnce(async () => json({ error: 'Internal server error' }, 500))
      .mockImplementationOnce(async () => new Response('<html>bad gateway</html>', { status: 502 }));
    const out = await (await act({ action: 'approve', request_ids: [R(1), R(2), R(3), R(4)] })).json();
    expect(out.results.map((r: any) => r.result)).toEqual(['needs_review', 'needs_review', 'needs_review', 'needs_review']);
    expect(mockCheckIn).toHaveBeenCalledTimes(4);
    const again = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(again.results[0].result).toBe('skipped');
    expect(mockCheckIn).toHaveBeenCalledTimes(4);
  });
  it('clean refusals / rolled-back failures stay pending with the reason; renewal stays pending flagged', async () => {
    seed({ requests: [req(1), req(2), req(3)] });
    mockCheckIn
      .mockImplementationOnce(async () => json({ code: 'award_failed' }, 500))
      .mockImplementationOnce(async () => json({ renewalOpportunity: true }))
      .mockImplementationOnce(async () => json({ error: 'Staff access required for kiosk check-in at this store' }, 403));
    const out = await (await act({ action: 'approve', request_ids: [R(1), R(2), R(3)] })).json();
    expect(out.results.map((r: any) => r.result)).toEqual(['failed', 'renewal_required', 'failed']);
    expect([1, 2, 3].map(n => rowOf(n).status)).toEqual(['pending', 'pending', 'pending']);
    expect(rowOf(2).last_error).toBe('renewal_required');
  });
  it('only pending requests are approvable; others are skipped without calling the handler', async () => {
    const statuses = ['approving', 'approved', 'dismissed', 'expired', 'needs_review'];
    seed({ requests: statuses.map((s, i) => req(i + 1, { status: s })) });
    const out = await (await act({ action: 'approve', request_ids: statuses.map((_, i) => R(i + 1)) })).json();
    expect(out.results.every((r: any) => r.result === 'skipped')).toBe(true);
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(statuses.map((_, i) => rowOf(i + 1).status)).toEqual(statuses);
  });
  it('two staff approving the same request: one claim wins, one handler call', async () => {
    seed({ requests: [req(1)] });
    const [a, b] = await Promise.all([act({ action: 'approve', request_ids: [R(1)] }), act({ action: 'approve', request_ids: [R(1)] })]);
    const ra = (await a.json()).results[0].result, rb = (await b.json()).results[0].result;
    expect([ra, rb].sort()).toEqual(['checked_in', 'skipped']);
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
  });
  it('if the outcome cannot be recorded (the row moved), it is reported, not hidden', async () => {
    seed({ requests: [req(1)] });
    mockCheckIn.mockImplementationOnce(async () => { rowOf(1).status = 'needs_review'; return json({ success: true }); });
    const out = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(out.results[0].error).toBe('not_recorded');
    expect(rowOf(1).status).toBe('needs_review'); // not overwritten
  });
  it('a completed event refuses approval (409), expires its pending requests, calls nothing', async () => {
    seed({ eventStatus: 'completed', requests: [req(1)] });
    const res = await act({ action: 'approve', request_ids: [R(1)] });
    expect(res.status).toBe(409);
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(rowOf(1).status).toBe('expired');
  });
  it('exactly 10 ids is accepted', async () => {
    seed({ requests: Array.from({ length: 10 }, (_, i) => req(i + 1, { player_id: P(1) })).map((r, i) => ({ ...r, player_id: P((i % 5) + 1), event_id: EV, id: R(i + 1) })).slice(0, 5) });
    const res = await act({ action: 'approve', request_ids: [R(1), R(2), R(3), R(4), R(5), R(6), R(7), R(8), R(9), R(10)] });
    expect(res.status).toBe(200);
  });
});

// ====================================================================================================================
describe('stale claims: decided from the complete award records, never assumed', () => {
  const settle = async () => (await list()).json();
  it('a fresh approving request is left alone even if its award already looks complete', async () => {
    seed({ requests: [req(1, { status: 'approving' })] });
    fullAward(1);
    const out = await settle();
    expect(rowOf(1).status).toBe('approving');
    expect(out.requests.map((r: any) => r.status)).toEqual(['approving']);
  });
  it('stale + complete award (attendance + XP + points) -> approved (recovered_complete)', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    fullAward(1);
    await settle();
    expect(rowOf(1).status).toBe('approved'); expect(rowOf(1).resolution).toBe('recovered_complete');
  });
  it('stale + attendance only (XP and points missing) -> needs_review, NOT approved', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    writeAttendance(1);
    await settle();
    expect(rowOf(1).status).toBe('needs_review'); expect(rowOf(1).last_error).toBe('approval_interrupted_partial');
  });
  it('stale + attendance and XP but no points -> needs_review', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    writeAttendance(1); writeXp(1);
    await settle();
    expect(rowOf(1).status).toBe('needs_review');
  });
  it('stale + XP paid twice -> needs_review', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    fullAward(1); writeXp(1);
    await settle();
    expect(rowOf(1).status).toBe('needs_review');
  });
  it('stale + nothing written -> needs_review, NOT pending: the original call may still be running, so nothing is released or retried', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    await settle();
    expect(rowOf(1).status).toBe('needs_review'); expect(rowOf(1).last_error).toBe('approval_interrupted_no_evidence');
    expect(mockCheckIn).not.toHaveBeenCalled();
    // staff cannot approve it again; only a manager can release it from the records
    const again = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(again.results[0].result).toBe('skipped');
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
  it('a late original call that finishes AFTER the stale flip is recognised by a manager re-check (complete -> confirmable), never paid twice', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    await settle();                       // -> needs_review (nothing written yet)
    fullAward(1);                         // the original call finally completes
    mockStaff.mockResolvedValue(manager);
    const cookie = grantFor(manager.appUserId);
    expect((await (await act({ action: 'reconcile', request_ids: [R(1)], resolution: 'recheck' }, cookie)).json()).evidence.verdict).toBe('complete');
    expect((await act({ action: 'reconcile', request_ids: [R(1)], resolution: 'confirm_complete' }, cookie)).status).toBe(200);
    expect(rowOf(1).status).toBe('approved');
    expect(db.state.tables.xp_ledger.filter(x => x.player_id === P(1))).toHaveLength(1);
  });
  it('stale + the award records cannot be read -> unchanged (a later look decides)', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() })] });
    fullAward(1);
    db.state.evidenceError = true;
    await settle();
    expect(rowOf(1).status).toBe('approving');
  });
  it('pending whose player is already fully checked in elsewhere (NFC) -> approved/already_checked_in', async () => {
    seed({ requests: [req(1), req(2)] });
    fullAward(1);
    const out = await settle();
    expect(rowOf(1).status).toBe('approved'); expect(rowOf(1).resolution).toBe('already_checked_in');
    expect(out.requests.map((r: any) => r.playerName)).toEqual(['Player 2']);
  });
  it('pending with only an attendance row (a check-in still being written, or about to roll back) is NOT settled', async () => {
    seed({ requests: [req(1)] });
    writeAttendance(1);
    const out = await settle();
    expect(rowOf(1).status).toBe('pending');
    expect(out.requests).toHaveLength(1);
  });
  it('the list never calls the check-in handler (no automatic retry of anything)', async () => {
    seed({ requests: [req(1, { status: 'approving', updated_at: old() }), req(2, { status: 'needs_review' }), req(3)] });
    await settle();
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
});

// ====================================================================================================================
describe('reopen: dismissed or expired requests, with no way to duplicate an attendance or an award', () => {
  it('staff reopen a dismissed request while the event is active: pending, audit count up, handler not called', async () => {
    seed({ requests: [req(1, { status: 'dismissed' })] });
    const out = await (await act({ action: 'reopen', request_ids: [R(1)] })).json();
    expect(out.results[0].result).toBe('reopened');
    expect(rowOf(1).status).toBe('pending'); expect(rowOf(1).reopened_count).toBe(1); expect(rowOf(1).decided_by).toBe(P(9));
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(db.state.writes.every(w => w === 'checkin_requests:update' || w === 'rpc:expire')).toBe(true);
  });
  it('then approve works once; a second approve is skipped (one handler call)', async () => {
    seed({ requests: [req(1, { status: 'dismissed' })] });
    await act({ action: 'reopen', request_ids: [R(1)] });
    await act({ action: 'approve', request_ids: [R(1)] });
    const again = await (await act({ action: 'approve', request_ids: [R(1)] })).json();
    expect(again.results[0].result).toBe('skipped');
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
  });
  it('reopening twice at once: only one wins', async () => {
    seed({ requests: [req(1, { status: 'dismissed' })] });
    const [a, b] = await Promise.all([act({ action: 'reopen', request_ids: [R(1)] }), act({ action: 'reopen', request_ids: [R(1)] })]);
    const rs = [(await a.json()).results[0].result, (await b.json()).results[0].result].sort();
    expect(rs).toEqual(['reopened', 'skipped']);
    expect(rowOf(1).reopened_count).toBe(1);
  });
  it('if the player is already fully checked in, reopening settles it instead (no second award is possible)', async () => {
    seed({ requests: [req(1, { status: 'dismissed' })] });
    fullAward(1);
    const out = await (await act({ action: 'reopen', request_ids: [R(1)] })).json();
    expect(out.results[0].result).toBe('already_checked_in');
    expect(rowOf(1).status).toBe('approved');
  });
  it('if only part of an award exists, reopening sends it to needs_review, never to pending', async () => {
    seed({ requests: [req(1, { status: 'dismissed' }), req(2, { status: 'expired' })] });
    writeAttendance(1); writeXp(2);
    const out = await (await act({ action: 'reopen', request_ids: [R(1), R(2)] })).json();
    expect(out.results.map((r: any) => r.result)).toEqual(['needs_review', 'needs_review']);
    expect(rowOf(1).last_error).toBe('reopen_found_partial_award');
  });
  it('unreadable award records: nothing changes', async () => {
    seed({ requests: [req(1, { status: 'dismissed' })] });
    db.state.evidenceError = true;
    const out = await (await act({ action: 'reopen', request_ids: [R(1)] })).json();
    expect(out.results[0].result).toBe('skipped'); expect(out.results[0].error).toBe('unavailable');
    expect(rowOf(1).status).toBe('dismissed');
  });
  it('only dismissed/expired can be reopened: pending, approving, approved and needs_review cannot (no bypass of reconciliation)', async () => {
    const statuses = ['pending', 'approving', 'approved', 'needs_review'];
    seed({ requests: statuses.map((s, i) => req(i + 1, { status: s })) });
    const out = await (await act({ action: 'reopen', request_ids: statuses.map((_, i) => R(i + 1)) })).json();
    expect(out.results.every((r: any) => r.result === 'skipped' && r.error === 'not_reopenable')).toBe(true);
    expect(statuses.map((_, i) => rowOf(i + 1).status)).toEqual(statuses);
  });
  it('not while the event is over', async () => {
    seed({ eventStatus: 'completed', requests: [req(1, { status: 'dismissed' })] });
    expect((await act({ action: 'reopen', request_ids: [R(1)] })).status).toBe(409);
    expect(rowOf(1).status).toBe('dismissed');
  });
  it('player: an expired request can be asked for again once the event is running (empty records -> pending)', async () => {
    seed({ requests: [req(1, { status: 'expired', resolution: 'event_ended' })] });
    const res = await playerRoute.POST(call('POST', EV), ctx());
    expect(await res.json()).toEqual({ status: 'pending' });
    expect(rowOf(1).reopened_count).toBe(1);
    expect(db.state.tables.checkin_requests).toHaveLength(1);
  });
  it('player: an expired request whose award is complete reports checked in; partial goes to review', async () => {
    seed({ requests: [req(1, { status: 'expired' })] });
    fullAward(1);
    expect(await (await playerRoute.POST(call('POST', EV), ctx())).json()).toEqual({ status: 'checked_in' });
    seed({ requests: [req(1, { status: 'expired' })] });
    writeAttendance(1);
    expect(await (await playerRoute.POST(call('POST', EV), ctx())).json()).toEqual({ status: 'needs_review' });
  });
  it('player: a dismissed request cannot be spammed back; only staff reopen it', async () => {
    seed({ requests: [req(1, { status: 'dismissed' })] });
    const res = await playerRoute.POST(call('POST', EV), ctx());
    expect((await res.json()).status).toBe('dismissed');
    expect(db.state.writes).toEqual([]);
  });
  it('dismiss still moves only pending requests and never calls the handler', async () => {
    seed({ requests: [req(1), req(2, { status: 'needs_review' })] });
    const out = await (await act({ action: 'dismiss', request_ids: [R(1), R(2)] })).json();
    expect(out.results.map((r: any) => r.result)).toEqual(['dismissed', 'skipped']);
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
});

// ====================================================================================================================
describe('manager reconciliation of needs_review', () => {
  const recon = (n: number, resolution: string, cookie = grantFor(manager.appUserId)) => act({ action: 'reconcile', request_ids: [R(n)], resolution }, cookie);
  beforeEach(() => { mockStaff.mockResolvedValue(manager); });

  it('plain store staff cannot reconcile; a manager can', async () => {
    seed({ requests: [req(1, { status: 'needs_review' })] });
    fullAward(1);
    mockStaff.mockResolvedValueOnce(staff);
    const denied = await recon(1, 'confirm_complete', grantFor(staff.appUserId));
    expect(denied.status).toBe(403); expect((await denied.json()).code).toBe('manager_required');
    expect(rowOf(1).status).toBe('needs_review');
    expect((await recon(1, 'confirm_complete')).status).toBe(200);
  });
  it('confirm_complete needs a COMPLETE award in the records (not the browser\'s say-so): approved, reconciled_complete, reviewer recorded', async () => {
    seed({ requests: [req(1, { status: 'needs_review' })] });
    fullAward(1);
    const out = await (await recon(1, 'confirm_complete')).json();
    expect(out.results[0].result).toBe('confirmed_complete');
    expect(rowOf(1).status).toBe('approved'); expect(rowOf(1).resolution).toBe('reconciled_complete'); expect(rowOf(1).reviewed_by).toBe(P(8));
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
  it('confirm_complete is refused for partial or empty records', async () => {
    seed({ requests: [req(1, { status: 'needs_review' }), req(2, { status: 'needs_review' })] });
    writeAttendance(1);
    const partial = await recon(1, 'confirm_complete'); expect(partial.status).toBe(409); expect((await partial.json()).code).toBe('not_complete');
    const empty = await recon(2, 'confirm_complete'); expect(empty.status).toBe(409);
    expect(rowOf(1).status).toBe('needs_review'); expect(rowOf(2).status).toBe('needs_review');
  });
  it('release (not checked in) needs EMPTY records: back to pending, reviewer recorded, handler not called', async () => {
    seed({ requests: [req(1, { status: 'needs_review' })] });
    const out = await (await recon(1, 'release')).json();
    expect(out.results[0].result).toBe('released');
    expect(rowOf(1).status).toBe('pending'); expect(rowOf(1).resolution).toBe('reconciled_released'); expect(rowOf(1).reviewed_by).toBe(P(8)); expect(rowOf(1).last_error).toBeNull();
    expect(mockCheckIn).not.toHaveBeenCalled();
  });
  it('release is refused for partial or complete records, so an ambiguous award can never be retried by it', async () => {
    seed({ requests: [req(1, { status: 'needs_review' }), req(2, { status: 'needs_review' }), req(3, { status: 'needs_review' })] });
    writeAttendance(1);          // partial
    fullAward(2);                // complete
    writeXp(3);                  // orphaned XP
    for (const n of [1, 2, 3]) { const r = await recon(n, 'release'); expect(r.status).toBe(409); expect((await r.json()).code).toBe('not_empty'); expect(rowOf(n).status).toBe('needs_review'); }
  });
  it('release after the event ended expires the request instead of putting it back', async () => {
    seed({ eventStatus: 'completed', requests: [req(1, { status: 'needs_review' })] });
    const out = await (await recon(1, 'release')).json();
    expect(out.results[0].result).toBe('expired'); expect(rowOf(1).status).toBe('expired');
  });
  it('re-check reads the records and changes nothing; unreadable records change nothing', async () => {
    seed({ requests: [req(1, { status: 'needs_review' })] });
    writeAttendance(1);
    const out = await (await recon(1, 'recheck')).json();
    expect(out.evidence.verdict).toBe('partial');
    expect(rowOf(1).status).toBe('needs_review');
    db.state.evidenceError = true;
    const res = await recon(1, 'release');
    expect(res.status).toBe(503);
    expect(rowOf(1).status).toBe('needs_review');
  });
  it('only needs_review requests can be reconciled, one at a time, and an unknown resolution is rejected', async () => {
    seed({ requests: [req(1), req(2, { status: 'needs_review' })] });
    const skipped = await (await recon(1, 'release')).json();
    expect(skipped.results[0].result).toBe('skipped');
    expect((await act({ action: 'reconcile', request_ids: [R(1), R(2)], resolution: 'release' }, grantFor(manager.appUserId))).status).toBe(400);
    expect((await recon(2, 'force_approve')).status).toBe(400);
    expect(rowOf(2).status).toBe('needs_review');
  });
  it('the list shows the evidence to a manager only', async () => {
    seed({ requests: [req(1, { status: 'needs_review' })] });
    writeAttendance(1);
    const asManager = await (await list(grantFor(manager.appUserId))).json();
    expect(asManager.canReconcile).toBe(true);
    expect(asManager.requests[0].evidence).toEqual({ attendanceRows: 1, xpRows: 0, pointsRows: 0, pointsExpected: true, verdict: 'partial' });
    mockStaff.mockResolvedValue(staff);
    const asStaff = await (await list(grantFor(staff.appUserId))).json();
    expect(asStaff.canReconcile).toBe(false);
    expect(asStaff.requests[0].evidence).toBeUndefined();
  });
  it('after a manager repairs a partial award by hand, a re-check offers the matching action', async () => {
    seed({ requests: [req(1, { status: 'needs_review' })] });
    writeAttendance(1);
    expect((await (await recon(1, 'recheck')).json()).evidence.verdict).toBe('partial');
    writeXp(1); writePoints(1);   // the manager's SQL repair
    expect((await (await recon(1, 'recheck')).json()).evidence.verdict).toBe('complete');
    expect((await recon(1, 'confirm_complete')).status).toBe(200);
    expect(rowOf(1).status).toBe('approved');
  });
});

// ====================================================================================================================
describe('player request route: creates a pending request and NOTHING else', () => {
  it('writes only to checkin_requests (no attendance, XP, points, home store, titles)', async () => {
    const res = await playerRoute.POST(call('POST', EV), ctx());
    expect(await res.json()).toEqual({ status: 'pending' });
    expect(db.state.writes).toEqual(['checkin_requests:insert']);
    expect(mockCheckIn).not.toHaveBeenCalled();
    expect(db.state.tables.event_attendances).toHaveLength(0);
  });
  it('is idempotent and survives losing an insert race', async () => {
    await playerRoute.POST(call('POST', EV), ctx());
    expect(await (await playerRoute.POST(call('POST', EV), ctx())).json()).toEqual({ status: 'pending' });
    expect(db.state.tables.checkin_requests).toHaveLength(1);
    seed({ requests: [req(1)] });
    db.state.hideExistingOnce = true;
    const res = await playerRoute.POST(call('POST', EV), ctx());
    expect(res.status).toBe(200);
    expect(db.state.tables.checkin_requests).toHaveLength(1);
  });
  it('refuses completed, scheduled and cancelled events', async () => {
    for (const status of ['completed', 'scheduled', 'cancelled']) {
      seed({ eventStatus: status });
      const res = await playerRoute.POST(call('POST', EV), ctx());
      expect(res.status).toBe(409); expect((await res.json()).code).toBe('event_not_active');
      expect(db.state.writes).toEqual([]);
    }
  });
  it('FEATURE FLAG: off for the store -> 404 feature_disabled, nothing written; GET says disabled', async () => {
    process.env.CHECKIN_REQUESTS_STORES = OTHER_STORE;
    const res = await playerRoute.POST(call('POST', EV), ctx());
    expect(res.status).toBe(404); expect((await res.json()).code).toBe('feature_disabled');
    expect(await (await playerRoute.GET(call('GET', EV), ctx())).json()).toEqual({ status: 'disabled' });
    delete process.env.CHECKIN_REQUESTS_STORES;
    expect((await playerRoute.POST(call('POST', EV), ctx())).status).toBe(404);
    expect(db.state.writes).toEqual([]);
  });
  it('auth, unknown event, malformed id, rate limit', async () => {
    expect((await playerRoute.POST(call('POST', 'nope'), ctx('nope'))).status).toBe(404);
    expect((await playerRoute.POST(call('POST', '33333333-3333-4333-8333-333333333333'), ctx('33333333-3333-4333-8333-333333333333'))).status).toBe(404);
    mockAuth.mockResolvedValueOnce({ userId: null });
    expect((await playerRoute.POST(call('POST', EV), ctx())).status).toBe(401);
    mockAuth.mockResolvedValueOnce({ userId: 'clerk_unknown' });
    expect((await playerRoute.POST(call('POST', EV), ctx())).status).toBe(404);
    mockRate.mockResolvedValueOnce(new Response('{}', { status: 429 }));
    expect((await playerRoute.POST(call('POST', EV), ctx())).status).toBe(429);
    expect(db.state.writes).toEqual([]);
  });
  it('a fully checked-in player gets "checked_in" and no row; a half-written check-in does NOT count as done', async () => {
    fullAward(1);
    expect(await (await playerRoute.POST(call('POST', EV), ctx())).json()).toEqual({ status: 'checked_in' });
    expect(db.state.writes).toEqual([]);
    seed(); writeAttendance(1);
    expect(await (await playerRoute.POST(call('POST', EV), ctx())).json()).toEqual({ status: 'pending' });
  });
  it('caps open requests per event', async () => {
    seed({ requests: Array.from({ length: MAX_OPEN_PER_EVENT }, (_, i) => req(1000 + i, { player_id: P(2000 + i) })) });
    expect((await playerRoute.POST(call('POST', EV), ctx())).status).toBe(503);
    expect(db.state.writes).toEqual([]);
  });
  it('GET reports my own status; "checked_in" only for a complete award', async () => {
    seed({ requests: [req(1)] });
    expect(await (await playerRoute.GET(call('GET', EV), ctx())).json()).toEqual({ status: 'pending' });
    writeAttendance(1);
    expect(await (await playerRoute.GET(call('GET', EV), ctx())).json()).toEqual({ status: 'pending' });
    writeXp(1); writePoints(1);
    expect(await (await playerRoute.GET(call('GET', EV), ctx())).json()).toEqual({ status: 'checked_in' });
    seed();
    expect(await (await playerRoute.GET(call('GET', EV), ctx())).json()).toEqual({ status: 'none' });
  });
});

// ====================================================================================================================
describe('staff list', () => {
  it('shows name, Player Pass ID, time and status to an unlocked staff member, including dismissed requests', async () => {
    seed({ requests: [req(1), req(2, { status: 'dismissed' }), req(3, { status: 'needs_review', last_error: 'award_needs_review' })] });
    const out = await (await list()).json();
    expect(out.requests.map((r: any) => [r.playerName, r.playerId, r.status])).toEqual([
      ['Player 1', 'GGOB-PLAYER1', 'pending'], ['Player 2', 'GGOB-PLAYER2', 'dismissed'], ['Player 3', 'GGOB-PLAYER3', 'needs_review'],
    ]);
    expect(out.requests[0].requestedAt).toBeTruthy();
    expect(out.counts).toEqual({ waiting: 1, needsReview: 1, dismissed: 1 });
  });
  it('when the event has ended its pending requests expire, history is kept, needs_review stays visible', async () => {
    seed({ eventStatus: 'completed', requests: [req(1), req(2, { status: 'needs_review' }), req(3, { status: 'approved' })] });
    const out = await (await list()).json();
    expect(rowOf(1).status).toBe('expired'); expect(rowOf(3).status).toBe('approved');
    expect(db.state.tables.checkin_requests).toHaveLength(3);
    expect(out.requests.map((r: any) => r.status)).toEqual(['needs_review']);
  });
});
