import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

// Runs daily at 6am PT — syncs Google Calendar for every store that has an iCal URL set
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, ical_url')
    .eq('is_active', true)
    .not('ical_url', 'is', null);

  if (error || !stores?.length) {
    return NextResponse.json({ message: 'No stores with calendar URLs configured', synced: 0 });
  }

  const baseUrl = getAppUrl();
  const results: { store: string; synced?: number; error?: string }[] = [];

  for (const store of stores) {
    try {
      const res = await fetch(`${baseUrl}/api/events/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
        body: JSON.stringify({ storeId: store.id }),
      });
      const data = await res.json();
      results.push({ store: store.name, synced: data.synced ?? 0, error: data.error });
    } catch (err) {
      results.push({ store: store.name, error: String(err) });
    }
  }

  // Also sync the network calendar
  let networkResult: { synced?: number; error?: string } = {};
  try {
    const res = await fetch(`${baseUrl}/api/events/sync-network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await res.json();
    networkResult = { synced: data.synced ?? 0, error: data.error };
  } catch (err) {
    networkResult = { error: String(err) };
  }

  const totalSynced = results.reduce((sum, r) => sum + (r.synced ?? 0), 0) + (networkResult.synced ?? 0);
  console.log('Calendar auto-sync complete:', { stores: results, network: networkResult });

  return NextResponse.json({
    message: `Auto-synced ${stores.length} store calendars + network calendar — ${totalSynced} events upserted`,
    results,
    network: networkResult,
  });
}
