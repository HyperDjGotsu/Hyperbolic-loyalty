import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('stores')
      .select('id, name, ical_url')
      .eq('id', storeId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    return NextResponse.json({ ical_url: data.ical_url ?? '' });
  } catch (err) {
    console.error('store-calendar GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

    // Store managers or network admin can set the calendar URL
    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { ical_url } = await request.json() as { ical_url: string };

    // Validate it looks like a Google Calendar iCal URL
    if (ical_url && !ical_url.includes('calendar.google.com') && !ical_url.startsWith('https://')) {
      return NextResponse.json({ error: 'Must be a valid https:// URL' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('stores')
      .update({ ical_url: ical_url || null })
      .eq('id', storeId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('store-calendar PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
