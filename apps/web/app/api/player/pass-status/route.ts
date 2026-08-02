import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type PlayerPassTier = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

interface PlayerRecord {
  id: string;
  pass_tier: string | null;
  gems: number | null;
  home_store_id: string | null;
}

const MULTIPLIERS: Record<PlayerPassTier, number> = {
  free: 1,
  bronze: 1.25,
  silver: 1.5,
  gold: 2,
  diamond: 2,
};

function normalizeTier(tier: string | null): PlayerPassTier {
  if (tier === 'access') return 'bronze';
  if (tier === 'player') return 'silver';
  if (tier === 'all_access' || tier === 'shadow_vip') return 'gold';
  return 'free';
}

const PAGE_SIZE = 1000;

async function getLifetimeXp(playerId: string): Promise<number> {
  let total = 0;
  let page = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', playerId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw new Error(`Lifetime XP lookup failed: ${error.message}`);

    total += (data ?? []).reduce((sum, entry) => sum + entry.final_xp, 0);
    if ((data?.length ?? 0) < PAGE_SIZE) return total;

    page += 1;
  }
}

async function getPrizePoints(playerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .rpc('get_user_point_balance', { p_player_id: playerId, p_store_id: null as unknown as string });

  if (error) throw new Error(`Prize Points lookup failed: ${error.message}`);
  return data ?? 0;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const playerResult = await supabaseAdmin
      .from('players')
      .select('id, pass_tier, gems, home_store_id')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (playerResult.error) {
      console.error('Pass status player lookup failed:', playerResult.error);
      return NextResponse.json({ error: 'Failed to fetch player pass status' }, { status: 500 });
    }

    if (!playerResult.data) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const player = playerResult.data;
    const [lifetimeXp, prizePoints] = await Promise.all([
      getLifetimeXp(player.id),
      getPrizePoints(player.id),
    ]);
    const tier = normalizeTier(player.pass_tier);

    return NextResponse.json({
      tier,
      lifetimeXp,
      prizePoints,
      homeStoreId: player.home_store_id,
      multiplier: MULTIPLIERS[tier],
    });
  } catch (error) {
    console.error('Pass status GET failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
