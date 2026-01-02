import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const gameId = searchParams.get('game'); // Optional: filter by game

    // Get all XP entries, grouped by player
    let query = supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp, base_xp');

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data: xpEntries, error: xpError } = await query;

    if (xpError) {
      console.error('Error fetching XP:', xpError);
      return NextResponse.json({ error: 'Failed to fetch XP data' }, { status: 500 });
    }

    // Aggregate XP by player
    const playerXpMap: Record<string, number> = {};
    
    xpEntries?.forEach((entry: any) => {
      const playerId = entry.player_id;
      const xp = entry.final_xp || entry.base_xp || 0;
      
      if (!playerXpMap[playerId]) {
        playerXpMap[playerId] = 0;
      }
      playerXpMap[playerId] += xp;
    });

    // Get player IDs sorted by XP
    const sortedPlayerIds = Object.entries(playerXpMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedPlayerIds.length === 0) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Fetch player details for top players
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, privacy_show_on_leaderboard, privacy_show_as_anonymous')
      .in('id', sortedPlayerIds);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 });
    }

    // Build leaderboard with player info
    const leaderboard = sortedPlayerIds.map((playerId, index) => {
      const player = players?.find((p: any) => p.id === playerId);
      const totalXp = playerXpMap[playerId];

      // Respect privacy settings
      const showOnLeaderboard = player?.privacy_show_on_leaderboard !== false;
      const showAsAnonymous = player?.privacy_show_as_anonymous === true;

      if (!showOnLeaderboard) {
        return null; // Skip players who opted out
      }

      // Calculate level (simple formula: 1 level per 100 XP)
      const level = Math.floor(totalXp / 100) + 1;

      return {
        rank: index + 1,
        id: player?.player_id || 'Unknown',
        name: showAsAnonymous ? 'Anonymous' : (player?.display_name || 'Unknown'),
        level,
        totalXp,
        avatar: {
          type: 'emoji',
          base: showAsAnonymous ? '🎭' : (player?.avatar_base || '😎'),
          photoUrl: null,
          background: showAsAnonymous ? '#64748b' : (player?.avatar_background || '#3b82f6'),
          frame: showAsAnonymous ? 'none' : (player?.avatar_frame || 'none'),
          badge: showAsAnonymous ? null : (player?.avatar_badge || null),
        },
        hidden: showAsAnonymous,
      };
    }).filter(Boolean); // Remove null entries (opted-out players)

    // Re-rank after filtering
    const rerankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return NextResponse.json({ 
      leaderboard: rerankedLeaderboard,
      total: rerankedLeaderboard.length,
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
