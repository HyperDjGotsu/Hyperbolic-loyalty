import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';
import { logPointTransaction, TIER_MULTIPLIERS, effectivePassTier } from '@/lib/points';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import {
  MONTHLY_THRESHOLD,
  DEFAULT_THRESHOLD,
  MONTHLY_BONUS_XP,
  getCurrentMonthBoundaries,
  hasEarnedMonthlyBonus,
  getMonthlyAttendanceCount,
  checkReferralBonus,
} from '@/lib/xp-award-helpers';
import {
  ATTENDANCE_LIFETIME_XP,
  WIN_LIFETIME_XP,
  ATTENDANCE_PRIZE_POINTS,
  WIN_PRIZE_POINTS,
  BONUS_TILE_XP,
} from '@/lib/xp-constants';

export const dynamic = 'force-dynamic';

// Reason labels allowed for operational awards — matches HQ tile definitions
const ALLOWED_REASONS = ['Attended', '+1 Win', ...Object.keys(BONUS_TILE_XP)] as const;
type AllowedReason = typeof ALLOWED_REASONS[number];

export async function POST(request: Request) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 60 XP awards per 5 minutes per staff user — allows rapid event check-ins
    // while limiting a compromised account's XP farming throughput
    const rl = await enforceRateLimitStrict(`hq-xp-operational:${staffCtx.clerkUserId}`, 300, 60);
    if (rl) return rl;

    const body = await request.json();
    const { playerId, gameId, reason, storeId } = body as {
      playerId: string;
      gameId: string;
      reason: string;
      storeId: string;
    };

    if (!playerId || !gameId || !reason || !storeId) {
      return NextResponse.json({ error: 'Missing required fields: playerId, gameId, reason, storeId' }, { status: 400 });
    }

    // Validate storeId access
    if (!staffCtx.isNetworkAdmin && !staffCtx.allStoreIds.includes(storeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate reason labels against whitelist
    const labels = reason.split(',').map((s: string) => s.trim());
    const invalidLabels = labels.filter(l => !ALLOWED_REASONS.includes(l as AllowedReason));
    if (invalidLabels.length > 0) {
      return NextResponse.json(
        { error: `Invalid reason label(s): ${invalidLabels.join(', ')}. Allowed: ${ALLOWED_REASONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Server-compute award amounts from whitelist labels — client-supplied amounts are ignored
    const attended = labels.includes('Attended');
    const winCount = labels.filter(l => l === '+1 Win').length;
    const bonusTileXp = labels.reduce((sum, l) => sum + (BONUS_TILE_XP[l] ?? 0), 0);

    const lifetimeXp = (attended ? ATTENDANCE_LIFETIME_XP : 0) + winCount * WIN_LIFETIME_XP + bonusTileXp;

    // Look up target player's tier for prize point multiplier
    const { data: targetPlayer } = await supabaseAdmin
      .from('players')
      .select('pass_tier, pass_expires_at')
      .eq('id', playerId)
      .single();

    if (!targetPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const tier = effectivePassTier(targetPlayer.pass_tier ?? null, targetPlayer.pass_expires_at ?? null);
    const tierMultiplier = TIER_MULTIPLIERS[tier] ?? 1.0;
    const prizePoints = Math.round(
      ((attended ? ATTENDANCE_PRIZE_POINTS : 0) + winCount * WIN_PRIZE_POINTS) * tierMultiplier
    );

    // Look up staff member's players.id for awarded_by field
    const { data: staffRecord } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', staffCtx.clerkUserId)
      .single();

    if (!staffRecord) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 500 });
    }

    // Award Lifetime XP via xp_ledger insert
    const { error: insertError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: playerId,
        game_id: gameId,
        base_xp: lifetimeXp,
        final_xp: lifetimeXp,
        multiplier: 1,
        description: reason,
        source: 'event_attendance',
        awarded_by: staffRecord.id,
        store_id: storeId,
      });

    if (insertError) {
      console.error('Operational XP insert error:', insertError);
      return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
    }

    // Award Prize Points via logPointTransaction
    await logPointTransaction({
      playerId,
      storeId,
      amount: prizePoints,
      type: 'earn',
      source: 'event_checkin',
      note: `${reason} (${tier} ${tierMultiplier}x)`,
    });

    // Pirate's Life / Hyperlife achievement check (if attended)
    let bonusAwarded = false;
    let achievementName = '';
    let bonusXp = 0;

    if (attended) {
      const { start: monthStart, end: monthEnd, monthLabel } = getCurrentMonthBoundaries();
      const threshold = MONTHLY_THRESHOLD[gameId] || DEFAULT_THRESHOLD;
      achievementName = gameId === 'one_piece' ? "Pirate's Life" : 'Hyperlife';

      const alreadyEarned = await hasEarnedMonthlyBonus(playerId, gameId, monthStart, monthEnd);

      if (!alreadyEarned) {
        const attendanceCount = await getMonthlyAttendanceCount(playerId, gameId, monthStart, monthEnd);

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
              awarded_by: staffRecord.id,
            });

          if (bonusError) {
            console.error('Bonus XP insert error:', bonusError);
          } else {
            bonusAwarded = true;
            bonusXp = MONTHLY_BONUS_XP;
            console.log(`${achievementName} awarded to player ${playerId} for ${gameId}!`);
          }
        }
      }
    }

    // Referral bonus check (if attended)
    let referralBonusAwarded = false;

    if (attended) {
      const referralResult = await checkReferralBonus(playerId, staffRecord.id, storeId);
      if (referralResult?.awarded) {
        referralBonusAwarded = true;
      }
    }

    return NextResponse.json({
      success: true,
      lifetimeXpAwarded: lifetimeXp,
      prizePointsAwarded: prizePoints,
      bonusAwarded,
      achievementName: bonusAwarded ? achievementName : null,
      bonusXp,
      referralBonusAwarded,
    });
  } catch (error) {
    console.error('XP operational error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
