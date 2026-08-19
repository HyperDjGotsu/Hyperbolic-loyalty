import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireStoreManager, requireNetworkAdmin } from '@/lib/auth-helpers';
import type { Database } from '@/types/database.types';
import { enforceRateLimitStrict } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Create typed Supabase client
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerId, gameId, amount, reason, storeId } = body;

    if (!playerId || !gameId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auth: store-scoped requires store manager; no storeId requires network admin
    let authCtx;
    if (storeId) {
      authCtx = await requireStoreManager(storeId);
      if (!authCtx) {
        return NextResponse.json({ error: 'Store manager or network admin required' }, { status: 403 });
      }
    } else {
      authCtx = await requireNetworkAdmin();
      if (!authCtx) {
        return NextResponse.json(
          { error: 'storeId is required for store staff' },
          { status: 400 }
        );
      }
    }

    // Rate limit after auth
    const rl = await enforceRateLimitStrict(`hq-xp:${authCtx.clerkUserId}`, 300, 60);
    if (rl) return rl;

    // Get the staff member's players record for awarded_by
    const { data: staffCheck } = await supabaseAdmin
      .from('players')
      .select('id, player_id')
      .eq('clerk_user_id', authCtx.clerkUserId)
      .single();

    if (!staffCheck) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 500 });
    }

    // Cap single XP award — network admins may exceed cap for corrections
    const MAX_SINGLE_AWARD = 500;
    if (!authCtx.isNetworkAdmin && Math.abs(amount) > MAX_SINGLE_AWARD) {
      return NextResponse.json({ error: `Single XP award cannot exceed ${MAX_SINGLE_AWARD}` }, { status: 400 });
    }

    // Verify the target player belongs to a store this staff member can access
    if (!authCtx.isNetworkAdmin && storeId) {
      const { data: targetPlayer } = await supabaseAdmin
        .from('players')
        .select('home_store_id')
        .eq('id', playerId)
        .single();
      if (targetPlayer && targetPlayer.home_store_id && !authCtx.allStoreIds.includes(targetPlayer.home_store_id)) {
        return NextResponse.json({ error: 'Player does not belong to your store' }, { status: 403 });
      }
    }

    // Add XP entry
    const { error: insertError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: playerId,
        game_id: gameId,
        base_xp: amount,
        final_xp: amount,
        multiplier: 1,
        description: reason || (amount > 0 ? 'Admin adjustment' : 'Admin correction'),
        source: 'manual_adjustment',
        awarded_by: staffCheck.id,
        store_id: storeId || null,
      });

    if (insertError) {
      console.error('XP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
    }

    return NextResponse.json({ success: true, xpAwarded: amount });
  } catch (error) {
    console.error('XP add error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
