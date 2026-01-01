import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get the authenticated user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Look up player by clerk_user_id
    const { data: player, error } = await supabaseAdmin
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

    // Get XP breakdown by game - FIXED: use game_id not game
    const { data: xpByGame } = await supabaseAdmin
      .from('xp_ledger')
      .select('game_id, base_xp, final_xp, source')
      .eq('player_id', player.id);

    // Aggregate XP by game
    const gameXpMap: Record<string, { xp: number; wins: number; events: number }> = {};
    let totalXp = 0;
    
    if (xpByGame) {
      xpByGame.forEach((entry: any) => {
        const game = entry.game_id || 'general';
        const xp = entry.final_xp || entry.base_xp || 0;
        
        if (!gameXpMap[game]) {
          gameXpMap[game] = { xp: 0, wins: 0, events: 0 };
        }
        
        gameXpMap[game].xp += xp;
        totalXp += xp;
        
        // Count wins and events
        if (entry.source === 'match_win') {
          gameXpMap[game].wins += 1;
        }
        if (entry.source === 'event_attendance') {
          gameXpMap[game].events += 1;
        }
      });
    }

    const gameXP = Object.entries(gameXpMap).map(([game_id, data]) => ({
      game_id,
      game_xp: data.xp,
      total_xp: data.xp,
      game_wins: data.wins,
      game_events: data.events,
    }));

    // Get recent activity
    const { data: activity } = await supabaseAdmin
      .from('xp_ledger')
      .select('id, base_xp, final_xp, source, description, created_at, game_id')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build avatar object from separate columns - FIXED: not a JSON field
    const avatar = {
      emoji: player.avatar_base || '😎',
      base: player.avatar_base || '😎',
      background: player.avatar_background || '#3b82f6',
      frame: player.avatar_frame || 'none',
      badge: player.avatar_badge || null,
      type: player.avatar_type || 'emoji',
      photoUrl: player.avatar_photo_url || null,
    };

    return NextResponse.json({
      linked: true,
      id: player.id,
      hyp_id: player.player_id,  // FIXED: column is player_id, return as hyp_id for frontend
      displayName: player.display_name,
      realName: player.real_name,
      discord: player.discord_username,  // FIXED: column is discord_username
      email: player.email,
      phone: player.phone,
      avatar,
      passTier: player.pass_tier,
      passStatus: player.pass_status,
      xp: totalXp,
      gameXP,
      recentActivity: activity || [],
      // Additional profile fields
      primaryGameId: player.primary_game_id,
      isFoundingMember: player.is_founding_member,
      isShadowVip: player.is_shadow_vip,
      createdAt: player.created_at,
    });
  } catch (error) {
    console.error('Error in by-clerk route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
