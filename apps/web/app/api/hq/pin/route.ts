import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';
import { PIN_RE, hashPin, verifyStaffPin } from '@/lib/staff-pin';

export const dynamic = 'force-dynamic';

// Does the signed-in staff member have a PIN yet?
export async function GET() {
  const staff = await requireAnyStaff();
  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data } = await supabaseAdmin
    .from('staff_pins')
    .select('app_user_id')
    .eq('app_user_id', staff.appUserId)
    .maybeSingle();
  return NextResponse.json({ hasPin: !!data });
}

// action: 'set' (first time only) | 'verify' | 'reset' (manager/admin clears someone's PIN)
export async function POST(request: Request) {
  const staff = await requireAnyStaff();
  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { action?: string; pin?: string; app_user_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  if (body.action === 'set') {
    if (!body.pin || !PIN_RE.test(body.pin)) return NextResponse.json({ error: 'PIN must be 4 to 6 digits' }, { status: 400 });
    const { error } = await supabaseAdmin
      .from('staff_pins')
      .insert({ app_user_id: staff.appUserId, pin_hash: hashPin(body.pin) });
    if (error) {
      // Primary key conflict: a PIN already exists. Changing it goes through a reset.
      if (error.code === '23505') return NextResponse.json({ error: 'PIN already set. Ask a manager to reset it.' }, { status: 409 });
      return NextResponse.json({ error: 'Failed to save PIN' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'verify') {
    const r = await verifyStaffPin(staff.appUserId, body.pin);
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: r.error, locked: r.locked, needsSetup: r.needsSetup }, { status: r.status });
  }

  if (body.action === 'reset') {
    const targetId = body.app_user_id;
    if (!targetId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    if (!staff.isNetworkAdmin) {
      // Managers may only reset staff who hold a role at a store they manage
      const { data: roles } = await supabaseAdmin
        .from('staff_store_roles')
        .select('store_id')
        .eq('user_id', targetId);
      const allowed = (roles ?? []).some(r => staff.managedStoreIds.includes(r.store_id));
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await supabaseAdmin.from('staff_pins').delete().eq('app_user_id', targetId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
