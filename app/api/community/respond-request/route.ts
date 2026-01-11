import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Accept or decline a friend request
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { friendshipId, action } = body;

    if (!friendshipId) {
      return NextResponse.json({ error: 'Friendship ID required' }, { status: 400 });
    }

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "accept" or "decline"' }, { status: 400 });
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

    // Get the friendship and verify the current user is the addressee
    const { data: friendship, error: friendshipError } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendshipId)
      .single();

    if (friendshipError || !friendship) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Only the addressee can accept/decline
    if (friendship.addressee_id !== currentPlayer.id) {
      return NextResponse.json({ error: 'Not authorized to respond to this request' }, { status: 403 });
    }

    // Check if already processed
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 });
    }

    // Update the friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const { error: updateError } = await supabaseAdmin
      .from('friendships')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', friendshipId);

    if (updateError) {
      console.error('Error updating friendship:', updateError);
      return NextResponse.json({ error: 'Failed to update friend request' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: action === 'accept' ? 'Friend request accepted!' : 'Friend request declined',
      status: newStatus,
    });

  } catch (error) {
    console.error('Respond to friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
