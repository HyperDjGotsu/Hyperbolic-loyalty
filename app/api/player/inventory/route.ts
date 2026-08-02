import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';


export const dynamic = 'force-dynamic';
// GET - Fetch player's inventory
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, gems, avatar_config, pass_tier, pass_status')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get live point balance from ledger (network-wide)
    const { data: balanceData } = await supabaseAdmin
      .rpc('get_user_point_balance', { p_player_id: player.id, p_store_id: null as unknown as string });
    const liveBalance = typeof balanceData === 'number' ? balanceData : (player.gems || 0);

    // Get player's purchased items
    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('player_inventory')
      .select(`
        item_id,
        purchased_at,
        shop_items (
          id,
          name,
          description,
          category,
          price,
          rarity,
          asset_data,
          is_default
        )
      `)
      .eq('player_id', player.id);

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }

    // Get all default items (everyone owns these)
    const { data: defaultItems, error: defaultError } = await supabaseAdmin
      .from('shop_items')
      .select('*')
      .eq('is_default', true);

    if (defaultError) {
      console.error('Error fetching default items:', defaultError);
    }

    // Combine purchased + default items
    const ownedItems: any[] = [];
    
    // Add default items
    defaultItems?.forEach(item => {
      ownedItems.push({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        rarity: item.rarity,
        assetData: item.asset_data,
        isDefault: true,
        purchasedAt: null,
      });
    });

    // Add purchased items
    inventory?.forEach((inv: any) => {
      if (inv.shop_items) {
        ownedItems.push({
          id: inv.shop_items.id,
          name: inv.shop_items.name,
          description: inv.shop_items.description,
          category: inv.shop_items.category,
          price: inv.shop_items.price,
          rarity: inv.shop_items.rarity,
          assetData: inv.shop_items.asset_data,
          isDefault: false,
          purchasedAt: inv.purchased_at,
        });
      }
    });

    // Group by category
    const grouped: Record<string, any[]> = {
      base: [],
      background: [],
      frame: [],
      badge: [],
      effect: [],
      title: [],
    };

    ownedItems.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return NextResponse.json({
      gems: liveBalance,
      passInfo: {
        tier: player.pass_tier || 'none',
        status: player.pass_status || 'none',
        isActive: player.pass_tier === 'player' && player.pass_status === 'active',
      },
      avatarConfig: player.avatar_config || {
        base: '😎',
        background: '#3b82f6',
        frame: 'none',
        badge: null,
        photo_url: null,
      },
      items: ownedItems,
      grouped,
      totalOwned: ownedItems.length,
    });

  } catch (error) {
    console.error('Inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
