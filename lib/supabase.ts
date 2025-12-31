import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// TYPES
// ============================================

export interface Player {
  id: string;
  hyp_id: string;
  display_name: string;
  real_name?: string;
  discord_username?: string;
  email?: string;
  avatar_emoji: string;
  avatar_background: string;
  avatar_frame: string;
  avatar_badge?: string;
  pass_tier: 'none' | 'access' | 'player' | 'all_access' | 'shadow_vip';
  profile_visibility: 'public' | 'friends' | 'private';
  created_at: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  currency_name: string;
  frequency: 'standard' | 'high';
  is_active: boolean;
}

export interface PlayerGameXP {
  player_id: string;
  game_id: string;
  game_slug: string;
  game_name: string;
  total_xp: number;
}

export interface XPLedgerEntry {
  id: string;
  player_id: string;
  game_id?: string;
  base_xp: number;
  multiplier: number;
  final_xp: number;
  source: string;
  description?: string;
  created_at: string;
  game?: Game;
}

// ============================================
// PLAYER FUNCTIONS
// ============================================

export async function getPlayerByHypId(hypId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('hyp_id', hypId.toUpperCase())
    .single();

  if (error || !data) return null;
  return data;
}

export async function getPlayerById(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error || !data) return null;
  return data;
}

// ============================================
// XP FUNCTIONS
// ============================================

export async function getPlayerTotalXP(playerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('player_xp_totals')
    .select('total_xp')
    .eq('player_id', playerId)
    .single();

  if (error || !data) return 0;
  return data.total_xp || 0;
}

export async function getPlayerGameXP(playerId: string): Promise<PlayerGameXP[]> {
  const { data, error } = await supabase
    .from('player_game_xp')
    .select('*')
    .eq('player_id', playerId);

  if (error || !data) return [];
  return data;
}

export async function getPlayerMonthlyXP(playerId: string): Promise<PlayerGameXP[]> {
  const { data, error } = await supabase
    .from('player_monthly_xp')
    .select('*')
    .eq('player_id', playerId);

  if (error || !data) return [];
  return data;
}

// ============================================
// RANK FUNCTIONS
// ============================================

export async function getPlayerRank(playerId: string, gameSlug: string): Promise<string> {
  const { data, error } = await supabase
    .rpc('get_player_rank', { p_player_id: playerId, p_game_slug: gameSlug });

  if (error || !data) return 'Newcomer';
  return data;
}

// ============================================
// GAMES FUNCTIONS
// ============================================

export async function getAllGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error || !data) return [];
  return data;
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

// ============================================
// ACTIVITY FUNCTIONS
// ============================================

export async function getPlayerRecentActivity(playerId: string, limit = 10): Promise<XPLedgerEntry[]> {
  const { data, error } = await supabase
    .from('xp_ledger')
    .select(`
      *,
      game:games(name, slug, icon)
    `)
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

export async function getLeaderboard(limit = 50): Promise<Array<{
  player_id: string;
  hyp_id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_background: string;
  total_xp: number;
}>> {
  const { data, error } = await supabase
    .from('player_xp_totals')
    .select(`
      player_id,
      total_xp,
      player:players(hyp_id, display_name, avatar_emoji, avatar_background)
    `)
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  
  return data.map((row: any) => ({
    player_id: row.player_id,
    hyp_id: row.player?.hyp_id || '',
    display_name: row.player?.display_name || 'Unknown',
    avatar_emoji: row.player?.avatar_emoji || '😎',
    avatar_background: row.player?.avatar_background || '#3b82f6',
    total_xp: row.total_xp || 0,
  }));
}

// ============================================
// STATS FUNCTIONS
// ============================================

export async function getPlayerStats(playerId: string): Promise<{
  totalXP: number;
  rank: number;
  eventCount: number;
  winCount: number;
}> {
  // Get total XP
  const totalXP = await getPlayerTotalXP(playerId);

  // Get rank position
  const { count } = await supabase
    .from('player_xp_totals')
    .select('*', { count: 'exact', head: true })
    .gt('total_xp', totalXP);
  
  const rank = (count || 0) + 1;

  // Get event count
  const { count: eventCount } = await supabase
    .from('xp_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('source', 'event_attendance');

  // Get win count
  const { count: winCount } = await supabase
    .from('xp_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('source', 'match_win');

  return {
    totalXP,
    rank,
    eventCount: eventCount || 0,
    winCount: winCount || 0,
  };
}

// ============================================
// FULL PROFILE (for dashboard)
// ============================================

export async function getFullPlayerProfile(playerId: string) {
  const [player, stats, gameXP, monthlyXP, recentActivity, games] = await Promise.all([
    getPlayerById(playerId),
    getPlayerStats(playerId),
    getPlayerGameXP(playerId),
    getPlayerMonthlyXP(playerId),
    getPlayerRecentActivity(playerId, 5),
    getAllGames(),
  ]);

  if (!player) return null;

  // Get ranks for each game the player has XP in
  const gameRanks = await Promise.all(
    gameXP.map(async (gxp) => ({
      ...gxp,
      rank: await getPlayerRank(playerId, gxp.game_slug),
    }))
  );

  return {
    player,
    stats,
    gameXP: gameRanks,
    monthlyXP,
    recentActivity,
    games,
  };
}
