import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

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
      .select('id, pass_tier, pass_expires_at')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const tierIsActive = player.pass_tier && player.pass_tier !== 'none';
    const tierIsExpired = player.pass_expires_at && new Date(player.pass_expires_at) <= new Date();
    if (tierIsActive && !tierIsExpired) {
      return NextResponse.json({ error: 'Already on a pass tier' }, { status: 409 });
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

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        pass_tier: 'access',
        pass_started_at: now.toISOString(),
        pass_expires_at: expiresAt.toISOString(),
      })
      .eq('id', playerId);

    if (updateError) throw updateError;

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
