import { supabaseAdmin } from '@/lib/supabase';

type PointTransactionType = 'earn' | 'spend' | 'refund' | 'admin_adjust';

type LogPointTransactionParams = {
  playerId: string;
  storeId: string | null;  // null = network-level adjustment (network admin only)
  amount: number;
  type: PointTransactionType;
  source: string;
  referenceId?: string;
  note?: string;
};

export async function logPointTransaction({
  playerId,
  storeId,
  amount,
  type,
  source,
  referenceId,
  note,
}: LogPointTransactionParams): Promise<void> {
  const { error } = await supabaseAdmin.from('prize_point_transactions').insert({
    player_id: playerId,
    store_id: storeId,
    amount,
    type,
    source,
    reference_id: referenceId ?? null,
    note: note ?? null,
  });

  if (error) {
    throw new Error(`Failed to log point transaction: ${error.message}`);
  }
}

export async function getPlayerBalance(playerId: string, storeId?: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .rpc('get_user_point_balance', { p_player_id: playerId, p_store_id: storeId ?? (null as unknown as string) });

  if (error) {
    throw new Error(`Failed to get player point balance: ${error.message}`);
  }

  return data ?? 0;
}

/**
 * Canonical financial-benefit rule — use this in every route that gates benefits on pass_tier.
 *
 * Evaluation order:
 * 1. `cancelled` and `expired` statuses → return 'none'.
 *    These currently always co-occur with pass_tier='none', but the status check is
 *    defense-in-depth against future cancel-at-period-end patterns where the tier might
 *    remain set while the subscription is winding down.
 * 2. `grace_period` status intentionally retains benefits — falls through to expiration check.
 * 3. null status is valid (trial players and legacy rows) — falls through to expiration check.
 * 4. Non-null expiresAt in the past → return 'none'.
 * 5. Null expiresAt on a non-shadow_vip paid tier → return 'none' (fail-closed).
 *    Normal paid tiers MUST have an expiration date; null means malformed/incomplete
 *    lifecycle data, not a permanent grant. Only shadow_vip is intentionally permanent.
 * 6. Null expiresAt on shadow_vip → allowed (intentional permanent grant).
 * 7. Otherwise return the tier (defaulting to 'none' if tier is null).
 */
export function effectivePassTier(
  tier: string | null,
  expiresAt: string | null | undefined,
  status: string | null | undefined,
): string {
  if (status === 'cancelled' || status === 'expired') return 'none';
  if (expiresAt && new Date(expiresAt) <= new Date()) return 'none';
  // Null expiration is only valid for shadow_vip (intentionally permanent grant).
  // Any other paid tier without an expiration date is malformed — fail closed.
  if (!expiresAt && tier && tier !== 'none' && tier !== 'shadow_vip') return 'none';
  return tier ?? 'none';
}

// Keys cover both canonical DB enum values and friendly-name aliases.
// Callers use the raw DB pass_tier value; both forms resolve correctly.
export const TIER_MULTIPLIERS: Record<string, number> = {
  // DB enum values (what callers read from players.pass_tier)
  none: 1.0,
  access: 1.25,      // Bronze
  player: 1.5,       // Silver
  all_access: 2.0,   // Gold
  shadow_vip: 2.0,   // Gold (legacy)
  diamond: 2.0,
  // Friendly-name aliases (fallback string 'free' and any direct usage)
  free: 1.0,
  bronze: 1.25,
  silver: 1.5,
  gold: 2.0,
};
