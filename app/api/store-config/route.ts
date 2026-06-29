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
      .from('store_config' as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('[store-config GET] query error:', error.code, error.message);
      return NextResponse.json(DEFAULTS, { headers: NO_CACHE });
    }

    if (!data) {
      console.log('[store-config GET] no row found, returning defaults');
      return NextResponse.json(DEFAULTS, { headers: NO_CACHE });
    }

    const row = data as Record<string, any>;
    console.log('[store-config GET] raw row keys:', Object.keys(row));

    const result = {
      currency_name:    row.currency_name    ?? DEFAULTS.currency_name,
      currency_icon:    row.currency_icon    ?? DEFAULTS.currency_icon,
      store_name:       row.store_name       ?? DEFAULTS.store_name,
      shop_title:       row.shop_title       ?? DEFAULTS.shop_title,
      shop_description: row.shop_description ?? DEFAULTS.shop_description,
      shop_categories:  row.shop_categories  ?? DEFAULTS.shop_categories,
    };

    console.log('[store-config GET] returning:', { shop_title: result.shop_title, shop_description: result.shop_description });
    return NextResponse.json(result, { headers: NO_CACHE });
  } catch {
    return NextResponse.json(DEFAULTS, { headers: NO_CACHE });
  }
}
