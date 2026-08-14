import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitStrict } from '@/lib/rate-limit';


export const dynamic = 'force-dynamic';
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: checkinToday } = await supabaseAdmin
      .from('xp_ledger')
      .select('id')
      .eq('player_id', player.id)
      // 'check_in' is a legacy source string not in the current xp_source enum
      .eq('source', 'check_in' as unknown as 'event_attendance')
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

    // 15 attempts per 5 minutes — accounts for NFC retries; DB enforces 1 check-in/day
    const rl = await enforceRateLimitStrict(`checkin:${userId}`, 300, 15);
    if (rl) return rl;

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
      // 'check_in' is a legacy source string not in the current xp_source enum
      .eq('source', 'check_in' as unknown as 'event_attendance')
      .gte('created_at', today.toISOString())
      .limit(1);

    if (existingCheckin && existingCheckin.length > 0) {
      return NextResponse.json({ 
        error: 'Already checked in today',
        alreadyCheckedIn: true 
      }, { status: 400 });
    }

    const CHECK_IN_XP = 5;
    
    const { error: insertError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: player.id,
        base_xp: CHECK_IN_XP,
        multiplier: 1,
        final_xp: CHECK_IN_XP,
        // 'check_in' is a legacy source string not in the current xp_source enum
        source: 'check_in' as unknown as 'event_attendance',
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
