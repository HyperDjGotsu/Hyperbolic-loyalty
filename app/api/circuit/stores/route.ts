import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET — fetch stores for a given org slug
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get('org') || 'ggc';

  const db = supabaseAdmin as any;

  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', orgSlug)
    .single();

  if (!org) return NextResponse.json({ stores: [], org: null });

  const { data: stores, error } = await db
    .from('stores')
    .select('id, name, city, state, player_id_prefix, color, is_active')
    .eq('org_id', org.id)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Stores fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
  }

  return NextResponse.json({ org, stores: stores || [] });
}
