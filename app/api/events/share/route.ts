import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Share event with friends
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current player
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .eq('clerk_user_id', userId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const { eventId, friendIds } = await request.json();

    if (!eventId || !friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json({ error: 'Event ID and friend IDs required' }, { status: 400 });
    }

    // Get event details
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, scheduled_at, game_id')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify these are actually friends (accepted friendships)
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${player.id},addressee_id.eq.${player.id}`);

    const validFriendIds = new Set<string>();
    friendships?.forEach(f => {
      if (f.requester_id === player.id) {
        validFriendIds.add(f.addressee_id);
      } else {
        validFriendIds.add(f.requester_id);
      }
    });

    // Filter to only valid friends
    const actualFriendIds = friendIds.filter(id => validFriendIds.has(id));

    if (actualFriendIds.length === 0) {
      return NextResponse.json({ error: 'No valid friends selected' }, { status: 400 });
    }

    // Create notifications for each friend
    const notifications = actualFriendIds.map(friendId => ({
      player_id: friendId,
      type: 'event_share',
      title: 'Event Shared',
      message: `${player.display_name} shared an event with you: ${event.name}`,
      data: {
        event_id: event.id,
        event_name: event.name,
        scheduled_at: event.scheduled_at,
        from_player_id: player.id,
        from_player_name: player.display_name,
      },
      is_read: false,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating notifications:', insertError);
      // If notifications table doesn't exist, still return success
      // The share was "successful" even if we couldn't notify
      if (insertError.code === '42P01') {
        return NextResponse.json({ 
          success: true, 
          message: 'Event shared (notifications not enabled)',
          sharedWith: actualFriendIds.length,
        });
      }
      return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Event shared successfully',
      sharedWith: actualFriendIds.length,
    });

  } catch (error) {
    console.error('Share event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
