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
