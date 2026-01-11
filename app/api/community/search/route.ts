import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Search players
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    // Get current player to exclude from results
    const { data: currentPlayer } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    // Search by display_name or player_id
    const { data: players, error } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, privacy_profile_visibility, privacy_hide_from_search, privacy_allow_friend_requests')
      .or(`display_name.ilike.%${query}%,player_id.ilike.%${query}%`)
      .neq('id', currentPlayer?.id || '')
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Filter out players who hide from search
    const visiblePlayers = players?.filter((p: any) => !p.privacy_hide_from_search) || [];

    // Get XP for each player
    const playerIds = visiblePlayers.map((p: any) => p.id);
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp, base_xp')
      .in('player_id', playerIds);

    const xpMap: Record<string, number> = {};
    xpData?.forEach((entry: any) => {
      const xp = entry.final_xp || entry.base_xp || 0;
      if (!xpMap[entry.player_id]) xpMap[entry.player_id] = 0;
      xpMap[entry.player_id] += xp;
    });

    // Check existing friendships
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${currentPlayer?.id},addressee_id.eq.${currentPlayer?.id}`);

    const friendIds = new Set<string>();
    const pendingIds = new Set<string>();
    friendships?.forEach((f: any) => {
      const otherId = f.requester_id === currentPlayer?.id ? f.addressee_id : f.requester_id;
      if (f.status === 'accepted') friendIds.add(otherId);
      if (f.status === 'pending') pendingIds.add(otherId);
    });

    // Build results
    const results = visiblePlayers.map((player: any) => {
      const totalXp = xpMap[player.id] || 0;
      const level = Math.floor(totalXp / 100) + 1;
      const isPrivate = player.privacy_profile_visibility === 'private';
      const isFriendsOnly = player.privacy_profile_visibility === 'friends';
      const isFriend = friendIds.has(player.id);
      const isPending = pendingIds.has(player.id);

      return {
        id: player.player_id, // HYP-XXXXX format for display
        odid: player.id, // UUID for API calls
        name: player.display_name || 'Unknown',
        title: isPrivate ? '???' : `Level ${level}`,
        level: isPrivate ? null : level,
        totalXp: isPrivate ? null : totalXp,
        avatar: {
          type: 'emoji' as const,
          base: player.avatar_base || '😎',
          photoUrl: null,
          background: player.avatar_background || '#3b82f6',
          frame: player.avatar_frame || 'none',
          badge: player.avatar_badge || null,
        },
        privacy: {
          profileVisibility: player.privacy_profile_visibility || 'public',
        },
        allowFriendRequests: player.privacy_allow_friend_requests !== false,
        isFriend: isFriend || isPending, // Show checkmark if already friends or pending
        isOnline: null,
      };
    });

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
