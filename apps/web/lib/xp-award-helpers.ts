import { supabaseAdmin } from '@/lib/supabase';
import { logPointTransaction } from '@/lib/points';
import { createNotification } from '@/lib/notifications';

// Pirate's Life / The Regular configuration
export const MONTHLY_THRESHOLD: Record<string, number> = {
  one_piece: 6,  // 2x/week = ~8 events/month, need 6
};
export const DEFAULT_THRESHOLD = 3;  // 1x/week = ~4 events/month, need 3
export const MONTHLY_BONUS_XP = 30;

// Referral bonus amounts — must match checkin/route.ts exactly
export const REFERRAL_FIRST_EVENT_BONUS = 50;   // Lifetime XP, flat, never multiplied
export const REFERRAL_PRIZE_POINTS = 10;        // Prize Points, flat, no multiplier (supersedes 100 PP — 2026-08-16)

// Get current month boundaries (Pacific Time)
export function getCurrentMonthBoundaries(): { start: string; end: string; monthLabel: string; monthKey: string } {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth();

  const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
  const startOfNextMonth = new Date(year, month + 1, 1, 0, 0, 0, 0);

  const start = startOfMonth.toISOString();
  const end = startOfNextMonth.toISOString();

  // Month key for tracking (e.g., "2026-01")
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Human readable month (e.g., "January 2026")
  const monthLabel = pacificNow.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return { start, end, monthLabel, monthKey };
}

// Check if player has already earned the monthly bonus for this game
export async function hasEarnedMonthlyBonus(playerId: string, gameId: string, monthStart: string, monthEnd: string): Promise<boolean> {
  const achievementName = gameId === 'one_piece' ? "Pirate's Life" : 'The Regular';

  const { data } = await supabaseAdmin
    .from('xp_ledger')
    .select('id')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd)
    .ilike('description', `%${achievementName}%`)
    .limit(1);

  return data !== null && data.length > 0;
}

// Count monthly attendance for a player/game
export async function getMonthlyAttendanceCount(playerId: string, gameId: string, monthStart: string, monthEnd: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('xp_ledger')
    .select('id, description')
    .eq('player_id', playerId)
    .eq('game_id', gameId)
    .gte('created_at', monthStart)
    .lt('created_at', monthEnd);

  if (!data) return 0;

  // Count entries that include "Attended" in description
  return data.filter(entry =>
    entry.description && entry.description.includes('Attended')
  ).length;
}

// Check and award referral bonus when player attends first event
export async function checkReferralBonus(playerId: string, staffId: string, storeId: string | null): Promise<{
  awarded: boolean;
  referrerName?: string;
  newPlayerName?: string;
} | null> {
  try {
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, referred_by, referral_bonus_paid, display_name')
      .eq('id', playerId)
      .single();

    if (!player?.referred_by || player.referral_bonus_paid) return null;

    const { count } = await supabaseAdmin
      .from('xp_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .ilike('description', '%Attended%');

    if (count !== 1) return null;

    const { data: referrer } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .eq('id', player.referred_by)
      .single();

    if (!referrer) return null;

    // Atomic claim — only one concurrent path (checkin vs hq/xp) can flip this.
    const { data: claimed } = await supabaseAdmin
      .from('players')
      .update({ referral_bonus_paid: true })
      .eq('id', playerId)
      .eq('referral_bonus_paid', false)
      .select('id');

    if (!claimed || claimed.length === 0) return null; // checkin path already claimed

    // Lifetime XP for referrer (never multiplied).
    // If this fails, revert the claim so the referral can fire again.
    const { error: bonusError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: referrer.id,
        game_id: 'general',
        base_xp: REFERRAL_FIRST_EVENT_BONUS,
        final_xp: REFERRAL_FIRST_EVENT_BONUS,
        multiplier: 1,
        description: `Referral reward — ${player.display_name} attended first event`,
        source: 'referral',
        awarded_by: staffId,
      });

    if (bonusError) {
      console.error('Referral XP insert failed — reverting claim:', bonusError);
      await supabaseAdmin
        .from('players')
        .update({ referral_bonus_paid: false })
        .eq('id', playerId);
      return null;
    }

    // Prize Points for referrer (flat, no multiplier) — only when store context available
    if (storeId) {
      await logPointTransaction({
        playerId: referrer.id,
        storeId,
        amount: REFERRAL_PRIZE_POINTS,
        type: 'earn',
        source: 'referral_bonus',
        referenceId: playerId,
        note: `${player.display_name} attended first event`,
      });
    }

    console.log(`Referral reward: +${REFERRAL_FIRST_EVENT_BONUS} XP +${REFERRAL_PRIZE_POINTS} PP → ${referrer.display_name}`);

    createNotification(
      referrer.id,
      'referral',
      'Referral bonus earned!',
      `${player.display_name} attended their first event — you earned +${REFERRAL_FIRST_EVENT_BONUS} XP and +${REFERRAL_PRIZE_POINTS} Points!`,
      { new_player_name: player.display_name, xp: String(REFERRAL_FIRST_EVENT_BONUS) },
      'social'
    ).catch(() => {});

    return {
      awarded: true,
      referrerName: referrer.display_name,
      newPlayerName: player.display_name,
    };
  } catch (error) {
    console.error('Referral bonus check error:', error);
    return null;
  }
}
