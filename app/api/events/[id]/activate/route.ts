import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff, requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    // Load event from DB to get its store_id (prevents store-spoofing)
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('store_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Network events (store_id = null) require network-admin; store events require store access
    const staffCtx = event.store_id
      ? await requireStoreAccess(event.store_id)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { action } = await request.json() as { action: 'start' | 'end' };

    if (action === 'start') {
      // End any currently active event first
      await supabaseAdmin
        .from('events')
        .update({ status: 'completed' } as any)
        .eq('status', 'active');

      const { error } = await supabaseAdmin
        .from('events')
        .update({ status: 'active' } as any)
        .eq('id', eventId);

      if (error) {
        return NextResponse.json({ error: 'Failed to start event' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'active' });
    }

    if (action === 'end') {
      const { error } = await supabaseAdmin
        .from('events')
        .update({ status: 'completed' } as any)
        .eq('id', eventId);

      if (error) {
        return NextResponse.json({ error: 'Failed to end event' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'completed' });
    }

    return NextResponse.json({ error: 'Invalid action. Use start or end.' }, { status: 400 });
  } catch (error) {
    console.error('Activate event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
