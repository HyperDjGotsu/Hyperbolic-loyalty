import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAnyStaff } from '@/lib/auth-helpers';
import type { Database } from '@/lib/database.types';
import { createNotification } from '@/lib/notifications';
import { logPointTransaction, TIER_MULTIPLIERS } from '@/lib/points';

export const dynamic = 'force-dynamic';

// Create typed Supabase client
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Pirate's Life / Hyperlife configuration
const MONTHLY_THRESHOLD: Record<string, number> = {
  one_piece: 6,  // 2x/week = ~8 events/month, need 6
};
const DEFAULT_THRESHOLD = 3;  // 1x/week = ~4 events/month, need 3
const MONTHLY_BONUS_XP = 30;

// Referral bonus amount
const REFERRAL_FIRST_EVENT_BONUS = 50;

// Get current month boundaries (Pacific Time)
function getCurrentMonthBoundaries(): { start: string; end: string; monthLabel: string; monthKey: string } {
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
async function hasEarnedMonthlyBonus(playerId: string, gameId: string, monthStart: string, monthEnd: string): Promise<boolean> {
  const achievementName = gameId === 'one_piece' ? "Pirate's Life" : 'Hyperlife';
  
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
async function getMonthlyAttendanceCount(playerId: string, gameId: string, monthStart: string, monthEnd: string): Promise<number> {
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
async function checkReferralBonus(playerId: string, staffId: string): Promise<{
  awarded: boolean;
  referrerName?: string;
  newPlayerName?: string;
} | null> {
  try {
    // Get player's referral info
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, referred_by, referral_bonus_paid, display_name')
      .eq('id', playerId)
      .single();

    // Skip if no referrer or bonus already paid
    if (!player?.referred_by || player.referral_bonus_paid) {
      return null;
    }

    // Check total "Attended" entries for this player (across all games)
    const { count } = await supabaseAdmin
      .from('xp_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .ilike('description', '%Attended%');

    // If this is their first attendance (count is 1 because we just added it)
    if (count === 1) {
      // Get referrer info
      const { data: referrer } = await supabaseAdmin
        .from('players')
        .select('id, display_name')
        .eq('id', player.referred_by)
        .single();

      if (referrer) {
        // Award +50 XP to referrer (General game)
        const { error: bonusError } = await supabaseAdmin
          .from('xp_ledger')
          .insert({
            player_id: referrer.id,
            game_id: 'general',
            base_xp: REFERRAL_FIRST_EVENT_BONUS,
            final_xp: REFERRAL_FIRST_EVENT_BONUS,
            multiplier: 1,
            description: `Referral reward - ${player.display_name} attended first event`,
            source: 'referral',
            awarded_by: staffId,
          });

        if (bonusError) {
          console.error('Referral bonus insert error:', bonusError);
          return null;
        }

        // Mark bonus as paid so it doesn't trigger again
        await supabaseAdmin
          .from('players')
          .update({ referral_bonus_paid: true })
          .eq('id', playerId);

        console.log(`🎁 Referral reward: +${REFERRAL_FIRST_EVENT_BONUS} XP awarded to ${referrer.display_name} (${player.display_name} attended first event)`);

        // Notify the referrer (non-blocking)
        createNotification(
          referrer.id,
          'referral',
          'Referral bonus earned! 🎁',
          `${player.display_name} attended their first event — you earned +${REFERRAL_FIRST_EVENT_BONUS} XP!`,
          { new_player_name: player.display_name, xp: String(REFERRAL_FIRST_EVENT_BONUS) },
          'social'
        ).catch(() => {});

        return {
          awarded: true,
          referrerName: referrer.display_name,
          newPlayerName: player.display_name,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Referral bonus check error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the staff member's players record for awarded_by
    const { data: staffCheck } = await supabaseAdmin
      .from('players')
      .select('id, player_id')
      .eq('clerk_user_id', staffCtx.clerkUserId)
      .single();

    if (!staffCheck) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 500 });
    }

    const body = await request.json();
    const { playerId, gameId, amount, reason, storeId } = body;

    if (!playerId || !gameId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that the staff member has access to the store where XP is being awarded
    if (storeId && !staffCtx.isNetworkAdmin && !staffCtx.allStoreIds.includes(storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Add XP entry
    const { error: insertError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: playerId,
        game_id: gameId,
        base_xp: amount,
        final_xp: amount,
        multiplier: 1,
        description: reason || (amount > 0 ? 'Admin adjustment' : 'Admin correction'),
        source: 'manual_adjustment',
        awarded_by: staffCheck.id,
      });

    if (insertError) {
      console.error('XP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
    }

    // ================================================
    // PRIZE POINTS: Award for event tiles (with tier multiplier)
    // ================================================
    const TILE_PP: Record<string, number> = {
      'Attended': 35,
      '1 Win': 5,
      '2 Wins': 10,
      '3 Wins': 15,
      '4 Wins': 20,
    };

    let prizePointsAwarded = 0;
    if (reason && storeId) {
      const labels = reason.split(',').map((s: string) => s.trim());
      const basePP = labels.reduce((sum: number, label: string) => sum + (TILE_PP[label] ?? 0), 0);

      if (basePP > 0) {
        const { data: playerRow } = await supabaseAdmin
          .from('players')
          .select('pass_tier')
          .eq('id', playerId)
          .single();

        const tier = (playerRow as any)?.pass_tier || 'free';
        const multiplier = TIER_MULTIPLIERS[tier] ?? 1.0;
        prizePointsAwarded = Math.round(basePP * multiplier);

        await logPointTransaction({
          playerId,
          storeId,
          amount: prizePointsAwarded,
          type: 'earn',
          source: 'event_checkin',
          note: `${reason} (${tier} ${multiplier}x)`,
        });
      }
    }

    // ================================================
    // AUTO-AWARD: Pirate's Life / Hyperlife Check
    // ================================================
    let bonusAwarded = false;
    let achievementName = '';
    
    // ================================================
    // AUTO-AWARD: Referral Bonus Check (First Event)
    // ================================================
    let referralBonusAwarded = false;
    let referralInfo: { referrerName?: string; newPlayerName?: string } | null = null;
    
    // Only check if this was an attendance entry
    if (reason && reason.includes('Attended')) {
      // Check Pirate's Life / Hyperlife
      const { start: monthStart, end: monthEnd, monthLabel } = getCurrentMonthBoundaries();
      const threshold = MONTHLY_THRESHOLD[gameId] || DEFAULT_THRESHOLD;
      achievementName = gameId === 'one_piece' ? "Pirate's Life" : 'Hyperlife';
      
      // Check if already earned this month
      const alreadyEarned = await hasEarnedMonthlyBonus(playerId, gameId, monthStart, monthEnd);
      
      if (!alreadyEarned) {
        // Count attendance this month (including the one we just added)
        const attendanceCount = await getMonthlyAttendanceCount(playerId, gameId, monthStart, monthEnd);
        
        // If they just hit the threshold, award the bonus!
        if (attendanceCount >= threshold) {
          const bonusDescription = `${achievementName} - ${monthLabel}`;
          
          const { error: bonusError } = await supabaseAdmin
            .from('xp_ledger')
            .insert({
              player_id: playerId,
              game_id: gameId,
              base_xp: MONTHLY_BONUS_XP,
              final_xp: MONTHLY_BONUS_XP,
              multiplier: 1,
              description: bonusDescription,
              source: 'achievement',
              awarded_by: staffCheck.id,
            });
          
          if (bonusError) {
            console.error('Bonus XP insert error:', bonusError);
            // Don't fail the whole request, just log it
          } else {
            bonusAwarded = true;
            console.log(`🏴 ${achievementName} awarded to player ${playerId} for ${gameId}!`);
          }
        }
      }
      
      // Check referral bonus (first event attendance)
      const referralResult = await checkReferralBonus(playerId, staffCheck.id);
      if (referralResult?.awarded) {
        referralBonusAwarded = true;
        referralInfo = {
          referrerName: referralResult.referrerName,
          newPlayerName: referralResult.newPlayerName,
        };
      }
    }

    return NextResponse.json({
      success: true,
      prizePointsAwarded,
      bonusAwarded,
      achievementName: bonusAwarded ? achievementName : null,
      bonusXp: bonusAwarded ? MONTHLY_BONUS_XP : 0,
      referralBonusAwarded,
      referralInfo,
      referralBonusXp: referralBonusAwarded ? REFERRAL_FIRST_EVENT_BONUS : 0,
    });
  } catch (error) {
    console.error('XP add error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
