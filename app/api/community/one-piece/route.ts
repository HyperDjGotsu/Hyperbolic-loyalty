import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper to parse avatar config
function parseAvatar(avatarConfig: any) {
  if (!avatarConfig) {
    return {
      type: 'emoji' as const,
      base: '😎',
      photoUrl: null,
      background: '#3b82f6',
      frame: 'none',
      badge: null,
    };
  }
  return {
    type: avatarConfig.photo_url ? 'photo' as const : 'emoji' as const,
    base: avatarConfig.base || '😎',
    photoUrl: avatarConfig.photo_url || null,
    background: avatarConfig.background || '#3b82f6',
    frame: avatarConfig.frame || 'none',
    badge: avatarConfig.badge || null,
  };
}

// Get current month boundaries (Pacific Time)
function getCurrentMonthBoundaries() {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth();
  
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const startOfNextMonth = new Date(year, month + 1, 1, 0, 0, 0, 0);
  
  return {
    start: startOfMonth.toISOString(),
    end: startOfNextMonth.toISOString(),
    monthName: pacificNow.toLocaleString('en-US', { month: 'long' }),
    year: year,
  };
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    // Get current player info if logged in
    let currentPlayerId: string | null = null;
    let currentPlayerRank: number | null = null;
    
    if (userId) {
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();
      
      if (player) {
        currentPlayerId = player.id;
      }
    }

    const { start: monthStart, end: monthEnd, monthName, year } = getCurrentMonthBoundaries();

    // Get One Piece leaderboard (top 10 for WANTED list)
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp')
      .eq('game_id', 'one_piece');

    // Aggregate XP by player
    const playerXp: Record<string, number> = {};
    xpData?.forEach(entry => {
      if (entry.player_id) {
        playerXp[entry.player_id] = (playerXp[entry.player_id] || 0) + (entry.final_xp || 0);
      }
    });

    // Sort and get top players
    const sortedPlayers = Object.entries(playerXp)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Get player details for top 10
    const topPlayerIds = sortedPlayers.map(([id]) => id);
    const { data: playerDetails } = await supabaseAdmin
      .from('players')
      .select('id, display_name, avatar_config, privacy_show_as_anonymous')
      .in('id', topPlayerIds);

    const playerMap: Record<string, any> = {};
    playerDetails?.forEach(p => {
      playerMap[p.id] = p;
    });

    // Build leaderboard with WANTED status
    const leaderboard = sortedPlayers.map(([playerId, xp], index) => {
      const player = playerMap[playerId];
      const isAnonymous = player?.privacy_show_as_anonymous || false;
      
      // Check if this is the current player
      if (playerId === currentPlayerId) {
        currentPlayerRank = index + 1;
      }
      
      return {
        rank: index + 1,
        id: playerId,
        name: isAnonymous ? 'Anonymous' : (player?.display_name || 'Unknown'),
        avatar: isAnonymous ? {
          type: 'emoji' as const,
          base: '❓',
          photoUrl: null,
          background: '#64748b',
          frame: 'none',
          badge: null,
        } : parseAvatar(player?.avatar_config),
        xp: xp,
        isWanted: index < 5, // Top 5 are WANTED
        hidden: isAnonymous,
      };
    });

    // Get monthly XP for Emperor calculation
    const { data: monthlyXpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp')
      .eq('game_id', 'one_piece')
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd);

    // Aggregate monthly XP
    const monthlyPlayerXp: Record<string, number> = {};
    monthlyXpData?.forEach(entry => {
      if (entry.player_id) {
        monthlyPlayerXp[entry.player_id] = (monthlyPlayerXp[entry.player_id] || 0) + (entry.final_xp || 0);
      }
    });

    // Get current month leader (Emperor)
    const monthlyLeader = Object.entries(monthlyPlayerXp)
      .sort(([, a], [, b]) => b - a)[0];

    let currentEmperor = null;
    if (monthlyLeader) {
      const [emperorId, emperorXp] = monthlyLeader;
      const emperorPlayer = playerMap[emperorId];
      
      // If not in top 10, fetch their details
      let emperorDetails = emperorPlayer;
      if (!emperorDetails) {
        const { data: fetchedEmperor } = await supabaseAdmin
          .from('players')
          .select('id, display_name, avatar_config, privacy_show_as_anonymous')
          .eq('id', emperorId)
          .single();
        emperorDetails = fetchedEmperor;
      }
      
      const isAnonymous = emperorDetails?.privacy_show_as_anonymous || false;
      
      currentEmperor = {
        id: emperorId,
        name: isAnonymous ? 'Anonymous' : (emperorDetails?.display_name || 'Unknown'),
        avatar: isAnonymous ? {
          type: 'emoji' as const,
          base: '❓',
          photoUrl: null,
          background: '#64748b',
          frame: 'none',
          badge: null,
        } : parseAvatar(emperorDetails?.avatar_config),
        xp: emperorXp,
        month: monthName,
        year: year,
      };
    }

    // Get Hall of Fame (past crowned emperors)
    const { data: hallOfFameData } = await supabaseAdmin
      .from('emperors')
      .select('*, players!emperors_player_id_fkey(display_name, avatar_config, privacy_show_as_anonymous)')
      .order('crowned_at', { ascending: false })
      .limit(5);

    const hallOfFame = (hallOfFameData || []).map((emperor: any) => {
      const isAnonymous = emperor.players?.privacy_show_as_anonymous || false;
      const crownedDate = new Date(emperor.crowned_at);
      
      return {
        id: emperor.id,
        playerId: emperor.player_id,
        name: isAnonymous ? 'Anonymous' : (emperor.players?.display_name || 'Unknown'),
        avatar: isAnonymous ? {
          type: 'emoji' as const,
          base: '❓',
          photoUrl: null,
          background: '#64748b',
          frame: 'none',
          badge: null,
        } : parseAvatar(emperor.players?.avatar_config),
        xp: emperor.monthly_xp || 0,
        month: crownedDate.toLocaleString('en-US', { month: 'long' }),
        year: crownedDate.getFullYear(),
        bountyTitle: emperor.bounty_title,
      };
    });

    // Determine current player's bounty hunter status
    let bountyHunterStatus = null;
    if (currentPlayerId) {
      const isWanted = currentPlayerRank !== null && currentPlayerRank <= 5;
      
      // TODO: Check if player has opted in as hunter (needs bounty_hunters table)
      const isHunter = false; // Placeholder until we build opt-in system
      
      bountyHunterStatus = {
        isWanted,
        isHunter,
        rank: currentPlayerRank,
        xp: playerXp[currentPlayerId] || 0,
        optInOpen: true, // TODO: Check event schedule
        nextEventDate: null, // TODO: Get from events
      };
    }

    return NextResponse.json({
      leaderboard,
      currentEmperor,
      hallOfFame,
      bountyHunterStatus,
      currentMonth: monthName,
      currentYear: year,
    });
  } catch (error) {
    console.error('One Piece data error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
