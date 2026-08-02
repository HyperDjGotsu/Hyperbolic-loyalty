import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// All supported games
const ALL_GAMES = [
  'overall', 'one_piece', 'pokemon', 'mtg', 'gundam', 'star_wars_unlimited',
  'vanguard', 'lorcana', 'uvs', 'digimon', 'yugioh', 'riftbound',
  'hololive', 'weiss', 'sw_legion', 'union_arena', 'warhammer'
];

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

    // Filter to only valid game IDs
    const validFavorites = favorites.filter(f => ALL_GAMES.includes(f));

    // Ensure 'overall' is always included
    if (!validFavorites.includes('overall')) {
      validFavorites.unshift('overall');
    }

    // Limit to 8 favorites max
    const limitedFavorites = validFavorites.slice(0, 8);

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
