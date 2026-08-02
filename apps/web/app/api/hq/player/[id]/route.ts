import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff, requireStoreAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// PATCH — update pass_tier or is_staff
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // Load player to get home_store_id for scoped authorization
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('home_store_id')
      .eq('id', params.id)
      .single();

    // Use requireStoreAccess if the player has a home store; otherwise fall back
    // TODO: scope to store_id once per-store player data model lands
    const staffCtx = player?.home_store_id
      ? await requireStoreAccess(player.home_store_id)
      : await requireAnyStaff();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { pass_tier, pass_status, pass_expires_at, pass_started_at, is_staff } = body;

    const updates: Record<string, unknown> = {};
    if (pass_tier !== undefined) updates.pass_tier = pass_tier;
    if (pass_status !== undefined) updates.pass_status = pass_status;
    if (pass_expires_at !== undefined) updates.pass_expires_at = pass_expires_at;
    if (pass_started_at !== undefined) updates.pass_started_at = pass_started_at;
    if (is_staff !== undefined) updates.is_staff = is_staff;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('players')
      .update(updates)
      .eq('id', params.id)
      .select('id, player_id, display_name, pass_tier, pass_status, pass_expires_at, pass_started_at, is_staff')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('player PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — remove player and all associated records
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pid = params.id;

    // Delete in FK-safe order
    const tables = [
      'daily_spins',
      'bounty_hunter_participants',
      'event_attendance',
      'event_interest',
      'notifications',
      'pass_history',
      'player_inventory',
      'preorder_claims',
      'transactions',
      'xp_ledger',
    ] as const;

    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq('player_id', pid);
      if (error) console.warn(`Could not delete from ${table}:`, error.message);
    }

    // emperors references player_id but preserving history — null it out instead of deleting
    await supabaseAdmin.from('emperors').update({ player_id: null as unknown as string }).eq('player_id', pid);

    const { error } = await supabaseAdmin.from('players').delete().eq('id', pid);
    if (error) throw error;

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('player DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
