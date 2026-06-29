import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyAllPlayers } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function verifyStaff(userId: string | null) {
  if (!userId) return false;
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('is_staff')
    .eq('clerk_user_id', userId)
    .single();
  return player?.is_staff === true;
}

// GET - List all shop items (including inactive, for staff view)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('shop_items')
      .select('id, name, description, category, price, rarity, asset_data, is_default, active, created_at')
      .order('category', { ascending: true })
      .order('price', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('HQ shop GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create a new shop item
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, price, rarity, asset_data } = body;

    if (!name || !category || price == null || !rarity || !asset_data) {
      return NextResponse.json({ error: 'name, category, price, rarity, and asset_data are required' }, { status: 400 });
    }

    const validCategories = ['base', 'background', 'frame', 'badge', 'effect', 'title'];
    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!validRarities.includes(rarity)) {
      return NextResponse.json({ error: 'Invalid rarity' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('shop_items')
      .insert({ name, description: description || null, category, price: Number(price), rarity, asset_data, is_default: false, active: true })
      .select()
      .single();

    if (error) throw error;

    // Broadcast to all members (non-blocking)
    notifyAllPlayers(
      'store',
      '🛍️ New item in the Prize Wall!',
      `${name} is now available${price === 0 ? ' for free' : ` for ${price} Points`}.`,
      { item_id: data.id, item_name: name, category, rarity },
      'store'
    ).catch(() => {});

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('HQ shop POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Toggle active status or update item
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('shop_items')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('HQ shop PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Hard delete only if no players own it; otherwise deactivate
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Check if any player owns this item
    const { count } = await supabaseAdmin
      .from('player_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', id);

    if ((count ?? 0) > 0) {
      // Players own this — deactivate instead of deleting
      const { data, error } = await supabaseAdmin
        .from('shop_items')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ deactivated: true, item: data });
    }

    // Safe to hard delete
    const { error } = await supabaseAdmin
      .from('shop_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('HQ shop DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
