import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitStrict } from '@/lib/rate-limit';


export const dynamic = 'force-dynamic';
// POST - Purchase an item
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 5 attempts per minute — optimistic lock in DB is the authoritative guard
    const rl = await enforceRateLimitStrict(`purchase:${userId}`, 60, 5);
    if (rl) return rl;

    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Get current player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, gems')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get item details
    const { data: item, error: itemError } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if already owned
    const { data: existingOwnership } = await supabaseAdmin
      .from('player_inventory')
      .select('id')
      .eq('player_id', player.id)
      .eq('item_id', itemId)
      .single();

    if (existingOwnership) {
      return NextResponse.json({ error: 'You already own this item' }, { status: 400 });
    }

    // Check if default item (free for everyone)
    if (item.is_default) {
      return NextResponse.json({ error: 'This item is free by default' }, { status: 400 });
    }

    // Check if player has enough gems
    const playerGems = player.gems || 0;
    if (playerGems < item.price) {
      return NextResponse.json({ 
        error: 'Not enough points', 
        required: item.price,
        current: playerGems,
      }, { status: 400 });
    }

    // Deduct gems — conditional on gems not having changed since we read them (optimistic lock)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('players')
      .update({ gems: playerGems - item.price })
      .eq('id', player.id)
      .eq('gems', playerGems)
      .select('id');

    if (updateError) {
      console.error('Error deducting gems:', updateError);
      return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Purchase conflict — please try again' }, { status: 409 });
    }

    // Add to inventory
    const { error: inventoryError } = await supabaseAdmin
      .from('player_inventory')
      .insert({
        player_id: player.id,
        item_id: itemId,
      });

    if (inventoryError) {
      // Refund gems if inventory insert fails
      await supabaseAdmin
        .from('players')
        .update({ gems: playerGems })
        .eq('id', player.id);
      
      console.error('Error adding to inventory:', inventoryError);
      return NextResponse.json({ error: 'Failed to add item to inventory' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Purchased ${item.name}!`,
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
        rarity: item.rarity,
      },
      newBalance: playerGems - item.price,
    });

  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
