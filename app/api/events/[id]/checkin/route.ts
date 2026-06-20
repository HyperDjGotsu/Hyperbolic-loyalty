import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const body = await request.json() as { hyp_id?: string };

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, game_id, attendance_xp, status')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active' }, { status: 400 });
    }

    // Two auth paths: HYP-ID (kiosk NFC) or Clerk session (player's phone)
    let playerId: string;
    let playerName: string;

    if (body.hyp_id) {
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('id, display_name')
        .eq('player_id', body.hyp_id.toUpperCase())
        .single();

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      playerId = player.id;
      playerName = player.display_name || body.hyp_id;
    } else {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }

      const { data: player } = await supabaseAdmin
        .from('players')
        .select('id, display_name')
        .eq('clerk_user_id', userId)
        .single();

      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      playerId = player.id;
      playerName = player.display_name || 'Player';
    }

    // Deduplicate
    const { data: existing } = await supabaseAdmin
      .from('event_attendances')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already checked in', alreadyCheckedIn: true, playerName }, { status: 400 });
    }

    const xpAwarded = event.attendance_xp || 20;

    const { error: attendanceError } = await supabaseAdmin
      .from('event_attendances')
      .insert({
        event_id: eventId,
        player_id: playerId,
        game_id: event.game_id,
        xp_awarded: xpAwarded,
      } as any);

    if (attendanceError) {
      console.error('Attendance insert error:', attendanceError);
      return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 });
    }

    // Award XP — uses event_attendance source which exists in the enum
    await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: playerId,
        game_id: event.game_id,
        base_xp: xpAwarded,
        multiplier: 1,
        final_xp: xpAwarded,
        source: 'event_attendance' as any,
        description: `Event attendance: ${event.name}`,
      } as any);

    return NextResponse.json({ success: true, xpAwarded, playerName, eventName: event.name });
  } catch (error) {
    console.error('Event checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
