import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const playerId = params.id?.toUpperCase();

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
  }

  try {
    // Get player by HYP ID
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get total XP directly from xp_ledger
    const { data: xpData, error: xpError } = await supabase
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', player.id);
    
    const totalXP = xpData?.reduce((sum, row) => sum + (row.final_xp || 0), 0) || 0;

    // Get game XP breakdown directly from xp_ledger
    const { data: gameXPRaw } = await supabase
      .from('xp_ledger')
      .select('game_id, final_xp, source')
      .eq('player_id', player.id);
    
    // Aggregate by game
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

    // Get recent activity
    const { data: activity } = await supabase
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

    return NextResponse.json({
      id: player.id,
      hyp_id: player.player_id,
      displayName: player.display_name,
      realName: player.real_name,
      discord: player.discord_username,
      avatar: {
        type: player.avatar_type,
        base: player.avatar_base,
        photoUrl: player.avatar_photo_url,
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
