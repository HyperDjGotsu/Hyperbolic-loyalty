import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export const PIN_RE = /^\d{4,6}$/;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export function hashPin(pin: string): string {
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

export type PinResult =
  | { ok: true }
  | { ok: false; status: number; error: string; locked?: boolean; needsSetup?: boolean };

// Checks a staff member's PIN with the shared lockout: 5 wrong tries lock it for 5 minutes.
export async function verifyStaffPin(appUserId: string, pin: string | undefined): Promise<PinResult> {
  if (!pin || !PIN_RE.test(pin)) return { ok: false, status: 401, error: 'Wrong PIN' };
  const { data: row } = await supabaseAdmin
    .from('staff_pins')
    .select('pin_hash, failed_attempts, locked_until')
    .eq('app_user_id', appUserId)
    .maybeSingle();
  if (!row) return { ok: false, status: 409, error: 'No PIN set', needsSetup: true };

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return { ok: false, status: 429, error: 'Too many tries. Try again in a few minutes.', locked: true };
  }

  if (checkPin(pin, row.pin_hash)) {
    await supabaseAdmin.from('staff_pins').update({ failed_attempts: 0, locked_until: null }).eq('app_user_id', appUserId);
    return { ok: true };
  }

  const attempts = row.failed_attempts + 1;
  const lock = attempts >= MAX_ATTEMPTS;
  await supabaseAdmin
    .from('staff_pins')
    .update({
      failed_attempts: lock ? 0 : attempts,
      locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    })
    .eq('app_user_id', appUserId);
  return {
    ok: false,
    status: lock ? 429 : 401,
    error: lock ? `Too many tries. Locked for ${LOCK_MINUTES} minutes.` : 'Wrong PIN',
    locked: lock,
  };
}
