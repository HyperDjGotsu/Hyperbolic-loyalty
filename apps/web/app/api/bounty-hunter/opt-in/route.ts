import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Get current month key
function getCurrentMonthKey(): string {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

// POST - Opt in as Hunter
export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current player
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const monthKey = getCurrentMonthKey();

    // Get current event
    const { data: event } = await supabaseAdmin
      .from('bounty_hunter_events')
      .select('*')
      .eq('month_key', monthKey)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'No Bounty Hunter event this month' }, { status: 400 });
    }

    // Check if opt-in is open
    const now = new Date();
    const optInOpens = new Date(event.opt_in_opens_at);
    const optInCloses = new Date(event.opt_in_closes_at);

    if (event.status !== 'opt_in_open') {
      return NextResponse.json({ error: 'Opt-in is not currently open' }, { status: 400 });
    }

    if (now < optInOpens) {
      return NextResponse.json({ error: 'Opt-in has not started yet' }, { status: 400 });
    }

    if (now > optInCloses) {
      return NextResponse.json({ error: 'Opt-in period has ended' }, { status: 400 });
    }

    // Check if player is in WANTED list (Top 5) - they can't opt in as Hunter
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp')
      .eq('game_id', 'one_piece');

    const playerXp: Record<string, number> = {};
    xpData?.forEach(entry => {
      if (entry.player_id) {
        playerXp[entry.player_id] = (playerXp[entry.player_id] || 0) + (entry.final_xp || 0);
      }
    });

    const sortedPlayers = Object.entries(playerXp)
      .sort(([, a], [, b]) => b - a);
    
    const wantedPlayerIds = sortedPlayers.slice(0, 5).map(([id]) => id);
    
    if (wantedPlayerIds.includes(player.id)) {
      return NextResponse.json({ error: 'You are WANTED! Top 5 players cannot opt-in as Hunters.' }, { status: 400 });
    }

    // Check if already opted in
    const { data: existing } = await supabaseAdmin
      .from('bounty_hunter_participants')
      .select('id')
      .eq('event_id', event.id)
      .eq('player_id', player.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'You have already opted in' }, { status: 400 });
    }

    // Add participation
    const { error: insertError } = await supabaseAdmin
      .from('bounty_hunter_participants')
      .insert({
        event_id: event.id,
        player_id: player.id,
        role: 'hunter',
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to opt in' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '🏹 You are now a Hunter! Good luck claiming bounties.',
      role: 'hunter',
    });
  } catch (error) {
    console.error('Bounty Hunter opt-in error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Opt out (withdraw as Hunter)
export async function DELETE() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current player
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const monthKey = getCurrentMonthKey();

    // Get current event
    const { data: event } = await supabaseAdmin
      .from('bounty_hunter_events')
      .select('*')
      .eq('month_key', monthKey)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'No Bounty Hunter event this month' }, { status: 400 });
    }

    // Check if opt-out is allowed (only during opt-in period)
    const now = new Date();
    const optInCloses = new Date(event.opt_in_closes_at);

    if (now > optInCloses || event.status === 'active' || event.status === 'completed') {
      return NextResponse.json({ error: 'Cannot opt-out after opt-in period closes' }, { status: 400 });
    }

    // Remove participation
    const { error: deleteError } = await supabaseAdmin
      .from('bounty_hunter_participants')
      .delete()
      .eq('event_id', event.id)
      .eq('player_id', player.id)
      .eq('role', 'hunter'); // Only hunters can opt out, not WANTED

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to opt out' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'You have withdrawn from Bounty Hunter Night.',
      role: 'civilian',
    });
  } catch (error) {
    console.error('Bounty Hunter opt-out error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
