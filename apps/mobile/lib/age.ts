import * as SecureStore from 'expo-secure-store';

export const MIN_AGE = 13;
const BLOCK_KEY = 'pp_age_blocked';

// Mirrors the web age gate: the birthdate is only used to check 13+ and is never stored.
// A "blocked" flag is kept on the device so the same phone can't just retry with a different date.
export async function isAgeBlocked(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(BLOCK_KEY)) === '1'; } catch { return false; }
}

export async function setAgeBlocked(): Promise<void> {
  try { await SecureStore.setItemAsync(BLOCK_KEY, '1'); } catch { /* best effort */ }
}

// Returns an ISO date (YYYY-MM-DD) for a real past date, or null if the numbers don't make a valid date.
export function parseBirthdate(month: string, day: string, year: string): string | null {
  const m = Number(month), d = Number(day), y = Number(year);
  if (!m || !d || !y || y < 1900) return null;
  const dob = new Date(y, m - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d || dob > new Date()) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function ageFromIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age--;
  return age;
}
