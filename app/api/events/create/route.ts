import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Staff check
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!player?.is_staff) {
      return NextResponse.json({ error: 'Staff only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      game_id,
      scheduled_at,
      ends_at,
      max_players,
      entry_fee,
      attendance_xp,
      event_type = 'regular',
      store_id,
    } = body;

    if (!name || !scheduled_at) {
      return NextResponse.json({ error: 'name and scheduled_at are required' }, { status: 400 });
    }

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .insert({
        name,
        description: description || null,
        game_id: game_id || null,
        scheduled_at,
        ends_at: ends_at || null,
        max_players: max_players || null,
        entry_fee: entry_fee || null,
        attendance_xp: attendance_xp || 20,
        status: 'scheduled',
        event_type,
        store_id: store_id || null,
      })
      .select('id, name, scheduled_at, event_type, store_id, status')
      .single();

    if (error) {
      console.error('Event create error:', error);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (err) {
    console.error('Event create exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
