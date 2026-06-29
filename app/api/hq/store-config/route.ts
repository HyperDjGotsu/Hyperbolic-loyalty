import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyStaff(userId: string | null) {
  if (!userId) return false;
  const { data } = await supabaseAdmin
    .from('players')
    .select('is_staff')
    .eq('clerk_user_id', userId)
    .single();
  return data?.is_staff === true;
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories } = body;

    const updates = { currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories, updated_at: new Date().toISOString() };
    console.log('[store-config PUT]', { currency_name, shop_title, shop_description });

    // Use update (not upsert) — row is guaranteed to exist from migration seed
    const { data, error } = await supabaseAdmin
      .from('store_config' as any)
      .update(updates)
      .eq('id', 1)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[store-config PUT] update error:', error);
      throw error;
    }
    console.log('[store-config PUT] saved:', data);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    console.error('store-config PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
