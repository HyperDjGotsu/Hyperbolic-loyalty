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

    // Get game XP breakdown from xp_ledger
    const { data: xpByGame } = await supabase
      .from('xp_ledger')
      .select('game_id, base_xp, final_xp, source')
      .eq('player_id', player.id);

    // Aggregate XP by game
    const gameXpMap: Record<string, { game_xp: number; game_wins: number; game_events: number }> = {};
    let totalXp = 0;
    
    if (xpByGame) {
      xpByGame.forEach((entry: any) => {
        const gameId = entry.game_id || 'general';
        const xp = entry.final_xp || entry.base_xp || 0;
        
        if (!gameXpMap[gameId]) {
          gameXpMap[gameId] = { game_xp: 0, game_wins: 0, game_events: 0 };
        }
        gameXpMap[gameId].game_xp += xp;
        if (entry.source === 'match_win') gameXpMap[gameId].game_wins++;
        if (entry.source === 'event_attendance') gameXpMap[gameId].game_events++;
        totalXp += xp;
      });
    }

    const gameXP = Object.entries(gameXpMap).map(([game_id, data]) => ({
      game_id,
      ...data,
    }));

    // Get recent activity
    const { data: activity } = await supabase
      .from('xp_ledger')
      .select('id, base_xp, final_xp, source, description, created_at, game_id')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      linked: true,
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
      xp: totalXp,
      gameXP,
      recentActivity: activity || [],
    });
  } catch (error) {
    console.error('Error in by-clerk route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
