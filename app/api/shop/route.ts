import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


export const dynamic = 'force-dynamic';
// GET - Fetch all shop items
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // optional filter

    let query = supabaseAdmin
      .from('shop_items')
      .select('*')
      .order('price', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching shop items:', error);
      return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 });
    }

    // Group by category
    const grouped: Record<string, any[]> = {
      base: [],
      background: [],
      frame: [],
      badge: [],
      effect: [],
      title: [],
    };

    items?.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          rarity: item.rarity,
          assetData: item.asset_data,
          isDefault: item.is_default,
        });
      }
    });

    return NextResponse.json({ 
      items: items?.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        rarity: item.rarity,
        assetData: item.asset_data,
        isDefault: item.is_default,
      })) || [],
      grouped,
    });

  } catch (error) {
    console.error('Shop error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
