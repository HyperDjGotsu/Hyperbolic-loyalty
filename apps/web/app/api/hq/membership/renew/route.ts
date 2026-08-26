import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreManager, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      player_id,
      duration_days = 30,
      mutation_id,
      payment_confirmed = false,
      payment_event_id,
    } = body;

    if (!player_id || !mutation_id) {
      return NextResponse.json({ error: 'player_id and mutation_id are required' }, { status: 400 });
    }

    if (typeof duration_days !== 'number' || duration_days < 1 || duration_days > 365) {
      return NextResponse.json({ error: 'duration_days must be between 1 and 365' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('home_store_id, pass_status')
      .eq('id', player_id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const staffCtx = player.home_store_id
      ? await requireStoreManager(player.home_store_id)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden: store_manager or network_admin required' }, { status: 403 });
    }

    if (player.pass_status !== 'active' && player.pass_status !== 'cancel_scheduled') {
      return NextResponse.json(
        { error: `renew requires active or cancel_scheduled status (current: ${player.pass_status})` },
        { status: 409 }
      );
    }

    const { data: result, error } = await supabaseAdmin.rpc('membership_renew', {
      p_player_id: player_id,
      p_duration_days: duration_days,
      p_actor_clerk_id: staffCtx.clerkUserId,
      p_actor_store_id: player.home_store_id as string,
      p_mutation_id: mutation_id,
      p_payment_event_id: payment_event_id ?? null,
      p_payment_confirmed: payment_confirmed,
    });

    if (error) throw error;

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('membership/renew error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
