import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';


export const dynamic = 'force-dynamic';
// POST - Unfriend someone
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { friendId } = body; // UUID of friend to remove

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID required' }, { status: 400 });
    }

    // Get current player
    const { data: currentPlayer, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !currentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Find and delete the friendship (could be in either direction)
    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${currentPlayer.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${currentPlayer.id})`)
      .eq('status', 'accepted');

    if (deleteError) {
      console.error('Error removing friendship:', deleteError);
      return NextResponse.json({ error: 'Failed to unfriend' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Friend removed',
    });

  } catch (error) {
    console.error('Unfriend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
