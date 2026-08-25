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

const BENEFIT_BEARING_TIERS = new Set(['access', 'player', 'all_access', 'diamond']);
const BENEFIT_BEARING_STATUSES = new Set(['active', 'cancel_scheduled']);

// Strict UTC ISO 8601 parse — rejects non-UTC, date-only, and calendar-normalizing inputs.
// PostgreSQL timestamptz always produces valid UTC ISO strings, so DB-sourced values always pass.
function strictParseExpiry(s: string | null | undefined): number {
  if (!s) return NaN;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s)) return NaN;
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return NaN;
  if (new Date(ms).toISOString().substring(0, 10) !== s.substring(0, 10)) return NaN;
  return ms;
}

// Canonical financial-benefit gate. Use this everywhere pass_tier drives benefit access.
// Returns the effective tier string or 'none' if the pass is not benefit-bearing.
export function effectivePassTier(
  tier: string | null | undefined,
  expiresAt: string | null | undefined,
  status: string | null | undefined,
): string {
  if (!BENEFIT_BEARING_STATUSES.has(status ?? '')) return 'none';
  const expiryMs = strictParseExpiry(expiresAt);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return 'none';
  if (!tier || !BENEFIT_BEARING_TIERS.has(tier)) return 'none';
  return tier;
}

// Keys cover both canonical DB enum values and friendly-name aliases.
// Callers use the raw DB pass_tier value; both forms resolve correctly.
export const TIER_MULTIPLIERS: Record<string, number> = {
  // DB enum values (what callers read from players.pass_tier)
  none: 1.0,
  access: 1.25,      // Bronze
  player: 1.5,       // Silver
  all_access: 2.0,   // Gold
  diamond: 2.0,
  // Friendly-name aliases (fallback string 'free' and any direct usage)
  free: 1.0,
  bronze: 1.25,
  silver: 1.5,
  gold: 2.0,
};

// Tiers staff are permitted to grant. Excludes legacy/retired values (shadow_vip).
export const GRANTABLE_TIERS = ['access', 'player', 'all_access', 'diamond'] as const;
export type GrantableTier = typeof GRANTABLE_TIERS[number];
