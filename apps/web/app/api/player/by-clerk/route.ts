import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

// Pirate's Life / Hyperlife configuration
// One Piece: 6 events (2x/week = ~8 events/month)
// All others: 3 events (1x/week = ~4 events/month)
const MONTHLY_ATTENDANCE_THRESHOLD: Record<string, number> = {
  one_piece: 6,
};
const DEFAULT_ATTENDANCE_THRESHOLD = 3;

const MONTHLY_BONUS_XP = 30;

// ============================================
// RANK CALCULATION FUNCTIONS
// ============================================

// One Piece uses higher thresholds (2x/week events)
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
function getStandardRank(xp: number, ranks: string[]): string {
  if (xp >= 2500) return ranks[6];
  if (xp >= 1500) return ranks[5];
  if (xp >= 1000) return ranks[4];
  if (xp >= 500) return ranks[3];
  if (xp >= 250) return ranks[2];
  if (xp >= 100) return ranks[1];
  return ranks[0];
}

// Game-specific rank arrays
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
  if (gameId === 'one_piece') {
    return getOnePieceRank(xp);
  }
  
  const ranks = GAME_RANKS[gameId];
  if (ranks) {
    return getStandardRank(xp, ranks);
  }
  
  return getStandardRank(xp, ['Newcomer', 'Regular', 'Veteran', 'Expert', 'Master', 'Elite', 'Legend']);
}

function getCurrencyForGame(gameId: string): string {
  return GAME_CURRENCIES[gameId] || 'XP';
}

// ============================================
// AVATAR HELPER
// ============================================

interface AvatarConfig {
  base: string;
  background: string;
  frame: string;
  badge: string | null;
  photo_url: string | null;
  previous_photo_url?: string | null;
}

const defaultAvatarConfig: AvatarConfig = {
  base: '😎',
  background: '#3b82f6',
  frame: 'none',
  badge: null,
  photo_url: null,
  previous_photo_url: null,
};

function parseAvatarConfig(avatarConfig: unknown): AvatarConfig {
  if (avatarConfig && typeof avatarConfig === 'object' && !Array.isArray(avatarConfig)) {
    const config = avatarConfig as Record<string, unknown>;
    return {
      base: typeof config.base === 'string' ? config.base : defaultAvatarConfig.base,
      background: typeof config.background === 'string' ? config.background : defaultAvatarConfig.background,
      frame: typeof config.frame === 'string' ? config.frame : defaultAvatarConfig.frame,
      badge: typeof config.badge === 'string' ? config.badge : null,
      photo_url: typeof config.photo_url === 'string' ? config.photo_url : null,
      previous_photo_url: typeof config.previous_photo_url === 'string' ? config.previous_photo_url : null,
    };
  }
  return defaultAvatarConfig;
}

// ============================================
// HELPER: Get current month boundaries (Pacific Time)
// ============================================
function getCurrentMonthBoundaries(): { start: string; end: string; monthKey: string } {
  // Use Pacific timezone for consistency with store
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth();
  
  // Start of current month (midnight Pacific)
  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  // Start of next month
  const startOfNextMonth = new Date(year, month + 1, 1, 0, 0, 0, 0);
  
  // Convert to ISO strings for Supabase query
  const start = startOfMonth.toISOString();
  const end = startOfNextMonth.toISOString();
  
  // Month key for tracking (e.g., "2026-01")
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  
  return { start, end, monthKey };
}

// ============================================
// API ROUTE
// ============================================

