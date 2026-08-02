import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, name, city, slug, is_flagship, color')
    .eq('is_active', true)
    .order('is_flagship', { ascending: false })
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Failed to load stores' }, { status: 500 });
  }

  return NextResponse.json({ stores: data });
}
