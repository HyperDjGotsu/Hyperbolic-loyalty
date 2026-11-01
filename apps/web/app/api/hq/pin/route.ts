import { NextResponse } from 'next/server';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const PIN_RE = /^\d{4,6}$/;

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

function checkPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pin, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

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
    if (!body.pin || !PIN_RE.test(body.pin)) return NextResponse.json({ ok: false, error: 'Wrong PIN' }, { status: 401 });
    const { data: row } = await supabaseAdmin
      .from('staff_pins')
      .select('pin_hash, failed_attempts, locked_until')
      .eq('app_user_id', staff.appUserId)
      .maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: 'No PIN set', needsSetup: true }, { status: 409 });

    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      return NextResponse.json({ ok: false, error: 'Too many tries. Try again in a few minutes.', locked: true }, { status: 429 });
    }

    if (checkPin(body.pin, row.pin_hash)) {
      await supabaseAdmin.from('staff_pins').update({ failed_attempts: 0, locked_until: null }).eq('app_user_id', staff.appUserId);
      return NextResponse.json({ ok: true });
    }

    const attempts = row.failed_attempts + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await supabaseAdmin
      .from('staff_pins')
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq('app_user_id', staff.appUserId);
    return NextResponse.json(
      { ok: false, error: lock ? `Too many tries. Locked for ${LOCK_MINUTES} minutes.` : 'Wrong PIN', locked: lock },
      { status: lock ? 429 : 401 },
    );
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
