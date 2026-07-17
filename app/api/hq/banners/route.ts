import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// GET - List all banners
export async function GET() {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: banners, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Banners fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
    }

    return NextResponse.json({ banners: banners || [] });
  } catch (error) {
    console.error('Banners GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create new banner
export async function POST(request: Request) {
  try {
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, subtitle, icon, color_from, color_to, badge, is_active, sort_order, starts_at, ends_at, twitch_url, youtube_url, background_image, bg_size, bg_position, text_color } = body;

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
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, subtitle, icon, color_from, color_to, badge, is_active, sort_order, starts_at, ends_at, twitch_url, youtube_url, background_image, bg_size, bg_position, text_color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
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
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
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
