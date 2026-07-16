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

function generateStaffCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('store_config' as any)
      .select('id, currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories, player_id_prefix, staff_invite_code, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    console.error('store-config GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories, player_id_prefix, staff_invite_code } = body;

    const sanitizedPrefix = player_id_prefix
      ? String(player_id_prefix).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'HYP'
      : undefined;

    const updates = {
      currency_name,
      currency_icon,
      store_name,
      shop_title,
      shop_description,
      shop_categories,
      ...(sanitizedPrefix ? { player_id_prefix: sanitizedPrefix } : {}),
      ...(staff_invite_code !== undefined ? { staff_invite_code } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('store_config' as any)
      .update(updates)
      .eq('id', 1)
      .select('id, currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories, player_id_prefix, staff_invite_code, updated_at')
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

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (body.action === 'generate_staff_code') {
      const code = generateStaffCode();

      const { error } = await supabaseAdmin
        .from('store_config' as any)
        .update({ staff_invite_code: code, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (error) throw error;
      return NextResponse.json({ staff_invite_code: code });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('store-config POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
