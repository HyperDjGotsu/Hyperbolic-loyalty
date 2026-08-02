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

    // Flagship (Trade Emporium) serves as the company-wide prize wall — its items show to all stores
    const FLAGSHIP_STORE_ID = '3766247c-d900-4b15-bc4a-f0b8f5e4fa2d';
    const orFilter = storeId === FLAGSHIP_STORE_ID
      ? `store_id.is.null,store_id.eq.${storeId}`
      : `store_id.is.null,store_id.eq.${storeId},store_id.eq.${FLAGSHIP_STORE_ID}`;

    const [itemsResult, subscriberResult] = await Promise.all([
      (supabaseAdmin as any)
        .from('prize_wall_items')
        .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
        .eq('is_active', true)
        .or(orFilter)
        .order('xp_cost', { ascending: true }),
      supabaseAdmin
        .from('players')
        .select('id', { count: 'exact', head: true })
        .neq('pass_tier', 'none'),
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (subscriberResult.error) throw subscriberResult.error;

    const subscriber_count = subscriberResult.count ?? 0;

    const items = (itemsResult.data ?? []).map((item: any) => ({
      ...item,
      is_unlocked: item.unlock_threshold === null || subscriber_count >= item.unlock_threshold,
    }));

    return NextResponse.json({ items, subscriber_count });
  } catch (err) {
    console.error('prize-wall public GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
