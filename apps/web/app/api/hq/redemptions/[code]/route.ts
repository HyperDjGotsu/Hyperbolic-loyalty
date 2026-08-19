import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logPointTransaction } from '@/lib/points';
import { requireAnyStaff, requireStoreAccess, requireStoreManager } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: redemption, error } = await supabaseAdmin
      .from('prize_wall_redemptions')
      .select(`
        id, claim_code, status, item_name, item_retail_value,
        points_deducted, created_at, expires_at, claimed_at, voided_at, void_reason,
        player:player_id (id, display_name, player_id),
        store:store_id (id, name)
      `)
      .eq('claim_code', params.code.toUpperCase())
      .single();

    if (error || !redemption) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    // Store staff can only see codes belonging to a store they have access to
    const storeIdForCode = (redemption.store as { id?: string } | null)?.id ?? '';
    if (!staffCtx.isNetworkAdmin && !staffCtx.allStoreIds.includes(storeIdForCode)) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    return NextResponse.json({ redemption });
  } catch (err) {
    console.error('Redemption GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedStoreId = searchParams.get('storeId');

    if (!requestedStoreId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Auth against the requested store before revealing anything about the code
    const staffCtx = await requireStoreAccess(requestedStoreId);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: redemption, error: fetchError } = await supabaseAdmin
      .from('prize_wall_redemptions')
      .select('id, status, player_id, store_id, points_deducted, item_name, expires_at')
      .eq('claim_code', params.code.toUpperCase())
      .single();

    if (fetchError || !redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // Cross-store disclosure: code belongs to a different store — return generic not-found.
    // Network admins bypass this check.
    if (redemption.store_id && redemption.store_id !== requestedStoreId && !staffCtx.isNetworkAdmin) {
      return NextResponse.json({ error: 'Redemption not found for the selected store.' }, { status: 404 });
    }

    // Get the staff member's players.id for claimed_by / voided_by
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', staffCtx.clerkUserId)
      .single();

    if (!staff) return NextResponse.json({ error: 'Staff record not found' }, { status: 500 });

    const { action, voidReason } = await request.json() as {
      action: 'claim' | 'void';
      voidReason?: string;
    };

    if (action !== 'claim' && action !== 'void') {
      return NextResponse.json({ error: 'action must be claim or void' }, { status: 400 });
    }

    if (action === 'void') {
      const managerCtx = await requireStoreManager(requestedStoreId);
      if (!managerCtx) {
        return NextResponse.json(
          { error: 'Store manager or network admin required to void redemptions' },
          { status: 403 }
        );
      }
    }

    if (redemption.status !== 'pending') {
      return NextResponse.json({
        error: `Cannot ${action} — redemption is already ${redemption.status}`,
      }, { status: 409 });
    }

    if (action === 'claim') {
      if (new Date(redemption.expires_at) < new Date()) {
        await supabaseAdmin
          .from('prize_wall_redemptions')
          .update({ status: 'expired' })
          .eq('id', redemption.id);
        return NextResponse.json({ error: 'Redemption code has expired' }, { status: 410 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('prize_wall_redemptions')
        .update({ status: 'claimed', claimed_at: new Date().toISOString(), claimed_by: staff.id })
        .eq('id', redemption.id)
        .eq('status', 'pending'); // optimistic lock

      if (updateError) {
        return NextResponse.json({ error: 'Failed to claim — try again' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'claimed', itemName: redemption.item_name });
    }

    // void — refund points
    const { error: voidError } = await supabaseAdmin
      .from('prize_wall_redemptions')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        voided_by: staff.id,
        void_reason: voidReason || 'Staff voided',
      })
      .eq('id', redemption.id)
      .eq('status', 'pending');

    if (voidError) {
      return NextResponse.json({ error: 'Failed to void' }, { status: 500 });
    }

    // Refund points
    if (redemption.store_id && redemption.player_id) {
      await logPointTransaction({
        playerId: redemption.player_id,
        storeId: redemption.store_id,
        amount: redemption.points_deducted,
        type: 'refund',
        source: 'prize_redemption',
        note: `Voided: ${voidReason || 'Staff voided'} — ${redemption.item_name}`,
      });
    }

    return NextResponse.json({ success: true, action: 'voided', pointsRefunded: redemption.points_deducted });
  } catch (error) {
    console.error('Redemption PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
