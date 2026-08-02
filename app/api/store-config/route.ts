import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  currency_name: 'Points',
  currency_icon: '⭐',
  store_name: 'GSHC Player Pass',
  shop_title: 'Prize Wall',
  shop_description: 'avatar cosmetics',
  player_id_prefix: 'HYP',
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
      .select('currency_name, currency_icon, store_name, shop_title, shop_description, player_id_prefix, shop_categories')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(DEFAULTS, { headers: NO_CACHE });
    }

    const row = data as Record<string, any>;
    const result = {
      currency_name:    row.currency_name    ?? DEFAULTS.currency_name,
      currency_icon:    row.currency_icon    ?? DEFAULTS.currency_icon,
      store_name:       row.store_name       ?? DEFAULTS.store_name,
      shop_title:       row.shop_title       ?? DEFAULTS.shop_title,
      shop_description: row.shop_description ?? DEFAULTS.shop_description,
      player_id_prefix: row.player_id_prefix ?? DEFAULTS.player_id_prefix,
      shop_categories:  row.shop_categories  ?? DEFAULTS.shop_categories,
    };

    return NextResponse.json(result, { headers: NO_CACHE });
  } catch {
    return NextResponse.json(DEFAULTS, { headers: NO_CACHE });
  }
}
