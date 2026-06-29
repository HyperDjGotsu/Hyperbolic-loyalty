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
    const { currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories, player_id_prefix } = body;

    // Sanitize prefix: uppercase, letters only, 2-5 chars
    const sanitizedPrefix = player_id_prefix
      ? String(player_id_prefix).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'HYP'
      : undefined;

    const updates = { currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories, ...(sanitizedPrefix ? { player_id_prefix: sanitizedPrefix } : {}), updated_at: new Date().toISOString() };

    // Use update (not upsert) — row is guaranteed to exist from migration seed
    const { data, error } = await supabaseAdmin
      .from('store_config' as any)
      .update(updates)
      .eq('id', 1)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    console.error('store-config PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
