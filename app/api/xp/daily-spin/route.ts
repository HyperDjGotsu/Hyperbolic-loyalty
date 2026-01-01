import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Check if user has spun today
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get player by clerk_user_id
    const { data: player, error: playerError } = await supabaseAdmin
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

    const { data: spinToday } = await supabaseAdmin
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'daily_spin')
      .gte('created_at', today.toISOString())
      .limit(1);

    return NextResponse.json({
      hasSpunToday: spinToday && spinToday.length > 0
    });
  } catch (error) {
    console.error('Error checking spin status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Record daily spin reward
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { xp, rewardName } = body;

    if (typeof xp !== 'number' || xp < 0) {
      return NextResponse.json({ error: 'Invalid XP amount' }, { status: 400 });
    }

    // Get player by clerk_user_id
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check for existing spin today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingSpin } = await supabaseAdmin
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'daily_spin')
      .gte('created_at', today.toISOString())
      .limit(1);

    if (existingSpin && existingSpin.length > 0) {
      return NextResponse.json({ 
        error: 'Already spun today',
        alreadySpun: true 
      }, { status: 400 });
    }

    // Award spin XP (only if XP > 0)
    if (xp > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('xp_ledger')
        .insert({
          player_id: player.id,
          base_xp: xp,
          multiplier: 1,
          final_xp: xp,
          source: 'daily_spin',
          description: rewardName || `Daily spin: ${xp} XP`,
        });

      if (insertError) {
        console.error('Error inserting spin XP:', insertError);
        return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
      }
    } else {
      // For non-XP rewards (like booster packs), just record the spin happened
      const { error: insertError } = await supabaseAdmin
        .from('xp_ledger')
        .insert({
          player_id: player.id,
          base_xp: 0,
          multiplier: 1,
          final_xp: 0,
          source: 'daily_spin',
          description: rewardName || 'Daily spin (non-XP reward)',
        });

      if (insertError) {
        console.error('Error recording spin:', insertError);
        return NextResponse.json({ error: 'Failed to record spin' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      xpAwarded: xp,
      message: 'Spin recorded!'
    });
  } catch (error) {
    console.error('Error processing spin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
