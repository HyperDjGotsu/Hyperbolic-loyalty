import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreManager, requireNetworkAdmin } from '@/lib/auth-helpers';
import { GRANTABLE_TIERS } from '@/lib/points';

export const dynamic = 'force-dynamic';

// Canonical tier map: accepts both friendly names (bronze/silver/gold) and DB enum values.
const TIER_MAP: Record<string, string> = {
  bronze: 'access', silver: 'player', gold: 'all_access', diamond: 'diamond',
  access: 'access', player: 'player', all_access: 'all_access',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      player_id,
      tier,
      duration_days = 30,
      mutation_id,
      payment_confirmed = false,
      payment_event_id,
    } = body;

    if (!player_id || !tier || !mutation_id) {
      return NextResponse.json({ error: 'player_id, tier, and mutation_id are required' }, { status: 400 });
    }

    const canonicalTier = TIER_MAP[tier];
    if (!canonicalTier || !(GRANTABLE_TIERS as readonly string[]).includes(canonicalTier)) {
      return NextResponse.json({ error: `Invalid tier: ${tier}. Must be one of bronze, silver, gold, diamond.` }, { status: 400 });
    }

    if (typeof duration_days !== 'number' || duration_days < 1 || duration_days > 365) {
      return NextResponse.json({ error: 'duration_days must be between 1 and 365' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('home_store_id, pass_status, pass_tier')
      .eq('id', player_id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Require at least store_manager at the player's home store (or network_admin).
    const staffCtx = player.home_store_id
      ? await requireStoreManager(player.home_store_id)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden: store_manager or network_admin required' }, { status: 403 });
    }

    // Cancelled players were administratively revoked — store_managers cannot reinstate them.
    // Redirect to /restore which enforces the p_allow_cancelled gate.
    if (player.pass_status === 'cancelled' && !staffCtx.isNetworkAdmin) {
      return NextResponse.json(
        { error: 'Cancelled memberships can only be restored by a network admin. Use /api/hq/membership/restore.' },
        { status: 403 }
      );
    }

    // Active/cancel_scheduled requires renew or change-tier, not a fresh grant.
    // Cast to string: cancel_scheduled not yet in generated DB types (regenerate after migration).
    const status = player.pass_status as string;
    if (status === 'active' || status === 'cancel_scheduled') {
      return NextResponse.json(
        { error: 'Player already has an active pass — use /renew to extend or /change-tier to upgrade.' },
        { status: 409 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabaseAdmin as any).rpc('membership_grant', {
      p_player_id: player_id,
      p_tier: canonicalTier,
      p_duration_days: duration_days,
      p_actor_clerk_id: staffCtx.clerkUserId,
      p_actor_store_id: player.home_store_id,
      p_mutation_id: mutation_id,
      p_payment_event_id: payment_event_id ?? null,
      p_payment_confirmed: payment_confirmed,
      // RPC enforces this gate under advisory lock — prevents TOCTOU on cancelled→active.
      p_allow_cancelled: status === 'cancelled' && staffCtx.isNetworkAdmin,
    });

    if (error) throw error;

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('membership/grant error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
