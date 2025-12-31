import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CHECKIN_XP = 20;

export async function GET() {
  // Check if user has already checked in today
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

    // Check for check-in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayCheckin } = await supabase
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'check_in')
      .gte('created_at', today.toISOString())
      .limit(1);

    return NextResponse.json({
      hasCheckedInToday: todayCheckin && todayCheckin.length > 0
    });
  } catch (error) {
    console.error('Check-in status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayCheckin } = await supabase
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'check_in')
      .gte('created_at', today.toISOString())
      .limit(1);

    if (todayCheckin && todayCheckin.length > 0) {
      return NextResponse.json({ 
        error: 'Already checked in today',
        hasCheckedInToday: true 
      }, { status: 400 });
    }

    // Award check-in XP
    const { data: xpEntry, error: xpError } = await supabase
      .from('xp_ledger')
      .insert({
        player_id: player.id,
        source: 'check_in',
        base_xp: CHECKIN_XP,
        multiplier: 1.0,
        final_xp: CHECKIN_XP,
        description: 'Daily store check-in',
        game_id: 'general',
      })
      .select()
      .single();

    if (xpError) {
      console.error('XP insert error:', xpError);
      return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xpEarned: CHECKIN_XP,
      message: 'Welcome back!',
      entry: xpEntry
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