export async function GET() {
  try {
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

    // Look up home store details
    let homeStore: { id: string; name: string; city: string | null; slug: string | null; is_flagship: boolean; color: string | null } | null = null;
    if (player.home_store_id) {
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('id, name, city, slug, is_flagship, color')
        .eq('id', player.home_store_id)
        .single();
      homeStore = store ?? null;
    }

    // Get current month boundaries for attendance tracking
    const { start: monthStart, end: monthEnd, monthKey } = getCurrentMonthBoundaries();

    // Get XP breakdown by game
    const { data: xpByGame } = await supabaseAdmin
      .from('xp_ledger')
      .select('game_id, base_xp, final_xp, source, description, created_at')
      .eq('player_id', player.id);

    // Aggregate XP by game AND track monthly attendance
    const gameXpMap: Record<string, { xp: number; wins: number; events: number; monthlyAttendance: number; earnedMonthlyBonus: boolean }> = {};
    let totalXp = 0;
    
    if (xpByGame) {
      xpByGame.forEach((entry: any) => {
        const game = entry.game_id || 'general';
        const xp = entry.final_xp || entry.base_xp || 0;
        const createdAt = entry.created_at;
        const description = entry.description || '';
        
        if (!gameXpMap[game]) {
          gameXpMap[game] = { xp: 0, wins: 0, events: 0, monthlyAttendance: 0, earnedMonthlyBonus: false };
        }
        
        gameXpMap[game].xp += xp;
        totalXp += xp;
        
        if (entry.source === 'match_win') {
          gameXpMap[game].wins += 1;
        }
        if (entry.source === 'event_attendance') {
          gameXpMap[game].events += 1;
        }
        
        // Track monthly attendance (entries with "Attended" in description this month)
        if (createdAt >= monthStart && createdAt < monthEnd) {
          // Check if this is an attendance entry
          if (description.includes('Attended') || entry.source === 'event_attendance') {
            gameXpMap[game].monthlyAttendance += 1;
          }
          // Check if they already earned the monthly bonus
          if (description.includes("Pirate's Life") || description.includes('Hyperlife')) {
            gameXpMap[game].earnedMonthlyBonus = true;
          }
        }
      });
    }

    // Build gameXP array WITH RANKS, CURRENCY NAMES, AND MONTHLY PROGRESS
    const gameXP = Object.entries(gameXpMap).map(([game_id, data]) => {
      const threshold = MONTHLY_ATTENDANCE_THRESHOLD[game_id] || DEFAULT_ATTENDANCE_THRESHOLD;
      const achievementName = game_id === 'one_piece' ? "Pirate's Life" : 'Hyperlife';
      
      return {
        game_id,
        game_xp: data.xp,
        total_xp: data.xp,
        game_wins: data.wins,
        game_events: data.events,
        rank: getRankForGame(game_id, data.xp),
        xpName: getCurrencyForGame(game_id),
        // Monthly attendance tracking
        monthlyAttendance: data.monthlyAttendance,
        monthlyThreshold: threshold,
        monthlyBonus: MONTHLY_BONUS_XP,
        earnedMonthlyBonus: data.earnedMonthlyBonus,
        achievementName,
        monthKey,
      };
    });

    // Get recent activity with store attribution
    const [{ data: activity }, { data: storeList }] = await Promise.all([
      supabaseAdmin
        .from('xp_ledger')
        .select('id, base_xp, final_xp, source, description, created_at, game_id, store_id')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('stores')
        .select('id, short_id'),
    ]);
    const storeShortIds: Record<string, string> = {};
    for (const s of storeList ?? []) {
      if (s.id && s.short_id) storeShortIds[s.id] = s.short_id;
    }
    const activityWithStore = (activity ?? []).map(a => ({
      ...a,
      store_short_id: a.store_id ? (storeShortIds[a.store_id] ?? null) : null,
    }));

    // Get live point balance from ledger (network-wide, source of truth)
    const { data: balanceData } = await supabaseAdmin
      .rpc('get_user_point_balance', { p_player_id: player.id, p_store_id: null as unknown as string });
    const liveGems = typeof balanceData === 'number' ? balanceData : (player.gems || 0);

    // Parse avatar
    const avatarConfig = parseAvatarConfig(player.avatar_config);
    
    const avatar = {
      type: avatarConfig.photo_url ? 'photo' : 'emoji',
      base: avatarConfig.base,
      background: avatarConfig.background,
      frame: avatarConfig.frame,
      badge: avatarConfig.badge,
      photoUrl: avatarConfig.photo_url,
      photo_url: avatarConfig.photo_url,
    };

    return NextResponse.json({
      linked: true,
      id: player.id,
      player_id: player.player_id,
      displayName: player.display_name,
      realName: player.real_name,
      discord: player.discord_username,
      email: player.email,
      phone: player.phone,
      avatar,
      avatarConfig,
      passTier: player.pass_tier,
      passStatus: player.pass_status,
      passExpiresAt: player.pass_expires_at,
      passStartedAt: player.pass_started_at,
      xp: totalXp,
      gems: liveGems,
      gameXP,
      recentActivity: activityWithStore,
      primaryGameId: player.primary_game_id,
      isStaff: player.is_staff,
      isFoundingMember: player.is_founding_member,
      isShadowVip: player.is_shadow_vip,
      createdAt: player.created_at,
      homeStoreId: player.home_store_id,
      homeStore,
      // Include current month info for display
      currentMonth: monthKey,
    });
  } catch (error) {
    console.error('Error in by-clerk route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
