import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreManager, requireNetworkAdmin } from '@/lib/auth-helpers';
import { GRANTABLE_TIERS } from '@/lib/points';

export const dynamic = 'force-dynamic';

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
      expires_at,
      mutation_id,
      payment_confirmed = false,
      payment_event_id,
      notes,
    } = body;

    if (!player_id || !tier || !expires_at || !mutation_id) {
      return NextResponse.json(
        { error: 'player_id, tier, expires_at, and mutation_id are required' },
        { status: 400 }
      );
    }

    const canonicalTier = TIER_MAP[tier];
    if (!canonicalTier || !(GRANTABLE_TIERS as readonly string[]).includes(canonicalTier)) {
      return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
    }

    const expiresAtDate = new Date(expires_at);
    if (isNaN(expiresAtDate.getTime()) || expiresAtDate <= new Date()) {
      return NextResponse.json({ error: 'expires_at must be a valid future timestamp' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('home_store_id, pass_status')
      .eq('id', player_id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const isCancelled = player.pass_status === 'cancelled';

    // Cancelled memberships were administratively revoked — only network_admin can restore them.
    // Naturally expired memberships can be restored by store_manager of the player's home store.
    const staffCtx = isCancelled
      ? await requireNetworkAdmin()
      : player.home_store_id
        ? await requireStoreManager(player.home_store_id)
        : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json(
        {
          error: isCancelled
            ? 'Forbidden: restoring a cancelled membership requires network admin.'
            : 'Forbidden: store_manager or network_admin required.',
        },
        { status: 403 }
      );
    }

    if (player.pass_status !== 'cancelled' && player.pass_status !== 'expired') {
      return NextResponse.json(
        { error: `restore requires expired or cancelled status (current: ${player.pass_status})` },
        { status: 409 }
      );
    }

    const { data: result, error } = await supabaseAdmin.rpc('membership_restore', {
      p_player_id: player_id,
      p_tier: canonicalTier,
      p_expires_at: expiresAtDate.toISOString(),
      p_actor_clerk_id: staffCtx.clerkUserId,
      p_actor_store_id: player.home_store_id as string,
      p_mutation_id: mutation_id,
      p_notes: notes ?? null,
      p_payment_event_id: payment_event_id ?? null,
      p_payment_confirmed: payment_confirmed,
      p_allow_cancelled: isCancelled && staffCtx.isNetworkAdmin,
    });

    if (error) throw error;

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('membership/restore error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
