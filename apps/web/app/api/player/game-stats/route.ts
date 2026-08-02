import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get player from Clerk ID
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get all games
    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, name, icon, xp_name')
      .order('name');

    if (gamesError) throw gamesError;

    // Get XP per game for this player
    const { data: xpData, error: xpError } = await supabase
      .from('xp_ledger')
      .select('game_id, final_xp')
      .eq('player_id', player.id);

    if (xpError) throw xpError;

    // Aggregate XP by game
    const xpByGame: Record<string, number> = {};
    for (const entry of xpData || []) {
      xpByGame[entry.game_id] = (xpByGame[entry.game_id] || 0) + entry.final_xp;
    }

    // Build response with game stats
    const gameStats = (games || []).map(game => ({
      gameId: game.id,
      name: game.name,
      icon: game.icon,
      xpName: game.xp_name,
      xp: xpByGame[game.id] || 0,
    }));

    return NextResponse.json({
      games: gameStats,
      totalXp: Object.values(xpByGame).reduce((sum, xp) => sum + xp, 0),
    });

  } catch (error) {
    console.error('Error in game-stats API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game stats' },
      { status: 500 }
    );
  }
}
