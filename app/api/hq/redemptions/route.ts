import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin, requireStoreAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      // No storeId — only network admins may list across all stores
      const staffCtx = await requireNetworkAdmin();
      if (!staffCtx) {
        return NextResponse.json(
          { error: 'storeId query param is required (or network admin role)' },
          { status: 400 }
        );
      }

      // Network admin unfiltered list
      const { data, error } = await supabaseAdmin
        .from('prize_wall_redemptions')
        .select(`
          id, claim_code, status, item_name, item_retail_value,
          points_deducted, created_at, expires_at, claimed_at, voided_at, void_reason,
          player:player_id (id, display_name, player_id),
          store:store_id (id, name)
        `)
        .in('status', ['pending', 'claimed', 'voided'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Redemptions fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
      }

      return NextResponse.json({ redemptions: data });
    }

    // storeId provided — verify access
    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('prize_wall_redemptions')
      .select(`
        id, claim_code, status, item_name, item_retail_value,
        points_deducted, created_at, expires_at, claimed_at, voided_at, void_reason,
        player:player_id (id, display_name, player_id),
        store:store_id (id, name)
      `)
      .eq('store_id', storeId)
      .in('status', ['pending', 'claimed', 'voided'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Redemptions fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
    }

    return NextResponse.json({ redemptions: data });
  } catch (error) {
    console.error('Redemptions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
