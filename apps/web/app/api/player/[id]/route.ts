import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const playerId = params.id?.toUpperCase();

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
  }

  try {
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_config, pass_tier, created_at')
      .eq('player_id', playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', player.id);

    const totalXP = xpData?.reduce((sum, row) => sum + (row.final_xp || 0), 0) || 0;

    const { data: gameXPRaw } = await supabaseAdmin
      .from('xp_ledger')
      .select('game_id, final_xp, source')
      .eq('player_id', player.id);

    const gameXPMap: Record<string, { game_id: string; game_xp: number; game_wins: number; game_events: number }> = {};
    gameXPRaw?.forEach(row => {
      if (!row.game_id) return;
      if (!gameXPMap[row.game_id]) {
        gameXPMap[row.game_id] = { game_id: row.game_id, game_xp: 0, game_wins: 0, game_events: 0 };
      }
      gameXPMap[row.game_id].game_xp += row.final_xp || 0;
      if (row.source === 'match_win') gameXPMap[row.game_id].game_wins++;
      if (row.source === 'event_attendance') gameXPMap[row.game_id].game_events++;
    });
    const gameXP = Object.values(gameXPMap);

    const { data: activity } = await supabaseAdmin
      .from('xp_ledger')
      .select(`
        id,
        base_xp,
        final_xp,
        source,
        description,
        created_at,
        game:games(name, slug, icon)
      `)
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const photoUrl = (player.avatar_config as Record<string, unknown> | null)?.photo_url as string | null ?? null;

    return NextResponse.json({
      id: player.id,
      player_id: player.player_id,
      displayName: player.display_name,
      avatar: {
        type: photoUrl ? 'photo' : 'emoji',
        emoji: player.avatar_base,
        photoUrl,
        background: player.avatar_background,
        frame: player.avatar_frame,
        badge: player.avatar_badge,
      },
      passTier: player.pass_tier,
      xp: totalXP,
      gameXP: gameXP || [],
      recentActivity: activity || [],
      createdAt: player.created_at,
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player data' },
      { status: 500 }
    );
  }
}
