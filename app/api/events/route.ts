import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch upcoming events
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'upcoming'; // upcoming, past, all
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get current player if logged in
    let currentPlayerId: string | null = null;
    if (userId) {
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();
      currentPlayerId = player?.id || null;
    }

    // Build query
    let query = supabaseAdmin
      .from('events')
      .select(`
        id,
        name,
        game_id,
        description,
        scheduled_at,
        ends_at,
        max_players,
        current_players,
        entry_fee,
        pass_free_entry,
        status,
        has_stream,
        twitch_url,
        youtube_url,
        attendance_xp,
        win_xp
      `)
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    // Filter by status
    const now = new Date().toISOString();
    if (status === 'upcoming') {
      query = query.gte('scheduled_at', now).in('status', ['scheduled', 'active']);
    } else if (status === 'past') {
      query = query.lt('scheduled_at', now);
    }
    // 'all' returns everything

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Get game info for each event
    const gameIds = [...new Set(events?.map(e => e.game_id).filter(Boolean))];
    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, name, icon, color')
      .in('id', gameIds);

    const gameMap: Record<string, any> = {};
    games?.forEach(g => { gameMap[g.id] = g; });

    // Get interest counts and user's interest status
    let interestMap: Record<string, { count: number; isInterested: boolean }> = {};
    if (events && events.length > 0) {
      const eventIds = events.map(e => e.id);
      
      // Get counts
      const { data: interestCounts } = await supabaseAdmin
        .from('event_interest')
        .select('event_id')
        .in('event_id', eventIds);

      // Count per event
      const counts: Record<string, number> = {};
      interestCounts?.forEach(i => {
        counts[i.event_id] = (counts[i.event_id] || 0) + 1;
      });

      // Get user's interests
      let userInterests: Set<string> = new Set();
      if (currentPlayerId) {
        const { data: myInterests } = await supabaseAdmin
          .from('event_interest')
          .select('event_id')
          .eq('player_id', currentPlayerId)
          .in('event_id', eventIds);
        
        myInterests?.forEach(i => userInterests.add(i.event_id));
      }

      eventIds.forEach(id => {
        interestMap[id] = {
          count: counts[id] || 0,
          isInterested: userInterests.has(id),
        };
      });
    }

    // Build response
    const eventsWithDetails = events?.map(event => {
      const game = gameMap[event.game_id] || null;
      const interest = interestMap[event.id] || { count: 0, isInterested: false };
      
      // Determine if event is happening soon (within 2 hours)
      const eventTime = new Date(event.scheduled_at);
      const hoursUntil = (eventTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const isToday = eventTime.toDateString() === new Date().toDateString();
      const isTomorrow = eventTime.toDateString() === new Date(Date.now() + 86400000).toDateString();
      
      let dateLabel = eventTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (isToday) dateLabel = 'Today';
      if (isTomorrow) dateLabel = 'Tomorrow';

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        date: dateLabel,
        time: eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        scheduledAt: event.scheduled_at,
        endsAt: event.ends_at,
        game: game ? {
          id: game.id,
          name: game.name,
          icon: game.icon || '🎮',
          color: game.color || '#3b82f6',
        } : null,
        spots: event.max_players ? event.max_players - (event.current_players || 0) : null,
        maxSpots: event.max_players,
        currentPlayers: event.current_players || 0,
        entryFee: event.entry_fee ? `$${event.entry_fee}` : 'Free',
        isFree: !event.entry_fee || event.entry_fee === 0,
        passFreeEntry: event.pass_free_entry,
        status: event.status,
        hasStream: event.has_stream,
        twitchUrl: event.twitch_url,
        youtubeUrl: event.youtube_url,
        attendanceXp: event.attendance_xp || 20,
        winXp: event.win_xp || 10,
        interestedCount: interest.count,
        isInterested: interest.isInterested,
        isStartingSoon: hoursUntil > 0 && hoursUntil <= 2,
        isLive: event.status === 'active',
      };
    }) || [];

    return NextResponse.json({ events: eventsWithDetails });

  } catch (error) {
    console.error('Events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
