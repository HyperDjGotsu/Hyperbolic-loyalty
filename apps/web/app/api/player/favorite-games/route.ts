import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { SELECTABLE_GAME_IDS } from '@/lib/games';

export const dynamic = 'force-dynamic';

// GET - Fetch player's favorite games
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('favorite_games')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching favorites:', error);
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
    }

    // Default to overall + one_piece if not set
    const favorites = player?.favorite_games || ['overall', 'one_piece'];

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save player's favorite games
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { favorites } = await request.json();

    // Validate favorites
    if (!Array.isArray(favorites)) {
      return NextResponse.json({ error: 'Favorites must be an array' }, { status: 400 });
    }

    // Filter to valid selectable game IDs, deduplicate, exclude system-managed 'overall'
    const seen = new Set<string>();
    const validGames = (favorites as string[]).filter(f => {
      if (!SELECTABLE_GAME_IDS.includes(f) || seen.has(f)) return false;
      seen.add(f);
      return true;
    });

    // 8-game limit applies to real games only; overall is always prepended and never counts
    const limitedFavorites = ['overall', ...validGames.slice(0, 8)];

    const { error } = await supabaseAdmin
      .from('players')
      .update({ favorite_games: limitedFavorites })
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('Error saving favorites:', error);
      return NextResponse.json({ error: 'Failed to save favorites' }, { status: 500 });
    }

    return NextResponse.json({ success: true, favorites: limitedFavorites });
  } catch (error) {
    console.error('Favorites POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
