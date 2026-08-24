import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { effectivePassTier } from '@/lib/points';

export const dynamic = 'force-dynamic';

const FREE_TIER_GATE = 720;
const TRIAL_DAYS = 30;

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: player, error: fetchError } = await supabaseAdmin
      .from('players')
      .select('id, pass_tier, pass_expires_at, pass_status, has_claimed_trial')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Lifetime gate: once claimed, never again (even if the trial expired)
    if (player.has_claimed_trial) {
      return NextResponse.json({ error: 'Trial already claimed' }, { status: 409 });
    }

    // Active paid tier blocks trial claim
    const activeTier = effectivePassTier(player.pass_tier, player.pass_expires_at, player.pass_status);
    if (activeTier !== 'none') {
      return NextResponse.json({ error: 'Already on a pass tier' }, { status: 409 });
    }

    // Prior paid pass (even if expired) blocks trial — trial is for first-time pass holders only.
    // Players whose membership lapsed should renew through staff, not claim a new trial.
    const hadPriorPass = player.pass_tier !== null && player.pass_tier !== 'none';
    if (hadPriorPass) {
      return NextResponse.json(
        { error: 'Trial not available after a paid membership — contact staff to renew' },
        { status: 409 }
      );
    }
    const playerId = player.id;

    // Check lifetime XP gate
    const { data: ledger, error: ledgerError } = await supabaseAdmin
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', playerId);

    if (ledgerError) throw ledgerError;

    const lifetimeXp = (ledger ?? []).reduce((sum, e) => sum + e.final_xp, 0);

    if (lifetimeXp < FREE_TIER_GATE) {
      return NextResponse.json(
        { error: `You need ${FREE_TIER_GATE} lifetime XP to claim the trial`, lifetimeXp },
        { status: 403 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // Atomic guard: the UPDATE only succeeds if pass_tier is still null/'none' at write time.
    // If two concurrent requests race past the gate check above, exactly one will win here —
    // the second will match 0 rows and get an empty data array.
    const { data: claimed, error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        pass_tier: 'access',
        pass_status: 'active',
        pass_started_at: now.toISOString(),
        pass_expires_at: expiresAt.toISOString(),
        has_claimed_trial: true,
      })
      .eq('id', playerId)
      .eq('has_claimed_trial', false)
      .or('pass_tier.is.null,pass_tier.eq.none')
      .select('id');

    if (updateError) throw updateError;

    // Race lost — another concurrent request already claimed the trial
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'Trial already claimed' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      tier: 'bronze',
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('claim-trial error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
