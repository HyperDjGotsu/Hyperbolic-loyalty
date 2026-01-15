import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff
    const { data: staffCheck } = await supabaseAdmin
      .from('players')
      .select('id, is_staff, player_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!staffCheck?.is_staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { playerId, gameId, amount, reason } = body;

    if (!playerId || !gameId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      });

    if (insertError) {
      console.error('XP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('XP add error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
