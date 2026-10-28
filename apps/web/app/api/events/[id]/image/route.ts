import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

function isOwnEventImage(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 500) return false;
  try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      u.hostname === base.hostname &&
      u.pathname.startsWith('/storage/v1/object/public/store-assets/events/') &&
      !u.pathname.includes('..') &&
      !u.search && !u.hash && !u.username && !u.password
    );
  } catch {
    return false;
  }
}

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

    // Only accept images we uploaded ourselves: exact host and path prefix, no query/hash/credentials
    if (imageUrl !== null && !isOwnEventImage(imageUrl)) {
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
