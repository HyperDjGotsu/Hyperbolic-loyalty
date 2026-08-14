import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';


export const dynamic = 'force-dynamic';
// GET - Fetch pending friend requests (received)
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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

    // Get pending requests where current user is the addressee (they received the request)
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('friendships')
      .select('id, requester_id, created_at')
      .eq('addressee_id', currentPlayer.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching friend requests:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ requests: [], total: 0 });
    }

    // Get requester details
    const requesterIds = requests.map(r => r.requester_id);
    const { data: requesters, error: requestersError } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge')
      .in('id', requesterIds);

    if (requestersError) {
      console.error('Error fetching requester details:', requestersError);
      return NextResponse.json({ error: 'Failed to fetch requester details' }, { status: 500 });
    }

    // Build requests list with time ago
    const now = new Date();
    const requestsList = requests.map(request => {
      const requester = requesters?.find((r: any) => r.id === request.requester_id);
      const createdAt = new Date(request.created_at || Date.now());
      const diffMs = now.getTime() - createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeAgo = 'Just now';
      if (diffDays > 0) timeAgo = `${diffDays}d ago`;
      else if (diffHours > 0) timeAgo = `${diffHours}h ago`;
      else if (diffMins > 0) timeAgo = `${diffMins}m ago`;

      return {
        friendshipId: request.id,
        id: requester?.player_id || 'Unknown',
        odid: request.requester_id,
        name: requester?.display_name || 'Unknown',
        avatar: {
          type: 'emoji' as const,
          base: requester?.avatar_base || '😎',
          photoUrl: null,
          background: requester?.avatar_background || '#3b82f6',
          frame: requester?.avatar_frame || 'none',
          badge: requester?.avatar_badge || null,
        },
        timestamp: timeAgo,
        createdAt: request.created_at,
      };
    });

    return NextResponse.json({ 
      requests: requestsList,
      total: requestsList.length,
    });

  } catch (error) {
    console.error('Friend requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a friend request
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { targetPlayerId } = body; // This is the player_id or internal UUID

    if (!targetPlayerId) {
      return NextResponse.json({ error: 'Target player ID required' }, { status: 400 });
    }

    // Get current player
    const { data: currentPlayer, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !currentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get target player (try by player_id first, then by UUID)
    let targetPlayer;
    const { data: targetByHypId } = await supabaseAdmin
      .from('players')
      .select('id, privacy_allow_friend_requests')
      .eq('player_id', targetPlayerId.toUpperCase())
      .single();

    if (targetByHypId) {
      targetPlayer = targetByHypId;
    } else {
      const { data: targetByUuid } = await supabaseAdmin
        .from('players')
        .select('id, privacy_allow_friend_requests')
        .eq('id', targetPlayerId)
        .single();
      targetPlayer = targetByUuid;
    }

    if (!targetPlayer) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 });
    }

    // Check if target allows friend requests
    if (targetPlayer.privacy_allow_friend_requests === false) {
      return NextResponse.json({ error: 'This player is not accepting friend requests' }, { status: 403 });
    }

    // Check if they're the same person
    if (currentPlayer.id === targetPlayer.id) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
    }

    // Check if friendship already exists (in either direction)
    const { data: existingFriendship } = await supabaseAdmin
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${currentPlayer.id},addressee_id.eq.${targetPlayer.id}),and(requester_id.eq.${targetPlayer.id},addressee_id.eq.${currentPlayer.id})`)
      .single();

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 });
      } else if (existingFriendship.status === 'pending') {
        return NextResponse.json({ error: 'Friend request already pending' }, { status: 400 });
      } else if (existingFriendship.status === 'blocked') {
        return NextResponse.json({ error: 'Cannot send friend request' }, { status: 403 });
      }
    }

    // Create friend request
    const { error: insertError } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: currentPlayer.id,
        addressee_id: targetPlayer.id,
        status: 'pending',
      });

    if (insertError) {
      console.error('Error creating friend request:', insertError);
      return NextResponse.json({ error: 'Failed to send friend request' }, { status: 500 });
    }

    // Notify recipient (non-blocking)
    const senderName = (currentPlayer as { id: string; display_name?: string }).display_name ?? 'Someone';
    createNotification(
      targetPlayer.id,
      'friend_request',
      'New friend request',
      `${senderName} wants to connect with you.`,
      { from_player_id: currentPlayer.id, from_player_name: senderName },
      'social'
    ).catch(() => {});

    return NextResponse.json({ success: true, message: 'Friend request sent' });

  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
