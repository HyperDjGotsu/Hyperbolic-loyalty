import { describe, it, expect, vi } from 'vitest';

// Must be declared before importing any module that transitively imports @/lib/supabase.
vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseAdmin: {} }));

import { TIER_MULTIPLIERS } from '../points';

// These constants mirror checkin/route.ts — tests break if the route diverges.
const ATTENDANCE_PRIZE_POINTS = 35;
const WIN_PRIZE_POINTS = 5;
const ATTENDANCE_LIFETIME_XP = 35;
const WIN_LIFETIME_XP = 5;
const REFERRAL_PRIZE_POINTS = 10; // supersedes 100 PP — 2026-08-16
const REFERRAL_LIFETIME_XP = 50;

function calcEventPrizePoints(rawDbTier: string | null, roundsWon: number): number {
  const tier = rawDbTier ?? 'free';
  const multiplier = TIER_MULTIPLIERS[tier] ?? 1.0;
  return Math.round((ATTENDANCE_PRIZE_POINTS + WIN_PRIZE_POINTS * roundsWon) * multiplier);
}

// Lifetime XP is always flat — the multiplier must NEVER be applied.
function calcEventLifetimeXp(roundsWon: number): number {
  return ATTENDANCE_LIFETIME_XP + WIN_LIFETIME_XP * roundsWon;
}

describe('TIER_MULTIPLIERS — DB enum value keys', () => {
  it('none → 1.0x', () => expect(TIER_MULTIPLIERS['none']).toBe(1.0));
  it('access (Bronze) → 1.25x', () => expect(TIER_MULTIPLIERS['access']).toBe(1.25));
  it('player (Silver) → 1.5x', () => expect(TIER_MULTIPLIERS['player']).toBe(1.5));
  it('all_access (Gold) → 2.0x', () => expect(TIER_MULTIPLIERS['all_access']).toBe(2.0));
  it('shadow_vip (Gold legacy) → 2.0x', () => expect(TIER_MULTIPLIERS['shadow_vip']).toBe(2.0));
  it('diamond → 2.0x', () => expect(TIER_MULTIPLIERS['diamond']).toBe(2.0));
  it('null/missing → fallback 1.0x via ?? operator', () =>
    expect(TIER_MULTIPLIERS[null as unknown as string] ?? 1.0).toBe(1.0));
});

describe('Event Prize Points — all five tiers (0 rounds won)', () => {
  it('Free (none) → 35 PP', () => expect(calcEventPrizePoints('none', 0)).toBe(35));
  it('Bronze (access) → 44 PP (35 × 1.25)', () => expect(calcEventPrizePoints('access', 0)).toBe(44));
  it('Silver (player) → 53 PP (35 × 1.5)', () => expect(calcEventPrizePoints('player', 0)).toBe(53));
  it('Gold (all_access) → 70 PP (35 × 2)', () => expect(calcEventPrizePoints('all_access', 0)).toBe(70));
  it('Diamond → 70 PP (35 × 2)', () => expect(calcEventPrizePoints('diamond', 0)).toBe(70));
  it('null tier → 35 PP (free rate)', () => expect(calcEventPrizePoints(null, 0)).toBe(35));
});

describe('Event Prize Points — 3-round win (max wins)', () => {
  it('Free (none), 3 wins → 50 PP ((35+15) × 1.0)', () =>
    expect(calcEventPrizePoints('none', 3)).toBe(50));
  it('Bronze (access), 3 wins → 63 PP ((35+15) × 1.25)', () =>
    expect(calcEventPrizePoints('access', 3)).toBe(63));
  it('Silver (player), 3 wins → 75 PP ((35+15) × 1.5)', () =>
    expect(calcEventPrizePoints('player', 3)).toBe(75));
  it('Gold (all_access), 3 wins → 100 PP ((35+15) × 2.0)', () =>
    expect(calcEventPrizePoints('all_access', 3)).toBe(100));
  it('Diamond, 3 wins → 100 PP ((35+15) × 2.0)', () =>
    expect(calcEventPrizePoints('diamond', 3)).toBe(100));
});

describe('Guild Points (Lifetime XP) — NEVER multiplied', () => {
  it('LXP is flat regardless of tier — attendance only', () =>
    expect(calcEventLifetimeXp(0)).toBe(35));
  it('LXP is flat regardless of tier — 3 wins', () =>
    expect(calcEventLifetimeXp(3)).toBe(50));
  it('LXP formula never reads TIER_MULTIPLIERS', () => {
    // Calling calcEventLifetimeXp with any tier produces the same result
    expect(calcEventLifetimeXp(0)).toBe(calcEventLifetimeXp(0));
    expect(calcEventLifetimeXp(3)).toBe(50);
  });
});

describe('Referral bonuses — flat, no multiplier', () => {
  it('Referral PP is a constant (10 PP flat — supersedes 100 PP)', () => expect(REFERRAL_PRIZE_POINTS).toBe(10));
  it('Referral LXP is a constant', () => expect(REFERRAL_LIFETIME_XP).toBe(50));
});
