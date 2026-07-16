import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [itemsResult, subscriberResult] = await Promise.all([
      supabaseAdmin
        .from('prize_wall_items' as any)
        .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
        .eq('is_active', true)
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
