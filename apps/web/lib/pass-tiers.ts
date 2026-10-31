// What each pass costs and includes, as shown to players. Keep in step with TIER_MULTIPLIERS in lib/points.ts.
export type PassTierKey = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface PassTierInfo {
  key: PassTierKey;
  name: string;
  priceMonthly: number | null;
  perks: string[];
}

export const PASS_TIERS: PassTierInfo[] = [
  { key: 'free', name: 'Free', priceMonthly: null, perks: ['Earn Guild Points and Prize Points at events', 'A pass is needed to spend Prize Points', 'Reach 720 Guild Points to try Bronze free for 30 days'] },
  { key: 'bronze', name: 'Bronze', priceMonthly: 10, perks: ['Spend your Prize Points on the Prize Wall', '5% off singles'] },
  { key: 'silver', name: 'Silver', priceMonthly: 15, perks: ['1.5x Prize Points at events', '5% off singles'] },
  { key: 'gold', name: 'Gold', priceMonthly: 20, perks: ['2x Prize Points at events', '5% off singles'] },
  { key: 'diamond', name: 'Diamond', priceMonthly: 30, perks: ['2x Prize Points at events', '$15 Event Credit every month', '5% off singles'] },
];
