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
    const { currency_name, currency_icon, store_name } = body;

    const { data, error } = await supabaseAdmin
      .from('store_config')
      .upsert({ id: 1, currency_name, currency_icon, store_name, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('store-config PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
