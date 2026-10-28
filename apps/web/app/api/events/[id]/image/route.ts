import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Set or clear an event's optional cover image. Clearing falls back to the game's default art.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('store_id')
      .eq('id', params.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const staffCtx = event.store_id
      ? await requireStoreAccess(event.store_id)
      : await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { imageUrl } = (await request.json()) as { imageUrl: string | null };

    // Only accept images we uploaded ourselves
    if (imageUrl !== null && !(typeof imageUrl === 'string' && imageUrl.includes('/storage/v1/object/public/store-assets/events/'))) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('events')
      .update({ image_url: imageUrl })
      .eq('id', params.id);
    if (error) {
      console.error('event image update error:', error);
      return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error('event image error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
