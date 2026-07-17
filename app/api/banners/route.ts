import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';


export const dynamic = 'force-dynamic';

// Public player-facing banners.
// Returns: all active network-wide banners (store_id IS NULL)
//        + active banners for the requested store (?store_id=<uuid>)
// The HQ management route (/api/hq/banners) is separate and staff-gated.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('sort_order', { ascending: true });

    if (storeId) {
      // Network-wide banners + banners for this specific store
      query = (query as any).or(`store_id.is.null,store_id.eq.${storeId}`);
    } else {
      // No store context: network-wide only
      query = query.is('store_id', null);
    }

    const { data: banners, error } = await query;

    if (error) {
      console.error('Banners fetch error:', error);
      return NextResponse.json({ banners: [] });
    }

    // Transform to frontend format
    const transformedBanners = (banners || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle || '',
      icon: b.icon || '🎮',
      color: `from-[${b.color_from}] to-[${b.color_to}]`,
      colorFrom: b.color_from,
      colorTo: b.color_to,
      badge: b.badge || '',
      linkUrl: b.link_url,
      eventId: b.event_id,
      twitchUrl: b.twitch_url,
      youtubeUrl: b.youtube_url,
      hasStream: !!(b.twitch_url || b.youtube_url),
      backgroundImage: b.background_image || null,
      bgSize: b.bg_size || 'cover',
      bgPosition: b.bg_position || 'center',
      textColor: b.text_color || '#ffffff',
    }));

    return NextResponse.json(
      { banners: transformedBanners },
      { 
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  } catch (error) {
    console.error('Banners error:', error);
    return NextResponse.json(
      { banners: [] },
      { 
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        }
      }
    );
  }
}
