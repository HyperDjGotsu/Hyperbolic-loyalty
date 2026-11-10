import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStaffContext, type StaffContext } from '@/lib/auth-helpers';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import { verifyStaffPin } from '@/lib/staff-pin';
import { checkinRequestsEnabledFor, staffMayManageEvent } from '@/lib/checkin-requests';
import { PIN_GRANT_COOKIE, extendPinGrant, issuePinGrant, pinCookieOptions, pinGrantScope, readCookie, readPinGrant } from '@/lib/pin-grant';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side PIN unlock for the pending-request screen.
//   POST { pin }       verify the signed-in staff member's PIN (the same check and lockout as the kiosk exit) and set a short-lived grant cookie.
//   POST { extend }    slide a still-valid grant forward (called when staff touch the screen). Needs the cookie; never accepts a PIN-less new grant.
//   DELETE             lock now.
// The grant is only honoured by the pending-request routes, and only for the same signed-in staff member.
async function gate(eventId: string): Promise<{ res: NextResponse } | { staff: StaffContext; event: { id: string; store_id: string | null } }> {
  if (!UUID_RE.test(eventId)) return { res: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  const staff = await getStaffContext();
  if (!staff) return { res: NextResponse.json({ error: 'Staff access required' }, { status: 403 }) };
  const { data: event } = await supabaseAdmin.from('events').select('id, store_id').eq('id', eventId).maybeSingle();
  if (!event) return { res: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  if (!staffMayManageEvent(staff, event.store_id)) return { res: NextResponse.json({ error: 'Staff access required for this store' }, { status: 403 }) };
  if (!checkinRequestsEnabledFor(event.store_id)) return { res: NextResponse.json({ error: 'Not available', code: 'feature_disabled' }, { status: 404 }) };
  return { staff, event };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const g = await gate(params.id);
    if ('res' in g) return g.res;
    const limited = await enforceRateLimitStrict(`checkin-unlock:${g.staff.clerkUserId}`, 60, 20);
    if (limited) return limited;

    let body: { pin?: unknown; extend?: unknown } = {};
    try { body = await request.json(); } catch { /* empty body */ }

    if (body.extend === true) {
      const scope = pinGrantScope(g.event.store_id);
      const grant = readPinGrant(readCookie(request, PIN_GRANT_COOKIE), g.staff.appUserId, scope);
      if (!grant) return NextResponse.json({ error: 'Enter your PIN', code: 'pin_required' }, { status: 403 });
      const next = extendPinGrant(g.staff.appUserId, scope, grant);
      const res = NextResponse.json({ ok: true, expiresAt: next.grant.expiresAt });
      res.cookies.set(PIN_GRANT_COOKIE, next.value, pinCookieOptions(next.grant));
      return res;
    }

    const pin = typeof body.pin === 'string' ? body.pin : undefined;
    const r = await verifyStaffPin(g.staff.appUserId, pin);
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error, locked: r.locked, needsSetup: r.needsSetup, code: 'pin_invalid' }, { status: r.status });
    }
    const issued = issuePinGrant(g.staff.appUserId, pinGrantScope(g.event.store_id));
    const res = NextResponse.json({ ok: true, expiresAt: issued.grant.expiresAt });
    res.cookies.set(PIN_GRANT_COOKIE, issued.value, pinCookieOptions(issued.grant));
    return res;
  } catch (err) {
    console.error('checkin-requests unlock POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const g = await gate(params.id);
    if ('res' in g) return g.res;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(PIN_GRANT_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/events', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('checkin-requests unlock DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
