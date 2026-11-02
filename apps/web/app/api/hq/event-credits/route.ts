import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Staff view of the Diamond Event Credits players used this month at their store (read-only; players redeem on their own phone)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const month = searchParams.get('month');
    if (!storeId || !UUID_RE.test(storeId) || !month || !MONTH_RE.test(month)) {
      return NextResponse.json({ error: 'storeId and month (YYYY-MM-01) are required' }, { status: 400 });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('event_credit_redemptions')
      .select('id, redeemed_at, amount_cents, player:player_id (display_name, real_name, player_id)')
      .eq('store_id', storeId)
      .eq('month_key', month)
      .order('redeemed_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Event credits fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch event credits' }, { status: 500 });
    }

    const rows = (data ?? []).map((r: any) => {
      const p = Array.isArray(r.player) ? r.player[0] : r.player;
      return {
        id: r.id as string,
        redeemedAt: r.redeemed_at as string,
        amountCents: r.amount_cents as number,
        name: (p?.real_name || p?.display_name || 'Unknown') as string,
        playerId: (p?.player_id ?? '') as string,
      };
    });
    const totalCents = rows.reduce((sum, r) => sum + r.amountCents, 0);
    return NextResponse.json({ month, count: rows.length, totalCents, redemptions: rows });
  } catch (err) {
    console.error('Event credits GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
