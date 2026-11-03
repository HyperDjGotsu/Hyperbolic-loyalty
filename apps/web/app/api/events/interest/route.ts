import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';


export const dynamic = 'force-dynamic';
// POST - Toggle interest in an event
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Get current player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check if interest already exists
    const { data: existing } = await supabaseAdmin
      .from('event_interest')
      .select('id')
      .eq('player_id', player.id)
      .eq('event_id', eventId)
      .single();

    if (existing) {
      // Remove interest
      const { error } = await supabaseAdmin
        .from('event_interest')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Error removing interest:', error);
        return NextResponse.json({ error: 'Failed to remove interest' }, { status: 500 });
      }

      return NextResponse.json({ 
        interested: false,
        message: 'Interest removed' 
      });
    } else {
      // Add interest
      const { error } = await supabaseAdmin
        .from('event_interest')
        .insert({
          player_id: player.id,
          event_id: eventId,
        });

      if (error) {
        console.error('Error adding interest:', error);
        return NextResponse.json({ error: 'Failed to add interest' }, { status: 500 });
      }

      return NextResponse.json({ 
        interested: true,
        message: 'Interest added' 
      });
    }

  } catch (error) {
    console.error('Interest toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Is the signed-in player interested in this event? (?eventId=<id>)
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const eventId = new URL(request.url).searchParams.get('eventId') ?? '';
    if (!/^[A-Za-z0-9-]{1,64}$/.test(eventId)) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from('event_interest')
      .select('id')
      .eq('player_id', player.id)
      .eq('event_id', eventId)
      .maybeSingle();

    return NextResponse.json({ interested: !!existing }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Interest state error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
