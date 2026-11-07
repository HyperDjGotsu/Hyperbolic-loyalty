import * as SecureStore from 'expo-secure-store';

// A deep link (kiosk QR /checkin?event_id=, /event/<id>, /onboarding?ref=) opened before the player is signed in or
// linked is parked here, then replayed once sign-in / onboarding completes.
const KEY = 'pp_pending_link';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const ID = /^[A-Za-z0-9-]{1,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const REF = /^[A-Za-z0-9-]{1,20}$/;
const SLUG = /^[A-Za-z0-9_-]{1,64}$/;
const STAFF = /^[A-Za-z0-9_-]{1,128}$/;

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

// Returns a safe in-app path for the three supported targets, or null for anything else.
export function buildPendingPath(pathname: string, params: Record<string, Param>): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/checkin') {
    const id = first(params.event_id);
    if (!id || !ID.test(id)) return null;
    const t = first(params.t);
    return t && TOKEN.test(t) ? `/checkin?event_id=${id}&t=${t}` : `/checkin?event_id=${id}`;
  }
  const ev = /^\/event\/([A-Za-z0-9-]{1,64})$/.exec(clean);
  if (ev) return `/event/${ev[1]}`;
  if (clean === '/onboarding') {
    const q: string[] = [];
    const ref = first(params.ref);
    const store = first(params.store);
    if (ref && REF.test(ref)) q.push(`ref=${ref}`);
    if (store && SLUG.test(store)) q.push(`store=${store}`);
    const staff = first(params.staff);
    if (staff && STAFF.test(staff)) q.push(`staff=${staff}`);
    return q.length ? `/onboarding?${q.join('&')}` : '/onboarding';
  }
  return null;
}

export async function savePendingLink(path: string): Promise<void> {
  try { await SecureStore.setItemAsync(KEY, JSON.stringify({ path, at: Date.now() })); } catch { /* best effort */ }
}

export async function peekPendingLink(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (typeof path !== 'string' || typeof at !== 'number' || Date.now() - at > MAX_AGE_MS) {
      await clearPendingLink();
      return null;
    }
    return path;
  } catch { return null; }
}

export async function clearPendingLink(): Promise<void> {
  try { await SecureStore.deleteItemAsync(KEY); } catch { /* ignore */ }
}
