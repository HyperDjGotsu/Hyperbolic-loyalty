import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default avatar for anonymous players
const ANONYMOUS_AVATAR = {
  type: 'emoji',
  base: '❓',
  photoUrl: null,
  background: '#374151',
  frame: 'none',
  badge: null,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const game = searchParams.get('game');
    const storeId = searchParams.get('store_id');

    let leaderboard: any[] = [];

    if (!game || game === 'overall') {
      // Overall leaderboard - everyone appears
      let playersQuery = supabaseAdmin
        .from('players')
        .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_show_as_anonymous');
      if (storeId) {
        playersQuery = playersQuery.eq('home_store_id', storeId);
      }
      const { data: players, error } = await playersQuery.order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      const playerIds = players?.map(p => p.id) || [];
      
      const { data: xpData, error: xpError } = await supabaseAdmin
        .from('xp_ledger')
        .select('player_id, final_xp')
        .in('player_id', playerIds);

      if (xpError) {
        console.error('Error fetching XP:', xpError);
      }

      const xpByPlayer: Record<string, number> = {};
      xpData?.forEach(entry => {
        xpByPlayer[entry.player_id] = (xpByPlayer[entry.player_id] || 0) + (entry.final_xp || 0);
      });

      leaderboard = (players || [])
        .map(player => {
          const isAnonymous = player.privacy_show_as_anonymous === true;
          return {
            id: player.player_id,
            odid: player.id,
            name: isAnonymous ? 'Anonymous' : (player.display_name || 'Unknown'),
            totalXp: xpByPlayer[player.id] || 0,
            level: Math.floor((xpByPlayer[player.id] || 0) / 100) + 1,
            hidden: isAnonymous,
            avatar: isAnonymous ? ANONYMOUS_AVATAR : buildAvatar(player),
          };
        })
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    } else {
      // Game-specific leaderboard - everyone appears
      let gamePlayersQuery = supabaseAdmin
        .from('players')
        .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_show_as_anonymous');
      if (storeId) {
        gamePlayersQuery = gamePlayersQuery.eq('home_store_id', storeId);
      }
      const { data: players, error: playersError } = await gamePlayersQuery;

      if (playersError) {
        console.error('Error fetching players:', playersError);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      const playerIds = players?.map(p => p.id) || [];

      const { data: xpData, error: xpError } = await supabaseAdmin
        .from('xp_ledger')
        .select('player_id, final_xp')
        .in('player_id', playerIds)
        .eq('game_id', game);

      if (xpError) {
        console.error('Error fetching game XP:', xpError);
      }

      const xpByPlayer: Record<string, number> = {};
      xpData?.forEach(entry => {
        xpByPlayer[entry.player_id] = (xpByPlayer[entry.player_id] || 0) + (entry.final_xp || 0);
      });

      leaderboard = (players || [])
        .filter(player => xpByPlayer[player.id] > 0)
        .map(player => {
          const isAnonymous = player.privacy_show_as_anonymous === true;
          return {
            id: player.player_id,
            odid: player.id,
            name: isAnonymous ? 'Anonymous' : (player.display_name || 'Unknown'),
            totalXp: xpByPlayer[player.id] || 0,
            level: Math.floor((xpByPlayer[player.id] || 0) / 100) + 1,
            hidden: isAnonymous,
            avatar: isAnonymous ? ANONYMOUS_AVATAR : buildAvatar(player),
          };
        })
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildAvatar(player: any) {
  if (player.avatar_config) {
    const config = typeof player.avatar_config === 'string' 
      ? JSON.parse(player.avatar_config) 
      : player.avatar_config;
    return {
      type: config.photo_url ? 'photo' : 'emoji',
      base: config.base || '😎',
      photoUrl: config.photo_url || null,
      background: config.background || '#3b82f6',
      frame: config.frame || 'none',
      badge: config.badge || null,
    };
  }

  return {
    type: player.avatar_photo_url ? 'photo' : 'emoji',
    base: player.avatar_base || '😎',
    photoUrl: player.avatar_photo_url || null,
    background: player.avatar_background || '#3b82f6',
    frame: player.avatar_frame || 'none',
    badge: player.avatar_badge || null,
  };
}
