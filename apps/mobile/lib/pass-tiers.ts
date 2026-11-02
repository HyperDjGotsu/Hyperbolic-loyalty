// Pass tiers as players see them. The database still stores the older ids (access, player, all_access),
// so this maps those to the current names. Mirrors apps/web/lib/pass-tiers.ts and the web Profile page.
export type PassTierKey = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

const DB_TO_KEY: Record<string, PassTierKey> = {
  access: 'bronze',
  bronze: 'bronze',
  player: 'silver',
  silver: 'silver',
  all_access: 'gold',
  gold: 'gold',
  diamond: 'diamond',
};

export const PASS_NAMES: Record<PassTierKey, string> = {
  free: 'Free',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  diamond: 'Diamond',
};

export function passTierKey(dbTier: string | null | undefined): PassTierKey {
  return (dbTier && DB_TO_KEY[dbTier]) || 'free';
}

export function passTierLabel(dbTier: string | null | undefined): string {
  const key = passTierKey(dbTier);
  return key === 'free' ? 'Free Member' : `${PASS_NAMES[key]} Pass`;
}
