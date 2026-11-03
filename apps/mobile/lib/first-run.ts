import * as SecureStore from 'expo-secure-store';

// Same flags the website keeps in localStorage, kept in SecureStore on the phone.
export const WELCOME_KEY = 'hxp_welcome_seen';
export const HOME_TOUR_KEY = 'pp_home_tour_seen';
export const PAGE_INTRO_KEY_PREFIX = 'pp_page_intro_';

export async function getFlag(key: string): Promise<boolean> {
  try { return !!(await SecureStore.getItemAsync(key)); } catch { return true; } // unreadable: don't nag
}

export async function setFlag(key: string): Promise<void> {
  try { await SecureStore.setItemAsync(key, 'true'); } catch { /* may show again next launch */ }
}

// Lets the Home tour start once the welcome slides close (the web does this with a window event).
const listeners = new Set<() => void>();
export function onWelcomeClosed(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function emitWelcomeClosed() { listeners.forEach(fn => fn()); }

// Replay requests from Profile. Home's WelcomeOverlay / HomeTour subscribe; if Home has not mounted yet the
// request waits and is delivered as soon as something subscribes.
export type ReplayKind = 'welcome' | 'tour';
const replayListeners = new Map<ReplayKind, Set<() => void>>();
const pendingReplay = new Set<ReplayKind>();

export function requestReplay(kind: ReplayKind) {
  const subs = replayListeners.get(kind);
  if (subs && subs.size > 0) subs.forEach(fn => fn());
  else pendingReplay.add(kind);
}

export function onReplay(kind: ReplayKind, fn: () => void): () => void {
  let subs = replayListeners.get(kind);
  if (!subs) { subs = new Set(); replayListeners.set(kind, subs); }
  subs.add(fn);
  if (pendingReplay.delete(kind)) fn();
  return () => { subs!.delete(fn); };
}
