// Shared-password gate for the store pitch pages (/pitch, /demo).
// Edge-safe (Web Crypto only) because middleware uses it. The cookie holds an expiry and an HMAC keyed by the
// password itself, so changing PITCH_PASSWORD in Vercel signs everybody out.

export const PITCH_COOKIE = 'pp_pitch';
export const PITCH_COOKIE_MAX_AGE_S = 30 * 24 * 3600;
const enc = new TextEncoder();

function toBase64Url(buf: ArrayBuffer): string {
  let s = '';
  new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', k, enc.encode(message)));
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the typed password matches the configured one (compared as digests, in constant time). */
export async function passwordMatches(configured: string | undefined, typed: unknown): Promise<boolean> {
  if (!configured || typeof typed !== 'string' || typed.length === 0 || typed.length > 200) return false;
  const [a, b] = await Promise.all([hmac('pitch-compare:v1', configured), hmac('pitch-compare:v1', typed)]);
  return constantTimeEqual(a, b);
}

/** The secret that signs unlock cookies: the PITCH_PASSWORD env var. Unset means the pages stay locked for everyone. */
export function accessKey(): string | undefined {
  return process.env.PITCH_PASSWORD || undefined;
}

/** Checks a typed password against PITCH_PASSWORD (never matches when it is unset). */
export async function checkPitchPassword(typed: unknown): Promise<boolean> {
  return passwordMatches(process.env.PITCH_PASSWORD, typed);
}

export async function makeAccessToken(password: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + PITCH_COOKIE_MAX_AGE_S;
  return `${exp}.${await hmac(password, `pitch-access:v1:${exp}`)}`;
}

export async function hasPitchAccess(password: string | undefined, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!password || !token) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp * 1000 < now) return false;
  return constantTimeEqual(await hmac(password, `pitch-access:v1:${exp}`), sig);
}

/** Only ever send people back to the pitch pages after unlocking (no open redirect). */
export function safeNext(raw: string | null | undefined): string {
  return raw && /^\/(pitch|demo)(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9=&\-_%.]*)?$/.test(raw) ? raw : '/pitch';
}
