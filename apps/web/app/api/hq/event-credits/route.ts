import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])-01$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PlayerJoin = { display_name: string | null; real_name: string | null; player_id: string | null };
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

// GET ?storeId&summary=1        → { pending } count for the HQ badge
// GET ?storeId&month=YYYY-MM-01 → credits waiting for staff, plus the month's confirmed credits
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const month = searchParams.get('month');
    if (!storeId || !UUID_RE.test(storeId)) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (searchParams.get('summary')) {
      const { count } = await supabaseAdmin
        .from('event_credit_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('status', 'pending');
      return NextResponse.json({ pending: count ?? 0 });
    }

    if (!month || !MONTH_RE.test(month)) {
      return NextResponse.json({ error: 'month (YYYY-MM-01) is required' }, { status: 400 });
    }

    const [pendingRes, confirmedRes] = await Promise.all([
      supabaseAdmin
        .from('event_credit_redemptions')
        .select('id, redeemed_at, amount_cents, player:player_id (display_name, real_name, player_id), event:event_id (name)')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .order('redeemed_at', { ascending: true })
        .limit(50),
      supabaseAdmin
        .from('event_credit_redemptions')
        .select('id, redeemed_at, confirmed_at, confirmed_by, amount_cents, player:player_id (display_name, real_name, player_id), event:event_id (name)')
        .eq('store_id', storeId)
        .eq('month_key', month)
        .eq('status', 'confirmed')
        .order('redeemed_at', { ascending: false })
        .limit(200),
    ]);
    if (pendingRes.error || confirmedRes.error) {
      console.error('Event credits fetch error:', pendingRes.error ?? confirmedRes.error);
      return NextResponse.json({ error: 'Failed to fetch event credits' }, { status: 500 });
    }

    const staffIds = Array.from(new Set((confirmedRes.data ?? []).map((r: any) => r.confirmed_by).filter(Boolean))) as string[];
    const staffNames: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: staff } = await supabaseAdmin.from('app_users').select('id, real_name').in('id', staffIds);
      for (const s of staff ?? []) staffNames[s.id] = s.real_name ?? 'Staff';
    }

    const shape = (r: any) => {
      const p = one<PlayerJoin>(r.player);
      const ev = one<{ name: string | null }>(r.event);
      return {
        id: r.id as string,
        redeemedAt: r.redeemed_at as string,
        amountCents: r.amount_cents as number,
        name: (p?.real_name || p?.display_name || 'Unknown') as string,
        playerId: (p?.player_id ?? '') as string,
        eventName: (ev?.name ?? null) as string | null,
      };
    };

    const redemptions = (confirmedRes.data ?? []).map((r: any) => ({
      ...shape(r),
      confirmedAt: (r.confirmed_at ?? null) as string | null,
      confirmedBy: r.confirmed_by ? staffNames[r.confirmed_by] ?? 'Staff' : null,
    }));
    return NextResponse.json({
      month,
      pending: (pendingRes.data ?? []).map(shape),
      count: redemptions.length,
      totalCents: redemptions.reduce((sum, r) => sum + r.amountCents, 0),
      redemptions,
    });
  } catch (err) {
    console.error('Event credits GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST { id, action: 'confirm' | 'decline' }
// confirm: staff took the $15 off in Square. decline: frees the player's credit for the month.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { id?: unknown; action?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id : '';
    const action = body?.action;
    if (!UUID_RE.test(id) || (action !== 'confirm' && action !== 'decline')) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const { data: row } = await supabaseAdmin
      .from('event_credit_redemptions')
      .select('id, store_id, status')
      .eq('id', id)
      .maybeSingle();
    if (!row || !row.store_id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const staffCtx = await requireStoreAccess(row.store_id);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Only a still-pending credit can change, so two staff tapping at once can't both win
    if (action === 'confirm') {
      const { data: updated, error } = await supabaseAdmin
        .from('event_credit_redemptions')
        .update({ status: 'confirmed', confirmed_by: staffCtx.appUserId, confirmed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id');
      if (error) throw error;
      if (!updated || updated.length === 0) return NextResponse.json({ error: 'Already handled' }, { status: 409 });
      return NextResponse.json({ success: true });
    }

    const { data: removed, error } = await supabaseAdmin
      .from('event_credit_redemptions')
      .delete()
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');
    if (error) throw error;
    if (!removed || removed.length === 0) return NextResponse.json({ error: 'Already handled' }, { status: 409 });
    console.info(`Event credit ${id} declined by staff ${staffCtx.appUserId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Event credits POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
