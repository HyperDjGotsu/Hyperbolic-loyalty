import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  currency_name: 'Points',
  currency_icon: '⭐',
  store_name: 'Hyperbolic XP',
  shop_title: 'Prize Wall',
  shop_description: 'avatar cosmetics',
  shop_categories: [
    { id: 'base', name: 'Base', icon: '😎', enabled: true },
    { id: 'background', name: 'Background', icon: '🎨', enabled: true },
    { id: 'frame', name: 'Frame', icon: '✨', enabled: true },
    { id: 'badge', name: 'Badge', icon: '🏷️', enabled: true },
    { id: 'title', name: 'Title', icon: '📛', enabled: true },
  ],
};

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Surrogate-Control': 'no-store',
};

export async function GET(request: Request) {
  void request; // touch request to ensure dynamic rendering
  try {
    const { data, error } = await supabaseAdmin
      .from('store_config')
      .select('currency_name, currency_icon, store_name, shop_title, shop_description, shop_categories')
      .eq('id', 1)
      .single();

    if (error || !data) return NextResponse.json(DEFAULTS, { headers: NO_CACHE });

    return NextResponse.json(
      { ...data, shop_categories: data.shop_categories ?? DEFAULTS.shop_categories },
      { headers: NO_CACHE }
    );
  } catch {
    return NextResponse.json(DEFAULTS, { headers: NO_CACHE });
  }
}
