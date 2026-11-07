// Titles a player can hold. Safe to import anywhere (no server code).
// The table `player_titles` only stores who holds which key; label, colour and XP bonus live here.

export const TITLES = {
  founding_member: { label: 'Founding Member', color: '#e2b43c', xp: 100, blurb: 'One of the first players to join PlayerPass' },
  beta_tester: { label: 'Beta Tester', color: '#7fb0ff', xp: 100, blurb: 'Helped test PlayerPass before launch' },
} as const;

export type TitleKey = keyof typeof TITLES;
export const TITLE_KEYS = Object.keys(TITLES) as TitleKey[];

export function isTitleKey(k: unknown): k is TitleKey {
  return typeof k === 'string' && Object.prototype.hasOwnProperty.call(TITLES, k);
}

/** Keeps only known titles, in the order they are defined above. */
export function sortTitles(keys: readonly string[]): TitleKey[] {
  return TITLE_KEYS.filter(k => keys.includes(k));
}
