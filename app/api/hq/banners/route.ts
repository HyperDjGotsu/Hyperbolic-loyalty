import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff, requireNetworkAdmin, requireStoreAccess, requireStoreManager } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET - List all banners
// ?storeId=<uuid> → requireStoreAccess, returns store-scoped + network-wide (store_id IS NULL)
// no storeId      → requireNetworkAdmin, returns all banners unfiltered
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      const staffCtx = await requireNetworkAdmin();
      if (!staffCtx) {
        // Fall back: allow any staff to see all banners when no storeId provided
        const anyStaffCtx = await requireAnyStaff();
        if (!anyStaffCtx) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Non-network-admin without storeId: return network-wide banners only
        const { data: banners, error } = await supabaseAdmin
          .from('banners')
          .select('*')
          .is('store_id', null)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return NextResponse.json({ banners: banners || [] });
      }
      // Network admin: return all banners unfiltered
      const { data: banners, error } = await supabaseAdmin
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ banners: banners || [] });
    }

    // storeId provided: require store access, return store-scoped + network-wide
    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: banners, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .or(`store_id.is.null,store_id.eq.${storeId}`)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ banners: banners || [] });
  } catch (error) {
    console.error('Banners GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create new banner
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subtitle, icon, color_from, color_to, badge, is_active, sort_order, starts_at, ends_at, twitch_url, youtube_url, background_image, bg_size, bg_position, text_color, store_id } = body;

    // store_id present → store-scoped banner; null/absent → network-wide banner
    const staffCtx = store_id
      ? await requireStoreManager(store_id)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('banners')
      .insert({
        title,
        subtitle,
        icon: icon || '🎮',
        color_from: color_from || '#8b5cf6',
        color_to: color_to || '#ec4899',
        badge,
        is_active: is_active !== false,
        sort_order: sort_order || 0,
        starts_at,
        ends_at,
        twitch_url,
        youtube_url,
        background_image: background_image || null,
        bg_size: bg_size || 'cover',
        bg_position: bg_position || 'center',
        text_color: text_color || '#ffffff',
        store_id: store_id ?? null,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Banner create error:', error);
      return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
    }

    return NextResponse.json({ banner: data });
  } catch (error) {
    console.error('Banners POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Update banner
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, subtitle, icon, color_from, color_to, badge, is_active, sort_order, starts_at, ends_at, twitch_url, youtube_url, background_image, bg_size, bg_position, text_color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    // Load the banner to get its actual store_id
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('banners')
      .select('id, store_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const bannerStoreId = (existing as any).store_id as string | null;
    const staffCtx = bannerStoreId
      ? await requireStoreManager(bannerStoreId)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('banners')
      .update({
        title,
        subtitle,
        icon,
        color_from,
        color_to,
        badge,
        is_active,
        sort_order,
        starts_at,
        ends_at,
        twitch_url,
        youtube_url,
        background_image: background_image ?? null,
        bg_size: bg_size || 'cover',
        bg_position: bg_position || 'center',
        text_color: text_color || '#ffffff',
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Banner update error:', error);
      return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
    }

    return NextResponse.json({ banner: data });
  } catch (error) {
    console.error('Banners PUT error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Delete banner
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    // Load the banner to get its actual store_id
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('banners')
      .select('id, store_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const bannerStoreId = (existing as any).store_id as string | null;
    const staffCtx = bannerStoreId
      ? await requireStoreManager(bannerStoreId)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Banner delete error:', error);
      return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Banners DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
