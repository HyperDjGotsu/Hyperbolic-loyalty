import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logPointTransaction } from '@/lib/points';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('id, is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { action, voidReason } = await request.json() as {
      action: 'claim' | 'void';
      voidReason?: string;
    };

    if (action !== 'claim' && action !== 'void') {
      return NextResponse.json({ error: 'action must be claim or void' }, { status: 400 });
    }

    const { data: redemption, error: fetchError } = await (supabaseAdmin as any)
      .from('prize_wall_redemptions')
      .select('id, status, player_id, store_id, points_deducted, item_name, expires_at')
      .eq('claim_code', params.code.toUpperCase())
      .single();

    if (fetchError || !redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    if (redemption.status !== 'pending') {
      return NextResponse.json({
        error: `Cannot ${action} — redemption is already ${redemption.status}`,
      }, { status: 409 });
    }

    if (action === 'claim') {
      if (new Date(redemption.expires_at) < new Date()) {
        await (supabaseAdmin as any)
          .from('prize_wall_redemptions')
          .update({ status: 'expired' })
          .eq('id', redemption.id);
        return NextResponse.json({ error: 'Redemption code has expired' }, { status: 410 });
      }

      const { error: updateError } = await (supabaseAdmin as any)
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
    const { error: voidError } = await (supabaseAdmin as any)
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
    if (redemption.store_id) {
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
