import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULTS = { currency_name: 'Points', currency_icon: '⭐', store_name: 'Hyperbolic XP' };

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('store_config')
      .select('currency_name, currency_icon, store_name')
      .eq('id', 1)
      .single();

    return NextResponse.json(data ?? DEFAULTS);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}
