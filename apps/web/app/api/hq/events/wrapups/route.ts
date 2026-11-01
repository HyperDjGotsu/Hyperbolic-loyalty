import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Events that ended in the last 3 days at a store, so staff can still finish or review their wrap-ups
export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('store_id');
  if (!storeId || !/^[0-9a-f-]{36}$/i.test(storeId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const staff = await requireStoreAccess(storeId);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const since = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();
  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, name, scheduled_at')
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .gte('scheduled_at', since)
    .order('scheduled_at', { ascending: false })
    .limit(10);

  const ids = (events ?? []).map(e => e.id);
  const checkedIn: Record<string, number> = {};
  const saved: Record<string, number> = {};
  if (ids.length) {
    const [{ data: a }, { data: r }] = await Promise.all([
      supabaseAdmin.from('event_attendances').select('event_id').in('event_id', ids),
      supabaseAdmin.from('event_results').select('event_id').in('event_id', ids),
    ]);
    (a ?? []).forEach(x => { if (x.event_id) checkedIn[x.event_id] = (checkedIn[x.event_id] || 0) + 1; });
    (r ?? []).forEach(x => { saved[x.event_id] = (saved[x.event_id] || 0) + 1; });
  }
  return NextResponse.json({
    events: (events ?? []).filter(e => (checkedIn[e.id] || 0) > 0).map(e => ({
      id: e.id, name: e.name, scheduledAt: e.scheduled_at, checkedIn: checkedIn[e.id] || 0, saved: saved[e.id] || 0,
    })),
  });
}
