import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Get current month key (e.g., "2026-01")
function getCurrentMonthKey(): string {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    let currentPlayerId: string | null = null;
    let currentPlayerRank: number | null = null;
    
    // Get current player if logged in
    if (userId) {
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();
      
      if (player) {
        currentPlayerId = player.id;
      }
    }

    const monthKey = getCurrentMonthKey();

    // Get current or upcoming bounty hunter event
    const { data: event } = await supabaseAdmin
      .from('bounty_hunter_events')
      .select('*')
      .eq('month_key', monthKey)
      .single();

    // If no event for this month, return basic status
    if (!event) {
      return NextResponse.json({
        event: null,
        status: {
          isWanted: false,
          isHunter: false,
          role: 'civilian',
          rank: null,
          canOptIn: false,
          canOptOut: false,
        },
        wantedList: [],
        hunterCount: 0,
        message: 'No Bounty Hunter Night scheduled this month',
      });
    }

    // Get One Piece leaderboard to determine WANTED list (Top 5)
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp')
      .eq('game_id', 'one_piece');

    // Aggregate XP by player
    const playerXp: Record<string, number> = {};
    xpData?.forEach(entry => {
      if (entry.player_id) {
        playerXp[entry.player_id] = (playerXp[entry.player_id] || 0) + (entry.final_xp || 0);
      }
    });

    // Sort and get top 5 (WANTED)
    const sortedPlayers = Object.entries(playerXp)
      .sort(([, a], [, b]) => b - a);
    
    const wantedPlayerIds = sortedPlayers.slice(0, 5).map(([id]) => id);
    
    // Find current player's rank
    if (currentPlayerId) {
      const playerIndex = sortedPlayers.findIndex(([id]) => id === currentPlayerId);
      if (playerIndex !== -1) {
        currentPlayerRank = playerIndex + 1;
      }
    }

    // Get WANTED player details
    const { data: wantedPlayers } = await supabaseAdmin
      .from('players')
      .select('id, display_name, avatar_config, privacy_show_as_anonymous')
      .in('id', wantedPlayerIds);

    const wantedMap: Record<string, any> = {};
    wantedPlayers?.forEach(p => {
      wantedMap[p.id] = p;
    });

    const wantedList = wantedPlayerIds.map((playerId, index) => {
      const player = wantedMap[playerId];
      const isAnonymous = player?.privacy_show_as_anonymous || false;
      return {
        rank: index + 1,
        id: playerId,
        name: isAnonymous ? 'Anonymous' : (player?.display_name || 'Unknown'),
        xp: playerXp[playerId] || 0,
        isAnonymous,
      };
    });

    // Get all participants for this event
    const { data: participants } = await supabaseAdmin
      .from('bounty_hunter_participants')
      .select('player_id, role')
      .eq('event_id', event.id);

    const hunterCount = participants?.filter(p => p.role === 'hunter').length || 0;

    // Determine current player's status
    let isWanted = false;
    let isHunter = false;
    let role = 'civilian';

    if (currentPlayerId) {
      // Check if player is in WANTED list (Top 5)
      isWanted = wantedPlayerIds.includes(currentPlayerId);
      
      // Check if player has opted in as hunter
      const participation = participants?.find(p => p.player_id === currentPlayerId);
      if (participation) {
        isHunter = participation.role === 'hunter';
        role = participation.role;
      } else if (isWanted) {
        role = 'wanted';
      }
    }

    // Determine if opt-in is available
    const now = new Date();
    const optInOpens = new Date(event.opt_in_opens_at);
    const optInCloses = new Date(event.opt_in_closes_at);
    const canOptIn = !isWanted && !isHunter && event.status === 'opt_in_open' && now >= optInOpens && now <= optInCloses;
    const canOptOut = isHunter && event.status === 'opt_in_open' && now <= optInCloses;

    return NextResponse.json({
      event: {
        id: event.id,
        eventDate: event.event_date,
        monthKey: event.month_key,
        status: event.status,
        optInOpensAt: event.opt_in_opens_at,
        optInClosesAt: event.opt_in_closes_at,
      },
      status: {
        isWanted,
        isHunter,
        role: isWanted ? 'wanted' : (isHunter ? 'hunter' : 'civilian'),
        rank: currentPlayerRank,
        xp: currentPlayerId ? (playerXp[currentPlayerId] || 0) : 0,
        canOptIn,
        canOptOut,
      },
      wantedList,
      hunterCount,
    });
  } catch (error) {
    console.error('Bounty Hunter status error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
