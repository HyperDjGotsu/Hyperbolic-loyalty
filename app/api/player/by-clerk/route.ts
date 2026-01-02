import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// ============================================
// GAME CONFIGURATION
// ============================================

// Game currency names (what XP is called for each game)
const GAME_CURRENCIES: Record<string, string> = {
  one_piece: 'Berries',
  gundam: 'Pilot Points',
  pokemon: 'Pokepoints',
  mtg: 'Mana Marks',
  star_wars: 'Holopoints',
  star_wars_unlimited: 'Holopoints',
  vanguard: 'Ride Gauge',
  uvs: 'Versus Tokens',
  hololive: 'Fan Subs',
  riftbound: 'Essence',
  lorcana: 'Lorepoints',
  weiss: 'Climax Points',
  weiss_schwarz: 'Climax Points',
  sw_legion: 'Battle Orders',
  union_arena: 'Plot Armor',
  warhammer: 'War Honors',
  digimon: 'Digi-Points',
  yugioh: 'Star Chips',
};

// ============================================
// RANK CALCULATION FUNCTIONS
// ============================================

// One Piece uses higher thresholds (2x/week events)
// Thresholds: 0-199, 200-499, 500-999, 1000-1499, 1500-2499, 2500-3999, 4000+
function getOnePieceRank(xp: number): string {
  if (xp >= 4000) return 'Yonko Commander';
  if (xp >= 2500) return 'Warlord';
  if (xp >= 1500) return 'Worst Generation';
  if (xp >= 1000) return 'Notorious Pirate';
  if (xp >= 500) return 'Super Rookie';
  if (xp >= 200) return 'Paradise Pirate';
  return 'East Blue Rookie';
}

// Standard thresholds for 1x/week games
// Thresholds: 0-99, 100-249, 250-499, 500-999, 1000-1499, 1500-2499, 2500+
function getStandardRank(xp: number, ranks: string[]): string {
  if (xp >= 2500) return ranks[6];
  if (xp >= 1500) return ranks[5];
  if (xp >= 1000) return ranks[4];
  if (xp >= 500) return ranks[3];
  if (xp >= 250) return ranks[2];
  if (xp >= 100) return ranks[1];
  return ranks[0];
}

// Game-specific rank arrays [0-99, 100-249, 250-499, 500-999, 1000-1499, 1500-2499, 2500+]
const GAME_RANKS: Record<string, string[]> = {
  gundam: ['Cadet', 'Ensign', 'Lieutenant', 'Captain', 'Commander', 'Ace Pilot', 'Newtype'],
  pokemon: ['Pokemon Fan', 'Trainer', 'Ace Trainer', 'Gym Challenger', 'Gym Leader', 'Elite Four', 'Champion'],
  mtg: ['Apprentice', 'Mage', 'Wizard', 'Sorcerer', 'Archmage', 'Planeswalker', 'Oldwalker'],
  star_wars: ['Youngling', 'Padawan', 'Jedi Knight', 'Jedi Guardian', 'Jedi Master', 'Council Member', 'Grand Master'],
  star_wars_unlimited: ['Youngling', 'Padawan', 'Jedi Knight', 'Jedi Guardian', 'Jedi Master', 'Council Member', 'Grand Master'],
  vanguard: ['Stand Trigger', 'Rear Guard', 'Vanguard', 'Stride Bearer', 'G Unit', 'Zeroth Dragon', 'Deity'],
  uvs: ['Rookie', 'Challenger', 'Contender', 'Fighter', 'Warrior', 'Champion', 'Legend'],
  hololive: ['Lurker', 'Chatter', 'Regular', 'Subscriber', 'Member', 'Super Fan', 'Idol'],
  riftbound: ['Plastic', 'Wood Tier', 'Summoner', 'Iceborn', 'Aspect', 'Celestial', 'World Rune Master'],
  lorcana: ['Dreamer', 'Apprentice', 'Illumineer', 'Storykeeper', 'Loremaster', 'Grand Illumineer', 'Sorcerer'],
  weiss: ['Background NPC', 'Side Character', 'Rival', 'Main Character', 'Protagonist', 'Fan Favorite', 'Best Girl/Boy'],
  weiss_schwarz: ['Background NPC', 'Side Character', 'Rival', 'Main Character', 'Protagonist', 'Fan Favorite', 'Best Girl/Boy'],
  sw_legion: ['Raw Recruit', 'Soldier', 'Veteran', 'Officer', 'Commander', 'General', 'Supreme Commander'],
  union_arena: ['Fodder', 'Side Character', 'Supporting Cast', 'Main Character', 'Rival', 'Protagonist', 'Shonen Legend'],
  warhammer: ['Conscript', 'Guardsman', 'Veteran', 'Sergeant', 'Captain', 'Chapter Master', 'Warmaster'],
  digimon: ['Baby', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Ultra', 'DigiDestined'],
  yugioh: ['Amateur Duelist', 'Duelist', 'Battle City Qualifier', 'Regional Champion', 'National Champion', 'World Finalist', 'King of Games'],
};

function getRankForGame(gameId: string, xp: number): string {
  // One Piece has special high-frequency thresholds
  if (gameId === 'one_piece') {
    return getOnePieceRank(xp);
  }
  
  // Look up game-specific ranks
  const ranks = GAME_RANKS[gameId];
  if (ranks) {
    return getStandardRank(xp, ranks);
  }
  
  // Default fallback for unknown games
  return getStandardRank(xp, ['Newcomer', 'Regular', 'Veteran', 'Expert', 'Master', 'Elite', 'Legend']);
}

function getCurrencyForGame(gameId: string): string {
  return GAME_CURRENCIES[gameId] || 'XP';
}

// ============================================
// API ROUTE
// ============================================

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
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!player) {
      return NextResponse.json({ 
        linked: false, 
        message: 'No player linked to this account' 
      });
    }

    // Get XP breakdown by game
    const { data: xpByGame, error: xpError } = await supabaseAdmin
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
        
        if (entry.source === 'match_win') {
          gameXpMap[game].wins += 1;
        }
        if (entry.source === 'event_attendance') {
          gameXpMap[game].events += 1;
        }
      });
    }

    // Build gameXP array WITH RANKS AND CURRENCY NAMES
    const gameXP = Object.entries(gameXpMap).map(([game_id, data]) => ({
      game_id,
      game_xp: data.xp,
      total_xp: data.xp,
      game_wins: data.wins,
      game_events: data.events,
      rank: getRankForGame(game_id, data.xp),
      xpName: getCurrencyForGame(game_id),
    }));

    // Get recent activity
    const { data: activity } = await supabaseAdmin
      .from('xp_ledger')
      .select('id, base_xp, final_xp, source, description, created_at, game_id')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build avatar object from separate columns
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
      hyp_id: player.player_id,
      displayName: player.display_name,
      realName: player.real_name,
      discord: player.discord_username,
      email: player.email,
      phone: player.phone,
      avatar,
      passTier: player.pass_tier,
      passStatus: player.pass_status,
      xp: totalXp,
      gameXP,
      recentActivity: activity || [],
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
