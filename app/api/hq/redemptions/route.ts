import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('id, is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await (supabaseAdmin as any)
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
  } catch (error) {
    console.error('Redemptions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
