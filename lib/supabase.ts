import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// ============================================
// TYPED SUPABASE CLIENTS
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase (uses anon key, respects RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Server-side Supabase (uses service role, bypasses RLS)
// Only use in API routes, never expose to client
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ============================================
// RE-EXPORT TYPES FROM DATABASE
// ============================================

// Table row types (what you SELECT)
export type Player = Database['public']['Tables']['players']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type XpLedger = Database['public']['Tables']['xp_ledger']['Row'];
export type Emperor = Database['public']['Tables']['emperors']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
// export type EventRegistration = Database['public']['Tables']['event_registrations']['Row'];
// export type Pass = Database['public']['Tables']['passes']['Row'];
// export type Friendship = Database['public']['Tables']['friendships']['Row'];

// Insert types (what you INSERT)
export type PlayerInsert = Database['public']['Tables']['players']['Insert'];
export type XpLedgerInsert = Database['public']['Tables']['xp_ledger']['Insert'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];
// export type EventRegistrationInsert = Database['public']['Tables']['event_registrations']['Insert'];

// Update types (what you UPDATE)
export type PlayerUpdate = Database['public']['Tables']['players']['Update'];
export type EventUpdate = Database['public']['Tables']['events']['Update'];

// View types
export type PlayerXpTotal = Database['public']['Views']['player_xp_totals']['Row'];
export type PlayerGameXp = Database['public']['Views']['player_game_xp']['Row'];
export type PlayerMonthlyXp = Database['public']['Views']['player_monthly_xp']['Row'];
// export type GameLeaderboard = Database['public']['Views']['game_leaderboards']['Row'];
// export type OnePieceMonthlyBounty = Database['public']['Views']['one_piece_monthly_bounties']['Row'];

// Enum types - FIXED: use actual DB enum names
// export type PassTier = Database['public']['Enums']['pass_tier'];
// export type PassStatus = Database['public']['Enums']['pass_status'];
export type XpSource = Database['public']['Enums']['xp_source'];
export type EventStatus = Database['public']['Enums']['event_status'];
export type ProfileVisibility = Database['public']['Enums']['privacy_visibility'];
export type FriendshipStatus = Database['public']['Enums']['friend_status'];
// export type AvatarType = Database['public']['Enums']['avatar_type'];
// export type AvatarFrame = Database['public']['Enums']['avatar_frame'];

// ============================================
// HELPER CONSTANTS
// ============================================

export const GAME_IDS = [
  'one_piece', 'gundam', 'pokemon', 'mtg', 'star_wars_unlimited',
  'vanguard', 'uvs', 'hololive', 'riftbound', 'lorcana',
  'weiss', 'sw_legion', 'union_arena', 'warhammer', 'yugioh', 'digimon'
] as const;

export const XP_SOURCES: XpSource[] = [
  'event_attendance', 'match_win', 'purchase', 'referral',
  'daily_checkin', 'manual_adjustment', 'pass_bonus', 'achievement'
];

// Commented out - PassTier type doesn't exist yet
// export const PASS_TIERS: PassTier[] = [
//   'none', 'access', 'player', 'all_access', 'shadow_vip'
// ];

// ============================================
// PLAYER FUNCTIONS
// ============================================

export async function getPlayerByHypId(hypId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('player_id', hypId.toUpperCase())
    .single();

  if (error || !data) return null;
  return data;
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
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

export async function getPlayerGameXP(playerId: string): Promise<PlayerGameXp[]> {
  const { data, error } = await supabase
    .from('player_game_xp')
    .select('*')
    .eq('player_id', playerId);

  if (error || !data) return [];
  return data;
}

export async function getPlayerMonthlyXP(playerId: string): Promise<PlayerMonthlyXp[]> {
  const { data, error } = await supabase
    .from('player_monthly_xp')
    .select('*')
    .eq('player_id', playerId);

  if (error || !data) return [];
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

export async function getPlayerRecentActivity(playerId: string, limit = 10): Promise<XpLedger[]> {
  const { data, error } = await supabase
    .from('xp_ledger')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ============================================
// LEADERBOARD FUNCTIONS
// ============================================

export async function getLeaderboard(limit = 50): Promise<PlayerXpTotal[]> {
  const { data, error } = await supabase
    .from('player_xp_totals')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
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
// FULL PROFILE
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

  return {
    player,
    stats,
    gameXP,
    monthlyXP,
    recentActivity,
    games,
  };
}
