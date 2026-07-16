import { supabaseAdmin } from '@/lib/supabase';

type PointTransactionType = 'earn' | 'spend' | 'refund' | 'admin_adjust';

type LogPointTransactionParams = {
  playerId: string;
  storeId: string;
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
  const { error } = await (supabaseAdmin as any).from('prize_point_transactions').insert({
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
  const { data, error } = await (supabaseAdmin as any)
    .rpc('get_user_point_balance', { p_player_id: playerId, p_store_id: storeId ?? null });

  if (error) {
    throw new Error(`Failed to get player point balance: ${error.message}`);
  }

  return (data as number) ?? 0;
}

export const TIER_MULTIPLIERS: Record<string, number> = {
  free: 1.0,
  bronze: 1.25,
  silver: 1.5,
  gold: 2.0,
  diamond: 2.0,
};
