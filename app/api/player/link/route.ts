import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Generate random HYP-ID
function generatePlayerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'HYP-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, hypId, displayName, primaryGame } = body;

    // Check if user already has a linked player
    const { data: existingLink } = await supabase
      .from('players')
      .select('id, player_id')
      .eq('clerk_user_id', userId)
      .single();

    if (existingLink) {
      return NextResponse.json({ 
        error: 'Account already linked to a player',
        player_id: existingLink.player_id 
      }, { status: 400 });
    }

    if (action === 'link_existing') {
      // Link to an existing player by HYP-ID
      if (!hypId) {
        return NextResponse.json({ error: 'HYP-ID required' }, { status: 400 });
      }

      // Find the player
      const { data: player, error: findError } = await supabase
        .from('players')
        .select('*')
        .eq('player_id', hypId.toUpperCase())
        .single();

      if (findError || !player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      // Check if player is already linked to another Clerk account
      if (player.clerk_user_id && player.clerk_user_id !== userId) {
        return NextResponse.json({ 
          error: 'This player is already linked to another account' 
        }, { status: 400 });
      }

      // Link the player to this Clerk user
      const { error: updateError } = await supabase
        .from('players')
        .update({ clerk_user_id: userId })
        .eq('id', player.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: 'Failed to link player' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        player_id: player.player_id,
        displayName: player.display_name 
      });

    } else if (action === 'create_new') {
      // Create a new player
      if (!displayName) {
        return NextResponse.json({ error: 'Display name required' }, { status: 400 });
      }

      // Get Clerk user info for additional data
      const user = await currentUser();
      
      // Generate unique player_id
      let newPlayerId = generatePlayerId();
      let attempts = 0;
      
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('players')
          .select('id')
          .eq('player_id', newPlayerId)
          .single();
        
        if (!existing) break;
        newPlayerId = generatePlayerId();
        attempts++;
      }

      // Create the player
      const { data: newPlayer, error: createError } = await supabase
        .from('players')
        .insert({
          player_id: newPlayerId,
          display_name: displayName,
          clerk_user_id: userId,
          primary_game_id: primaryGame || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Create error:', createError);
        return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        player_id: newPlayer.player_id,
        displayName: newPlayer.display_name 
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in link route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
