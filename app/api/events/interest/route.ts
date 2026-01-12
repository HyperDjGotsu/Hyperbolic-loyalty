import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Toggle interest in an event
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
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

    // Check if event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if already interested
    const { data: existingInterest } = await supabaseAdmin
      .from('event_interest')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', currentPlayer.id)
      .single();

    if (existingInterest) {
      // Remove interest
      const { error: deleteError } = await supabaseAdmin
        .from('event_interest')
        .delete()
        .eq('id', existingInterest.id);

      if (deleteError) {
        console.error('Error removing interest:', deleteError);
        return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        isInterested: false,
        message: 'Removed from interested',
      });
    } else {
      // Add interest
      const { error: insertError } = await supabaseAdmin
        .from('event_interest')
        .insert({
          event_id: eventId,
          player_id: currentPlayer.id,
        });

      if (insertError) {
        console.error('Error adding interest:', insertError);
        return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        isInterested: true,
        message: `You're interested in ${event.name}!`,
      });
    }

  } catch (error) {
    console.error('Event interest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
