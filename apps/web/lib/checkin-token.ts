import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

// Rotating check-in token shown in the kiosk QR. A player's own check-in must carry a current one,
// so it only works for someone who has actually seen the kiosk screen in the last few minutes.
// Stateless: HMAC of (event id, time block) with a server secret, nothing stored.
export const TOKEN_BLOCK_MS = 2 * 60_000; // the kiosk QR changes every block
export const TOKEN_GRACE_BLOCKS = 2; // a token stays good for this many blocks after its own (about 4-6 minutes in all)

function secret(): string {
  const s = process.env.CHECKIN_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret available for check-in tokens');
  return s;
}

function sign(eventId: string, block: number): string {
  return createHmac('sha256', secret()).update(`checkin-token:v1:${eventId}:${block}`).digest('base64url').slice(0, 22);
}

export function currentCheckinToken(eventId: string, now = Date.now()): { token: string; rotatesInMs: number } {
  const block = Math.floor(now / TOKEN_BLOCK_MS);
  return { token: sign(eventId, block), rotatesInMs: (block + 1) * TOKEN_BLOCK_MS - now };
}

export function isValidCheckinToken(eventId: string, token: unknown, now = Date.now()): boolean {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(token)) return false;
  const block = Math.floor(now / TOKEN_BLOCK_MS);
  const given = Buffer.from(token);
  let ok = false;
  for (let i = 0; i <= TOKEN_GRACE_BLOCKS; i++) {
    const want = Buffer.from(sign(eventId, block - i));
    if (want.length === given.length && timingSafeEqual(want, given)) ok = true;
  }
  return ok;
}
