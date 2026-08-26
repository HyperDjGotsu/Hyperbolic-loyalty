import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseAdmin: {} }));

// Tests call the production function, not a copy of the logic.
// If the route's gate diverges from isRenewalOpportunity, these tests will catch it.
import { isRenewalOpportunity, BENEFIT_BEARING_TIERS } from '../points';

describe('isRenewalOpportunity — three-condition eligibility gate', () => {
  describe('gate triggers', () => {
    it('triggers for expired paid access member', () => {
      expect(isRenewalOpportunity('expired', 'access', true)).toBe(true);
    });

    it('triggers for expired paid player member', () => {
      expect(isRenewalOpportunity('expired', 'player', true)).toBe(true);
    });

    it('triggers for expired paid all_access member', () => {
      expect(isRenewalOpportunity('expired', 'all_access', true)).toBe(true);
    });

    it('triggers for expired paid diamond member', () => {
      expect(isRenewalOpportunity('expired', 'diamond', true)).toBe(true);
    });
  });

  describe('gate does NOT trigger', () => {
    it('does not trigger when has_been_paid_member is false (complimentary/trial only)', () => {
      expect(isRenewalOpportunity('expired', 'all_access', false)).toBe(false);
    });

    it('does not trigger when pass_status is active', () => {
      expect(isRenewalOpportunity('active', 'player', true)).toBe(false);
    });

    it('does not trigger when pass_status is cancel_scheduled', () => {
      expect(isRenewalOpportunity('cancel_scheduled', 'player', true)).toBe(false);
    });

    it('does not trigger when pass_status is cancelled (not expired)', () => {
      expect(isRenewalOpportunity('cancelled', 'all_access', true)).toBe(false);
    });

    it('does not trigger when pass_status is null', () => {
      expect(isRenewalOpportunity(null, 'player', true)).toBe(false);
    });

    it('does not trigger when tier is none (free user)', () => {
      expect(isRenewalOpportunity('expired', 'none', true)).toBe(false);
    });

    it('does not trigger when tier is null', () => {
      expect(isRenewalOpportunity('expired', null, true)).toBe(false);
    });

    it('does not trigger when tier is free', () => {
      expect(isRenewalOpportunity('expired', 'free', true)).toBe(false);
    });

    it('does not trigger when tier is shadow_vip (non-benefit-bearing)', () => {
      expect(isRenewalOpportunity('expired', 'shadow_vip', true)).toBe(false);
    });

    it('does not trigger when all conditions false', () => {
      expect(isRenewalOpportunity('active', 'none', false)).toBe(false);
    });
  });
});

describe('BENEFIT_BEARING_TIERS — tier set used by isRenewalOpportunity', () => {
  it('includes access', () => expect(BENEFIT_BEARING_TIERS.has('access')).toBe(true));
  it('includes player', () => expect(BENEFIT_BEARING_TIERS.has('player')).toBe(true));
  it('includes all_access', () => expect(BENEFIT_BEARING_TIERS.has('all_access')).toBe(true));
  it('includes diamond', () => expect(BENEFIT_BEARING_TIERS.has('diamond')).toBe(true));
  it('excludes none', () => expect(BENEFIT_BEARING_TIERS.has('none')).toBe(false));
  it('excludes free', () => expect(BENEFIT_BEARING_TIERS.has('free')).toBe(false));
  it('excludes shadow_vip', () => expect(BENEFIT_BEARING_TIERS.has('shadow_vip')).toBe(false));
});

describe('skip semantics — future-event persistence', () => {
  // Skipping (Check In Without Renewal) does not change pass_status,
  // pass_tier, or has_been_paid_member. All three conditions remain true.
  // This test documents the invariant: same inputs re-trigger at next event.
  it('gate re-triggers at next event after skip (no state change)', () => {
    const passStatus = 'expired';
    const passTier = 'player';
    const hasBeenPaidMember = true;

    const firstEvent = isRenewalOpportunity(passStatus, passTier, hasBeenPaidMember);
    // Skip does not mutate any of these fields — same inputs at next event
    const secondEvent = isRenewalOpportunity(passStatus, passTier, hasBeenPaidMember);

    expect(firstEvent).toBe(true);
    expect(secondEvent).toBe(true);
  });

  // After Confirm Renewal, pass_status becomes 'active' — gate does not trigger.
  it('gate does NOT trigger after successful renewal (pass_status active)', () => {
    expect(isRenewalOpportunity('active', 'player', true)).toBe(false);
  });
});
