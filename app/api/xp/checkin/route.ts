import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Check if user has checked in today
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

    // Check for check-in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: checkinToday } = await supabaseAdmin
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'check_in')
      .gte('created_at', today.toISOString())
      .limit(1);

    return NextResponse.json({
      hasCheckedInToday: checkinToday && checkinToday.length > 0
    });
  } catch (error) {
    console.error('Error checking check-in status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Perform check-in and award XP
export async function POST() {
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

    // Check for existing check-in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingCheckin } = await supabaseAdmin
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      .eq('source', 'check_in')
      .gte('created_at', today.toISOString())
      .limit(1);

    if (existingCheckin && existingCheckin.length > 0) {
      return NextResponse.json({ 
        error: 'Already checked in today',
        alreadyCheckedIn: true 
      }, { status: 400 });
    }

    // Award check-in XP
    const CHECK_IN_XP = 20;
    
    const { error: insertError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: player.id,
        base_xp: CHECK_IN_XP,
        multiplier: 1,
        final_xp: CHECK_IN_XP,
        source: 'check_in',
        description: 'Daily check-in',
      });

    if (insertError) {
      console.error('Error inserting check-in XP:', insertError);
      return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xpAwarded: CHECK_IN_XP,
      message: 'Check-in successful!'
    });
  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
