import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// One Piece rank thresholds (high frequency)
const ONE_PIECE_RANKS = [
  { min: 0, title: 'East Blue Rookie', bounty: '฿3,000,000' },
  { min: 200, title: 'Paradise Pirate', bounty: '฿30,000,000' },
  { min: 500, title: 'Super Rookie', bounty: '฿100,000,000' },
  { min: 1000, title: 'Notorious Pirate', bounty: '฿300,000,000' },
  { min: 1500, title: 'Worst Generation', bounty: '฿500,000,000' },
  { min: 2500, title: 'Warlord', bounty: '฿1,000,000,000' },
  { min: 4000, title: 'Yonko Commander', bounty: '฿3,000,000,000' },
];

// Standard game rank thresholds
const STANDARD_RANKS = [
  { min: 0, tier: 1 },
  { min: 100, tier: 2 },
  { min: 250, tier: 3 },
  { min: 500, tier: 4 },
  { min: 1000, tier: 5 },
  { min: 1500, tier: 6 },
  { min: 2500, tier: 7 },
];

// Game-specific rank names
const GAME_RANK_NAMES: Record<string, string[]> = {
  gundam: ['Cadet', 'Ensign', 'Lieutenant', 'Captain', 'Commander', 'Ace Pilot', 'Newtype'],
  pokemon: ['Pokemon Fan', 'Trainer', 'Ace Trainer', 'Gym Challenger', 'Gym Leader', 'Elite Four', 'Champion'],
  mtg: ['Apprentice', 'Mage', 'Wizard', 'Sorcerer', 'Archmage', 'Planeswalker', 'Oldwalker'],
  star_wars_unlimited: ['Youngling', 'Padawan', 'Jedi Knight', 'Jedi Guardian', 'Jedi Master', 'Council Member', 'Grand Master'],
  vanguard: ['Stand Trigger', 'Rear Guard', 'Vanguard', 'Stride Bearer', 'G Unit', 'Zeroth Dragon', 'Deity'],
  uvs: ['Rookie', 'Challenger', 'Contender', 'Fighter', 'Warrior', 'Champion', 'Legend'],
  hololive: ['Lurker', 'Chatter', 'Regular', 'Subscriber', 'Member', 'Super Fan', 'Idol'],
  riftbound: ['Plastic', 'Wood Tier', 'Summoner', 'Iceborn', 'Aspect', 'Celestial', 'World Rune Master'],
  lorcana: ['Dreamer', 'Apprentice', 'Illumineer', 'Storykeeper', 'Loremaster', 'Grand Illumineer', 'Sorcerer'],
  weiss_schwarz: ['Background NPC', 'Side Character', 'Rival', 'Main Character', 'Protagonist', 'Fan Favorite', 'Best Girl/Boy'],
  sw_legion: ['Raw Recruit', 'Soldier', 'Veteran', 'Officer', 'Commander', 'General', 'Supreme Commander'],
  union_arena: ['Fodder', 'Side Character', 'Supporting Cast', 'Main Character', 'Rival', 'Protagonist', 'Shonen Legend'],
  warhammer: ['Conscript', 'Guardsman', 'Veteran', 'Sergeant', 'Captain', 'Chapter Master', 'Warmaster'],
  digimon: ['Baby', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Ultra', 'DigiDestined'],
  yugioh: ['Amateur Duelist', 'Duelist', 'Battle City Qualifier', 'Regional Champion', 'National Champion', 'World Finalist', 'King of Games'],
};

function getRank(gameId: string, xp: number): string {
  if (gameId === 'one_piece') {
    for (let i = ONE_PIECE_RANKS.length - 1; i >= 0; i--) {
      if (xp >= ONE_PIECE_RANKS[i].min) {
        return ONE_PIECE_RANKS[i].title;
      }
    }
    return ONE_PIECE_RANKS[0].title;
  }

  // Standard games
  let tierIndex = 0;
  for (let i = STANDARD_RANKS.length - 1; i >= 0; i--) {
    if (xp >= STANDARD_RANKS[i].min) {
      tierIndex = i;
      break;
    }
  }

  const gameRanks = GAME_RANK_NAMES[gameId];
  if (gameRanks && gameRanks[tierIndex]) {
    return gameRanks[tierIndex];
  }
  
  return `Tier ${tierIndex + 1}`;
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff
    const { data: staffCheck } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staffCheck?.is_staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    // Search by player_id or display_name - now includes favorite_games
    let playerQuery = supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, email, is_staff, created_at, favorite_games');

    if (query.toUpperCase().startsWith('HYP-')) {
      playerQuery = playerQuery.ilike('player_id', `%${query}%`);
    } else {
      playerQuery = playerQuery.ilike('display_name', `%${query}%`);
    }

    const { data: players, error: playerError } = await playerQuery.limit(1).single();

    if (playerError || !players) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get games list
    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, name, icon, currency_name');

    const gameMap: Record<string, { name: string; icon: string; xp_name: string }> = {};
    games?.forEach(g => {
      gameMap[g.id] = { name: g.name, icon: g.icon || '🎮', xp_name: g.currency_name || 'XP' };
    });

    // Get XP by game using materialized view or direct query
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('game_id, final_xp')
      .eq('player_id', players.id);

    // Aggregate XP by game
    const xpByGame: Record<string, number> = {};
    let totalXp = 0;
    
    xpData?.forEach(entry => {
      if (entry.game_id) {
        xpByGame[entry.game_id] = (xpByGame[entry.game_id] || 0) + (entry.final_xp || 0);
        totalXp += entry.final_xp || 0;
      }
    });

    // Build game XP array
    const gameXp = Object.entries(xpByGame).map(([gameId, xp]) => ({
      game_id: gameId,
      game_name: gameMap[gameId]?.name || gameId,
      icon: gameMap[gameId]?.icon || '🎮',
      xp: xp,
      rank: getRank(gameId, xp),
      xp_name: gameMap[gameId]?.xp_name || 'XP',
    })).sort((a, b) => b.xp - a.xp);

    // Get recent activity
    const { data: recentActivity } = await supabaseAdmin
      .from('xp_ledger')
      .select('id, game_id, final_xp, description, created_at')
      .eq('player_id', players.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      player: players,
      totalXp,
      gameXp,
      recentActivity: recentActivity || [],
    });
  } catch (error) {
    console.error('Player search error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
