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

    const resolvedStoreId: string | null = storeId || player.home_store_id || null;

    if (!resolvedStoreId) {
      return NextResponse.json({ error: 'No store selected — visit a store first' }, { status: 400 });
    }

    // Check free tier gate server-side
    if (player.pass_tier === 'none' || player.pass_tier === null) {
      const { data: config } = await supabaseAdmin
        .from('economy_config')
        .select('config')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const configJson = (config?.config ?? {}) as { free_tier_gate_pts?: number };
      const gate = configJson.free_tier_gate_pts ?? 720;

      const { data: balance } = await supabaseAdmin
        .rpc('get_user_point_balance', { p_player_id: player.id, p_store_id: null as unknown as string });

      if ((balance ?? 0) < gate) {
        return NextResponse.json({
          error: 'Prize Wall locked',
          gateRequired: gate,
          currentBalance: balance ?? 0,
        }, { status: 403 });
      }
    }

    // Atomic deduct + create redemption
    const { data: result, error } = await supabaseAdmin
      .rpc('create_prize_redemption', {
        p_player_id: player.id,
        p_item_id: itemId,
        p_store_id: resolvedStoreId,
      });

    if (error) {
      console.error('Redemption RPC error:', error);
      return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
    }

    const resultJson = result as {
      error?: string;
      balance?: number;
      required?: number;
      claim_code?: string;
      item_name?: string;
      points_deducted?: number;
      redemption_id?: string;
    };

    if (resultJson.error) {
      return NextResponse.json({ error: resultJson.error, balance: resultJson.balance, required: resultJson.required }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      claimCode: resultJson.claim_code,
      itemName: resultJson.item_name,
      pointsDeducted: resultJson.points_deducted,
      redemptionId: resultJson.redemption_id,
    });
  } catch (error) {
    console.error('Redeem error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
