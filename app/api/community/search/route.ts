import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    // Get current player to exclude from results and check friendships
    const { data: currentPlayer } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    // Search players by display_name or player_id (HYP-XXXXX)
    // Only include players who haven't hidden themselves from search
    const { data: players, error } = await supabaseAdmin
      .from('players')
      .select(`
        id,
        player_id,
        display_name,
        avatar_base,
        avatar_background,
        avatar_frame,
        avatar_badge,
        privacy_profile_visibility,
        privacy_hide_from_search,
        privacy_allow_friend_requests
      `)
      .or(`display_name.ilike.%${query}%,player_id.ilike.%${query}%`)
      .neq('privacy_hide_from_search', true)
      .limit(limit);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Filter out current player and calculate XP for each player
    const filteredPlayers = players?.filter((p: any) => p.id !== currentPlayer?.id) || [];

    // Get XP totals for found players
    const playerIds = filteredPlayers.map((p: any) => p.id);
    
    let xpMap: Record<string, number> = {};
    if (playerIds.length > 0) {
      const { data: xpData } = await supabaseAdmin
        .from('xp_ledger')
        .select('player_id, final_xp, base_xp')
        .in('player_id', playerIds);

      xpData?.forEach((entry: any) => {
        const xp = entry.final_xp || entry.base_xp || 0;
        if (!xpMap[entry.player_id]) {
          xpMap[entry.player_id] = 0;
        }
        xpMap[entry.player_id] += xp;
      });
    }

    // Build results respecting privacy
    const results = filteredPlayers.map((player: any) => {
      const totalXp = xpMap[player.id] || 0;
      const level = Math.floor(totalXp / 100) + 1;
      const isPrivate = player.privacy_profile_visibility === 'private';
      const isFriendsOnly = player.privacy_profile_visibility === 'friends';

      return {
        id: player.player_id,
        name: player.display_name || 'Unknown',
        title: isPrivate ? '???' : (isFriendsOnly ? 'Friends Only' : `Level ${level}`),
        level: isPrivate ? null : level,
        totalXp: isPrivate ? null : totalXp,
        avatar: {
          type: 'emoji',
          base: isPrivate ? '🔒' : (player.avatar_base || '😎'),
          photoUrl: null,
          background: isPrivate ? '#1e293b' : (player.avatar_background || '#3b82f6'),
          frame: isPrivate ? 'none' : (player.avatar_frame || 'none'),
          badge: isPrivate ? null : player.avatar_badge,
        },
        privacy: {
          profileVisibility: player.privacy_profile_visibility || 'public',
        },
        allowFriendRequests: player.privacy_allow_friend_requests !== false,
        isFriend: false, // TODO: Check friendships table once it exists
        isOnline: null, // TODO: Implement online status
      };
    });

    return NextResponse.json({ 
      results,
      total: results.length,
      query,
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
