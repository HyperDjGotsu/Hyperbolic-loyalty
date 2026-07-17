import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// PATCH — update the authenticated player's home store
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { store_id } = body as { store_id?: string };

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Verify the store exists and is active
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, name, city, slug, is_flagship, color')
      .eq('id', store_id)
      .eq('active', true)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Update the player's home store
    const { error: updateErr } = await supabaseAdmin
      .from('players')
      .update({ home_store_id: store_id })
      .eq('clerk_user_id', userId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, homeStore: store });
  } catch (err) {
    console.error('home-store PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
