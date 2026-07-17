import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ANONYMOUS_AVATAR = {
  type: 'emoji',
  base: '❓',
  photoUrl: null,
  background: '#374151',
  frame: 'none',
  badge: null,
};

// Params:
//   game      — omit or 'overall' for all games; game_id for a specific game
//   period    — 'lifetime' (default) | 'season'
//   store_id  — omit for network-wide; uuid for store-seasonal leaderboard
//               (filters xp_ledger.store_id, NOT players.home_store_id)
//   limit     — default 50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const game   = searchParams.get('game');
    const period = searchParams.get('period') || 'lifetime';
    const storeId = searchParams.get('store_id');

    // ── Season bounds ────────────────────────────────────────────────────────
    let seasonStart: string | null = null;
    let seasonEnd:   string | null = null;

    if (period === 'season') {
      const { data: season } = await supabaseAdmin
        .from('seasons')
        .select('starts_at, ends_at')
        .eq('status', 'active')
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!season) {
        // No active season — return empty rather than falling back to lifetime
        return NextResponse.json({ leaderboard: [], period, noActiveSeason: true });
      }
      seasonStart = season.starts_at;
      seasonEnd   = season.ends_at;
    }

    // ── Build XP query ───────────────────────────────────────────────────────
    // Store seasonal: aggregate xp_ledger by store_id and season dates.
    // The competitive rank is based on XP *earned at that store*, regardless
    // of where the player's home store is set.
    let xpQuery = supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp');

    if (storeId) {
      xpQuery = xpQuery.eq('store_id', storeId);
    }
    if (seasonStart) {
      xpQuery = xpQuery.gte('created_at', seasonStart);
    }
    if (seasonEnd) {
      xpQuery = xpQuery.lt('created_at', seasonEnd);
    }
    if (game && game !== 'overall') {
      xpQuery = xpQuery.eq('game_id', game);
    }

    const { data: xpData, error: xpError } = await xpQuery;
    if (xpError) {
      console.error('Leaderboard XP error:', xpError);
      return NextResponse.json({ error: 'Failed to fetch XP data' }, { status: 500 });
    }

    // Aggregate per player
    const xpByPlayer: Record<string, number> = {};
    for (const entry of xpData ?? []) {
      xpByPlayer[entry.player_id] = (xpByPlayer[entry.player_id] || 0) + (entry.final_xp || 0);
    }

    const rankedPlayerIds = Object.entries(xpByPlayer)
      .filter(([, xp]) => xp > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (rankedPlayerIds.length === 0) {
      return NextResponse.json({ leaderboard: [], period, storeId });
    }

    // ── Fetch player display data for ranked players ──────────────────────────
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_show_as_anonymous')
      .in('id', rankedPlayerIds);

    if (playersError) {
      console.error('Leaderboard players error:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    const playerMap: Record<string, (typeof players)[0]> = {};
    for (const p of players ?? []) playerMap[p.id] = p;

    const leaderboard = rankedPlayerIds
      .map((playerId, index) => {
        const player = playerMap[playerId];
        if (!player) return null;
        const isAnonymous = player.privacy_show_as_anonymous === true;
        return {
          rank: index + 1,
          id: player.player_id,
          odid: player.id,
          name: isAnonymous ? 'Anonymous' : (player.display_name || 'Unknown'),
          totalXp: xpByPlayer[playerId] || 0,
          level: Math.floor((xpByPlayer[playerId] || 0) / 100) + 1,
          hidden: isAnonymous,
          avatar: isAnonymous ? ANONYMOUS_AVATAR : buildAvatar(player),
        };
      })
      .filter(Boolean);

    return NextResponse.json({ leaderboard, period, storeId: storeId ?? null });
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
