import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { logPointTransaction, TIER_MULTIPLIERS, effectivePassTier } from '@/lib/points';
import { ATTENDANCE_LIFETIME_XP, WIN_LIFETIME_XP, ATTENDANCE_PRIZE_POINTS, WIN_PRIZE_POINTS } from '@/lib/xp-constants';
import { getStaffContext } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
const MAX_ROUNDS = 3;
const REFERRAL_LIFETIME_XP = 50;
const REFERRAL_PRIZE_POINTS = 10; // flat, no multiplier — supersedes old 100 PP value (2026-08-16)

async function awardReferralBonus(
  playerId: string,
  storeId: string,
  staffId: string
): Promise<{ awarded: boolean; referrerName?: string } | null> {
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

    // Atomic claim — only one concurrent request can flip this from false→true.
    // If two checkin calls race on a player's first event, exactly one wins here.
    const { data: claimed } = await supabaseAdmin
      .from('players')
      .update({ referral_bonus_paid: true })
      .eq('id', playerId)
      .eq('referral_bonus_paid', false)
      .select('id');

    if (!claimed || claimed.length === 0) return null; // lost race

    // Lifetime XP for referrer (never multiplied).
    // If this fails, revert the claim so the referral can fire on the next eligible event.
    const { error: xpError } = await supabaseAdmin.from('xp_ledger').insert({
      player_id: referrer.id,
      game_id: 'general',
      base_xp: REFERRAL_LIFETIME_XP,
      final_xp: REFERRAL_LIFETIME_XP,
      multiplier: 1,
      description: `Referral reward — ${player.display_name} attended first event`,
      source: 'referral',
      awarded_by: staffId,
      store_id: storeId,
    });

    if (xpError) {
      console.error('Referral XP insert failed — reverting claim:', xpError);
      await supabaseAdmin
        .from('players')
        .update({ referral_bonus_paid: false })
        .eq('id', playerId);
      return null;
    }

    // Prize Points for referrer (flat, no multiplier)
    await logPointTransaction({
      playerId: referrer.id,
      storeId,
      amount: REFERRAL_PRIZE_POINTS,
      type: 'earn',
      source: 'referral_bonus',
      referenceId: playerId,
      note: `${player.display_name} attended first event`,
    });

    createNotification(
      referrer.id,
      'referral',
      'Referral bonus earned!',
      `${player.display_name} attended their first event — you earned +${REFERRAL_LIFETIME_XP} XP and +${REFERRAL_PRIZE_POINTS} Points!`,
      { new_player_name: player.display_name },
      'social'
    ).catch(() => {});

    return { awarded: true, referrerName: referrer.display_name };
  } catch (err) {
    console.error('Referral bonus error:', err);
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await request.json() as {
      player_id?: string;
      rounds_won?: number;
      store_id?: string;
    };

    const roundsWon = Math.min(MAX_ROUNDS, Math.max(0, Math.floor(body.rounds_won ?? 0)));

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, game_id, attendance_xp, status, store_id')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active' }, { status: 400 });
    }

    // Both paths require a Clerk session.
    // Kiosk/NFC path: staff member's session + player_id in body identifies the player.
    // Player phone path: session identifies the player directly.
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: authedPlayer } = await supabaseAdmin
      .from('players')
      .select('id, display_name, pass_tier, pass_expires_at, home_store_id, is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!authedPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    let playerId: string;
    let playerName: string;
    let playerTier: string = 'free';
    let playerHomeStoreId: string | null = null;
    let staffId: string | null = null;

    if (body.player_id) {
      // Kiosk/NFC path — authorize via role tables — players.is_staff is not authoritative for kiosk access
      const staffCtx = await getStaffContext();
      if (!staffCtx) {
        return NextResponse.json({ error: 'Staff access required for kiosk check-in' }, { status: 403 });
      }
      // Network events: store_manager or network_admin only
      if (event.store_id === null) {
        if (!staffCtx.isNetworkAdmin && staffCtx.managedStoreIds.length === 0) {
          return NextResponse.json(
            { error: 'Store manager or network admin required for network event check-in' },
            { status: 403 }
          );
        }
      } else if (!staffCtx.isNetworkAdmin && !staffCtx.allStoreIds.includes(event.store_id)) {
        return NextResponse.json(
          { error: 'Staff access required for kiosk check-in at this store' },
          { status: 403 }
        );
      }
      staffId = authedPlayer.id;

      const { data: player } = await supabaseAdmin
        .from('players')
        .select('id, display_name, pass_tier, pass_expires_at, home_store_id')
        .eq('player_id', body.player_id.toUpperCase())
        .single();

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }
      playerId = player.id;
      playerName = player.display_name || body.player_id;
      playerTier = effectivePassTier(player.pass_tier, player.pass_expires_at);
      playerHomeStoreId = player.home_store_id;
    } else {
      // Player's own phone path
      playerId = authedPlayer.id;
      playerName = authedPlayer.display_name || 'Player';
      playerTier = effectivePassTier(authedPlayer.pass_tier, authedPlayer.pass_expires_at);
      playerHomeStoreId = authedPlayer.home_store_id;
      if (authedPlayer.is_staff) staffId = authedPlayer.id;
    }

    // store_id always comes from the event record, never from the request body
    const storeId: string = event.store_id || playerHomeStoreId || '';

    // Deduplicate
    const { data: existing } = await supabaseAdmin
      .from('event_attendances')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Already checked in', alreadyCheckedIn: true, playerName },
        { status: 400 }
      );
    }

    // Calculate awards
    const multiplier = TIER_MULTIPLIERS[playerTier] ?? 1.0;
    const lifetimeXp = ATTENDANCE_LIFETIME_XP + WIN_LIFETIME_XP * roundsWon;
    const prizePoints = Math.round(
      (ATTENDANCE_PRIZE_POINTS + WIN_PRIZE_POINTS * roundsWon) * multiplier
    );

    // Record attendance
    const { error: attendanceError } = await supabaseAdmin
      .from('event_attendances')
      .insert({
        event_id: eventId,
        player_id: playerId,
        game_id: event.game_id,
        xp_awarded: lifetimeXp,
        store_id: storeId || null,
      });

    if (attendanceError) {
      console.error('Attendance insert error:', attendanceError);
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
    }

    // Award Lifetime XP (flat, no multiplier ever)
    const xpDescription = roundsWon > 0
      ? `Attended ${event.name} — ${roundsWon} round win${roundsWon > 1 ? 's' : ''}`
      : `Attended ${event.name}`;

    await supabaseAdmin.from('xp_ledger').insert({
      player_id: playerId,
      game_id: event.game_id,
      base_xp: lifetimeXp,
      final_xp: lifetimeXp,
      multiplier: 1,
      description: xpDescription,
      source: 'event_attendance',
      awarded_by: staffId,
      store_id: storeId || null,
    });

    // Award Prize Points (multiplier applies to event actions)
    if (storeId) {
      await logPointTransaction({
        playerId,
        storeId,
        amount: prizePoints,
        type: 'earn',
        source: 'event_checkin',
        referenceId: eventId,
        note: roundsWon > 0
          ? `${event.name} — attendance + ${roundsWon} win${roundsWon > 1 ? 's' : ''} (${playerTier} ${multiplier}x)`
          : `${event.name} — attendance (${playerTier} ${multiplier}x)`,
      });
    }

    // Check referral bonus (non-blocking)
    const referralResult = storeId
      ? await awardReferralBonus(playerId, storeId, staffId || playerId)
      : null;

    createNotification(
      playerId,
      'event_recap',
      `You attended ${event.name}!`,
      `+${lifetimeXp} Lifetime XP${storeId ? ` · +${prizePoints} Prize Points` : ''} earned.`,
      { event_id: String(eventId), event_name: event.name, xp: String(lifetimeXp) },
      'events'
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      playerName,
      eventName: event.name,
      lifetimeXpAwarded: lifetimeXp,
      xp_awarded: lifetimeXp,   // mobile compat alias
      prizePointsAwarded: prizePoints,
      roundsWon,
      multiplier,
      tier: playerTier,
      referralBonus: referralResult?.awarded
        ? { awarded: true, referrerName: referralResult.referrerName }
        : null,
    });
  } catch (error) {
    console.error('Event checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
