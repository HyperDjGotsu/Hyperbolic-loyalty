import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST - Cancel a sent pending friend request
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { targetPlayerId } = body; // UUID of the player you sent the request to

    if (!targetPlayerId) {
      return NextResponse.json({ error: 'Target player ID required' }, { status: 400 });
    }

    const { data: currentPlayer, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !currentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('requester_id', currentPlayer.id)
      .eq('addressee_id', targetPlayerId)
      .eq('status', 'pending');

    if (deleteError) {
      console.error('Error cancelling friend request:', deleteError);
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Cancel request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
