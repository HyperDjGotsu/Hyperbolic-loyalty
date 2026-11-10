import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

// Short-lived, server-validated "this staff member just entered their PIN" grant for the pending check-in request actions.
// The kiosk's PIN lock on its own is only a screen: this makes the SERVER refuse approve / dismiss / reopen / reconcile (and the name list)
// without a current grant. Stateless: an HMAC over (staff member, issued, expires) with a server secret, kept in an HttpOnly cookie.
//   - Bound to the signed-in staff member (app_users id) AND to one store (the event's store, or "network"): a cookie from another account,
//     another store, or a forged one is rejected. It is only an extra "PIN recently entered here" proof: the staff session, the role tables
//     (store scope), the feature flag and the manager rule are still checked on every request, so a grant can never authorize anything
//     the staff member could not already do.
//   - Idle window 5 minutes, slides forward on each privileged action or on-screen touch, hard cap 30 minutes from the PIN entry.
//   - Scope is only the pending-request routes (cookie path /api/events). The PIN itself is checked by the existing verifyStaffPin
//     (same lockout as the kiosk exit). This is an interim guard and does not depend on any future employee-identity design.

export const PIN_GRANT_COOKIE = 'pp_req_auth';
export const PIN_GRANT_IDLE_MS = 5 * 60_000;
export const PIN_GRANT_MAX_MS = 30 * 60_000;

function secret(): string {
  const s = process.env.CHECKIN_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret available for PIN grants');
  return s;
}

/** The store a grant is for: the event's store, or "network" for an event with no store. */
export function pinGrantScope(eventStoreId: string | null): string {
  return eventStoreId ?? 'network';
}

function sign(appUserId: string, scope: string, issuedAt: number, expiresAt: number): string {
  return createHmac('sha256', secret()).update(`pin-grant:v2:${appUserId}:${scope}:${issuedAt}:${expiresAt}`).digest('base64url');
}

export type PinGrant = { issuedAt: number; expiresAt: number };

/** A new grant starting now (the PIN was just verified). */
export function issuePinGrant(appUserId: string, scope: string, now = Date.now()): { value: string; grant: PinGrant } {
  const grant = { issuedAt: now, expiresAt: now + PIN_GRANT_IDLE_MS };
  return { value: `${grant.issuedAt}.${grant.expiresAt}.${sign(appUserId, scope, grant.issuedAt, grant.expiresAt)}`, grant };
}

/** Check a cookie value for this staff member AND store. Returns the grant if it is genuine, unexpired and inside the hard cap. */
export function readPinGrant(value: string | null | undefined, appUserId: string, scope: string, now = Date.now()): PinGrant | null {
  if (!value) return null;
  const [iatS, expS, sig] = value.split('.');
  if (!iatS || !expS || !sig || !/^\d{10,16}$/.test(iatS) || !/^\d{10,16}$/.test(expS)) return null;
  const issuedAt = Number(iatS), expiresAt = Number(expS);
  const want = Buffer.from(sign(appUserId, scope, issuedAt, expiresAt));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (now >= expiresAt || now < issuedAt - 5_000) return null;
  if (now >= issuedAt + PIN_GRANT_MAX_MS) return null;
  return { issuedAt, expiresAt };
}

/** Slide an existing grant forward (never past the hard cap). Returns a new cookie value. */
export function extendPinGrant(appUserId: string, scope: string, grant: PinGrant, now = Date.now()): { value: string; grant: PinGrant } {
  const expiresAt = Math.min(now + PIN_GRANT_IDLE_MS, grant.issuedAt + PIN_GRANT_MAX_MS);
  const next = { issuedAt: grant.issuedAt, expiresAt };
  return { value: `${next.issuedAt}.${next.expiresAt}.${sign(appUserId, scope, next.issuedAt, next.expiresAt)}`, grant: next };
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function pinCookieOptions(grant: PinGrant, now = Date.now()) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/events',
    maxAge: Math.max(1, Math.floor((grant.expiresAt - now) / 1000)),
  };
}
