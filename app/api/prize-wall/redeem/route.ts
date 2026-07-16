import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { itemId, storeId } = await request.json() as { itemId: string; storeId?: string };

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, pass_tier, home_store_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const resolvedStoreId = storeId || (player as any).home_store_id || null;

    // Check free tier gate server-side
    if ((player as any).pass_tier === 'free' || (player as any).pass_tier === 'none') {
      const { data: config } = await (supabaseAdmin as any)
        .from('economy_config')
        .select('config')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const gate = config?.config?.free_tier_gate_pts ?? 720;

      const { data: balance } = await (supabaseAdmin as any)
        .rpc('get_user_point_balance', { p_player_id: player.id, p_store_id: null });

      if ((balance ?? 0) < gate) {
        return NextResponse.json({
          error: 'Prize Wall locked',
          gateRequired: gate,
          currentBalance: balance ?? 0,
        }, { status: 403 });
      }
    }

    // Atomic deduct + create redemption
    const { data: result, error } = await (supabaseAdmin as any)
      .rpc('create_prize_redemption', {
        p_player_id: player.id,
        p_item_id: itemId,
        p_store_id: resolvedStoreId,
      });

    if (error) {
      console.error('Redemption RPC error:', error);
      return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
    }

    if (result.error) {
      return NextResponse.json({ error: result.error, balance: result.balance, required: result.required }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      claimCode: result.claim_code,
      itemName: result.item_name,
      pointsDeducted: result.points_deducted,
      redemptionId: result.redemption_id,
    });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
