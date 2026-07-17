import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff, requireNetworkAdmin } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('prize_wall_items' as any)
      .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('prize-wall GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, xp_cost, description, image_url, retail_value, quantity, store_id, unlock_threshold, is_active } = body;

    if (!name || xp_cost === undefined || xp_cost === null) {
      return NextResponse.json({ error: 'name and xp_cost are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('prize_wall_items' as any)
      .insert({
        name,
        xp_cost,
        description: description ?? null,
        image_url: image_url ?? null,
        retail_value: retail_value ?? null,
        quantity: quantity ?? null,
        store_id: store_id ?? null,
        unlock_threshold: unlock_threshold ?? null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('prize-wall POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const allowed = ['name', 'description', 'image_url', 'xp_cost', 'retail_value', 'quantity', 'store_id', 'unlock_threshold', 'is_active'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in fields) updates[key] = fields[key];
    }

    const { data, error } = await supabaseAdmin
      .from('prize_wall_items' as any)
      .update(updates)
      .eq('id', id)
      .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('prize-wall PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const { count, error: checkError } = await supabaseAdmin
      .from('prize_wall_redemptions' as any)
      .select('id', { count: 'exact', head: true })
      .eq('item_id', id)
      .eq('status', 'pending');

    if (checkError) throw checkError;

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Item has pending redemptions — cancel them first.' },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from('prize_wall_items' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('prize-wall DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
