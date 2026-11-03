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

// What each pass costs and includes, as shown to players. Mirrors PASS_TIERS in apps/web/lib/pass-tiers.ts.
// Passes are bought in the store, never in the app.
export const FREE_TIER_GATE = 720;

export interface PassTierInfo {
  key: PassTierKey;
  name: string;
  priceMonthly: number | null;
  perks: string[];
}

export const PASS_TIERS: PassTierInfo[] = [
  { key: 'free', name: 'Free', priceMonthly: null, perks: ['Earn Guild Points and Prize Points at events', 'A pass is needed to spend Prize Points', `Reach ${FREE_TIER_GATE} Guild Points to try Bronze free for 30 days`] },
  { key: 'bronze', name: 'Bronze', priceMonthly: 10, perks: ['Spend your Prize Points on the Prize Wall', '5% off singles'] },
  { key: 'silver', name: 'Silver', priceMonthly: 15, perks: ['1.5x Prize Points at events', '5% off singles'] },
  { key: 'gold', name: 'Gold', priceMonthly: 20, perks: ['2x Prize Points at events', '5% off singles'] },
  { key: 'diamond', name: 'Diamond', priceMonthly: 30, perks: ['2x Prize Points at events', '$15 Event Credit every month', '5% off singles'] },
];
