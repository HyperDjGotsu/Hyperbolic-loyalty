import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const [itemsResult, subscriberResult] = await Promise.all([
      supabaseAdmin
        .from('prize_wall_items')
        .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, is_network_prize, created_at')
        .eq('is_active', true)
        .or(`store_id.eq.${storeId},is_network_prize.eq.true`)
        .order('xp_cost', { ascending: true }),
      supabaseAdmin
        .from('players')
        .select('id', { count: 'exact', head: true })
        .in('pass_tier', ['access', 'player', 'all_access', 'diamond'])
        // TODO: change to .in('pass_status', ['active', 'cancel_scheduled']) after migration 20260824000003 lands and types are regenerated
        .or('pass_status.eq.active,pass_status.eq.cancel_scheduled')
        .gt('pass_expires_at', now),
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (subscriberResult.error) throw subscriberResult.error;

    const subscriber_count = subscriberResult.count ?? 0;

    const items = (itemsResult.data ?? []).map((item) => ({
      ...item,
      is_unlocked: item.unlock_threshold === null || subscriber_count >= item.unlock_threshold,
    }));

    return NextResponse.json({ items, subscriber_count });
  } catch (err) {
    console.error('prize-wall public GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
