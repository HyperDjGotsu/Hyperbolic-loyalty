import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const game = searchParams.get('game'); // null = overall, or game slug like 'one_piece'

    let leaderboard: any[] = [];

    if (!game || game === 'overall') {
      // Overall leaderboard - sum all XP across games
      const { data: players, error } = await supabaseAdmin
        .from('players')
        .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_show_on_leaderboard, privacy_show_as_anonymous')
        .eq('privacy_show_on_leaderboard', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      // Get XP totals for each player
      const playerIds = players?.map(p => p.id) || [];
      
      const { data: xpData, error: xpError } = await supabaseAdmin
        .from('xp_ledger')
        .select('player_id, points')
        .in('player_id', playerIds);

      if (xpError) {
        console.error('Error fetching XP:', xpError);
      }

      // Sum XP per player
      const xpByPlayer: Record<string, number> = {};
      xpData?.forEach(entry => {
        xpByPlayer[entry.player_id] = (xpByPlayer[entry.player_id] || 0) + entry.points;
      });

      // Build leaderboard
      leaderboard = (players || [])
        .map(player => ({
          id: player.player_id,
          odid: player.id,
          name: player.display_name || 'Unknown',
          totalXp: xpByPlayer[player.id] || 0,
          level: Math.floor((xpByPlayer[player.id] || 0) / 100) + 1,
          hidden: player.privacy_show_as_anonymous,
          avatar: buildAvatar(player),
        }))
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

    } else {
      // Game-specific leaderboard
      const { data: gameData, error: gameError } = await supabaseAdmin
        .from('games')
        .select('id')
        .eq('slug', game)
        .single();

      if (gameError || !gameData) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }

      const gameId = gameData.id;

      // Get players who show on leaderboard
      const { data: players, error: playersError } = await supabaseAdmin
        .from('players')
        .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_show_on_leaderboard, privacy_show_as_anonymous')
        .eq('privacy_show_on_leaderboard', true);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
      }

      const playerIds = players?.map(p => p.id) || [];

      // Get XP for this specific game
      const { data: xpData, error: xpError } = await supabaseAdmin
        .from('xp_ledger')
        .select('player_id, points')
        .in('player_id', playerIds)
        .eq('game_id', gameId);

      if (xpError) {
        console.error('Error fetching game XP:', xpError);
      }

      // Sum XP per player for this game
      const xpByPlayer: Record<string, number> = {};
      xpData?.forEach(entry => {
        xpByPlayer[entry.player_id] = (xpByPlayer[entry.player_id] || 0) + entry.points;
      });

      // Build leaderboard - only include players with XP in this game
      leaderboard = (players || [])
        .filter(player => xpByPlayer[player.id] > 0)
        .map(player => ({
          id: player.player_id,
          odid: player.id,
          name: player.display_name || 'Unknown',
          totalXp: xpByPlayer[player.id] || 0,
          level: Math.floor((xpByPlayer[player.id] || 0) / 100) + 1,
          hidden: player.privacy_show_as_anonymous,
          avatar: buildAvatar(player),
        }))
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
  // Check for avatar_config JSON first
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

  // Fallback to individual columns
  return {
    type: player.avatar_photo_url ? 'photo' : 'emoji',
    base: player.avatar_base || '😎',
    photoUrl: player.avatar_photo_url || null,
    background: player.avatar_background || '#3b82f6',
    frame: player.avatar_frame || 'none',
    badge: player.avatar_badge || null,
  };
}
