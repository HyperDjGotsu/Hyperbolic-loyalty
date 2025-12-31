import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Look up player by clerk_user_id
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine (user hasn't linked yet)
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!player) {
      // User exists in Clerk but hasn't linked to a player yet
      return NextResponse.json({ 
        linked: false, 
        message: 'No player linked to this account' 
      });
    }

    // Fetch full player data using the existing endpoint logic
    const hypId = player.hyp_id;
    
    // Get game XP breakdown
    const { data: xpByGame } = await supabase
      .from('xp_ledger')
      .select('game, base_xp')
      .eq('player_id', player.id);

    // Aggregate XP by game
    const gameXpMap: Record<string, number> = {};
    let totalXp = 0;
    
    if (xpByGame) {
      xpByGame.forEach((entry: any) => {
        const game = entry.game || 'general';
        const xp = entry.base_xp || 0;
        gameXpMap[game] = (gameXpMap[game] || 0) + xp;
        totalXp += xp;
      });
    }

    const gameXP = Object.entries(gameXpMap).map(([game_id, game_xp]) => ({
      game_id,
      game_xp,
      game_wins: 0,
      game_events: 0,
    }));

    // Get recent activity
    const { data: activity } = await supabase
      .from('xp_ledger')
      .select('id, base_xp, final_xp, source, description, created_at, game')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      linked: true,
      id: player.id,
      hyp_id: player.hyp_id,
      displayName: player.display_name,
      realName: player.real_name,
      discord: player.discord,
      avatar: player.avatar || { emoji: '😎', background: '#3b82f6', frame: 'none', badge: null },
      passTier: player.pass_tier,
      xp: totalXp,
      gameXP,
      recentActivity: activity || [],
    });
  } catch (error) {
    console.error('Error in by-clerk route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
