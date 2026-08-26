import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Immediate revoke — network_admin only.
// Does NOT touch is_staff, staff_store_roles, or any employment authorization.
// Staff deprovisioning is a separate explicit administrative workflow.
export async function POST(request: Request) {
  try {
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden: network_admin required' }, { status: 403 });
    }

    const body = await request.json();
    const { player_id, mutation_id, notes } = body;

    if (!player_id || !mutation_id) {
      return NextResponse.json({ error: 'player_id and mutation_id are required' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('home_store_id, pass_status')
      .eq('id', player_id)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const status = player.pass_status as string;
    if (status !== 'active' && status !== 'cancel_scheduled') {
      return NextResponse.json(
        { error: `revoke requires active or cancel_scheduled status (current: ${player.pass_status})` },
        { status: 409 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error } = await (supabaseAdmin as any).rpc('membership_revoke', {
      p_player_id: player_id,
      p_actor_clerk_id: staffCtx.clerkUserId,
      p_actor_store_id: player.home_store_id,
      p_mutation_id: mutation_id,
      p_notes: notes ?? null,
    });

    if (error) throw error;

    return NextResponse.json({ result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('membership/revoke error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
