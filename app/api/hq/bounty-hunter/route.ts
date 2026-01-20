import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Get current month key
function getCurrentMonthKey(): string {
  const now = new Date();
  const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pacificNow.getFullYear();
  const month = pacificNow.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

// GET - Get current bounty hunter event with participants
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const monthKey = getCurrentMonthKey();

    // Get current event
    const { data: event } = await (supabaseAdmin as any)
      .from('bounty_hunter_events')
      .select('*')
      .eq('month_key', monthKey)
      .single();

    if (!event) {
      return NextResponse.json({ event: null, wanted: [], hunters: [] });
    }

    // Get One Piece leaderboard for WANTED list (Top 5)
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp')
      .eq('game_id', 'one_piece');

    const playerXp: Record<string, number> = {};
    xpData?.forEach(entry => {
      if (entry.player_id) {
        playerXp[entry.player_id] = (playerXp[entry.player_id] || 0) + (entry.final_xp || 0);
      }
    });

    const sortedPlayers = Object.entries(playerXp)
      .sort(([, a], [, b]) => b - a);
    
    const wantedPlayerIds = sortedPlayers.slice(0, 5).map(([id]) => id);

    // Get WANTED player details
    const { data: wantedPlayers } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .in('id', wantedPlayerIds);

    const wantedMap: Record<string, string> = {};
    wantedPlayers?.forEach(p => {
      wantedMap[p.id] = p.display_name;
    });

    const wanted = wantedPlayerIds.map((playerId, index) => ({
      player_id: playerId,
      display_name: wantedMap[playerId] || 'Unknown',
      role: 'wanted' as const,
      xp: playerXp[playerId] || 0,
      rank: index + 1,
    }));

    // Get registered hunters
    const { data: participants } = await (supabaseAdmin as any)
      .from('bounty_hunter_participants')
      .select('player_id, role')
      .eq('event_id', event.id)
      .eq('role', 'hunter');

    const hunterIds = participants?.map((p: any) => p.player_id) || [];
    
    let hunters: any[] = [];
    if (hunterIds.length > 0) {
      const { data: hunterPlayers } = await supabaseAdmin
        .from('players')
        .select('id, display_name')
        .in('id', hunterIds);

      hunters = (hunterPlayers || []).map(p => ({
        player_id: p.id,
        display_name: p.display_name,
        role: 'hunter' as const,
        xp: playerXp[p.id] || 0,
      }));
    }

    return NextResponse.json({
      event,
      wanted,
      hunters,
    });
  } catch (error) {
    console.error('HQ Bounty Hunter GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create new bounty hunter event
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { event_date, opt_in_opens_at, opt_in_closes_at } = body;

    if (!event_date || !opt_in_opens_at || !opt_in_closes_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate month key from event date
    const eventDate = new Date(event_date);
    const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;

    // Check for existing event this month
    const { data: existing } = await (supabaseAdmin as any)
      .from('bounty_hunter_events')
      .select('id')
      .eq('month_key', monthKey)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Event already exists for this month' }, { status: 400 });
    }

    // Create event
    const { data: newEvent, error: insertError } = await (supabaseAdmin as any)
      .from('bounty_hunter_events')
      .insert({
        event_date,
        month_key: monthKey,
        opt_in_opens_at: new Date(opt_in_opens_at).toISOString(),
        opt_in_closes_at: new Date(opt_in_closes_at).toISOString(),
        status: 'upcoming',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    console.error('HQ Bounty Hunter POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Update event status
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { event_id, status } = body;

    if (!event_id || !status) {
      return NextResponse.json({ error: 'Missing event_id or status' }, { status: 400 });
    }

    const validStatuses = ['upcoming', 'opt_in_open', 'active', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('bounty_hunter_events')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', event_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HQ Bounty Hunter PUT error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Delete event
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
    }

    // Delete participants first (cascade should handle this, but being safe)
    await (supabaseAdmin as any)
      .from('bounty_hunter_participants')
      .delete()
      .eq('event_id', eventId);

    // Delete event
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('bounty_hunter_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HQ Bounty Hunter DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
