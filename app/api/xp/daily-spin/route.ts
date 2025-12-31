import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Check if user has already spun today
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check for spin today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todaySpin } = await supabase
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'daily_spin')
      .gte('created_at', today.toISOString())
      .limit(1);

    return NextResponse.json({
      hasSpunToday: todaySpin && todaySpin.length > 0
    });
  } catch (error) {
    console.error('Daily spin status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the spin result from the request body
    const body = await request.json();
    const { xp, rewardName, rarity } = body;

    if (typeof xp !== 'number' || xp < 0 || xp > 100) {
      return NextResponse.json({ error: 'Invalid XP value' }, { status: 400 });
    }

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, player_id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check if already spun today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todaySpin } = await supabase
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'daily_spin')
      .gte('created_at', today.toISOString())
      .limit(1);

    if (todaySpin && todaySpin.length > 0) {
      return NextResponse.json({ 
        error: 'Already spun today',
        hasSpunToday: true 
      }, { status: 400 });
    }

    // Award spin XP (only if XP > 0)
    if (xp > 0) {
      const { error: xpError } = await supabase
        .from('xp_ledger')
        .insert({
          player_id: player.id,
          source: 'daily_spin',
          base_xp: xp,
          multiplier: 1.0,
          final_xp: xp,
          description: `Daily Spin: ${rewardName || xp + ' XP'} (${rarity || 'common'})`,
          game_id: 'general',
        });

      if (xpError) {
        console.error('XP insert error:', xpError);
        return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
      }
    } else {
      // For non-XP rewards (like booster packs), still record the spin
      const { error: xpError } = await supabase
        .from('xp_ledger')
        .insert({
          player_id: player.id,
          source: 'daily_spin',
          base_xp: 0,
          multiplier: 1.0,
          final_xp: 0,
          description: `Daily Spin: ${rewardName || 'Special Reward'} (${rarity || 'epic'})`,
          game_id: 'general',
        });

      if (xpError) {
        console.error('Spin record error:', xpError);
        return NextResponse.json({ error: 'Failed to record spin' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      xpEarned: xp,
      rewardName,
      rarity
    });
  } catch (error) {
    console.error('Daily spin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
