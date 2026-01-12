import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// Store timezone - all events are in Pacific
const STORE_TIMEZONE = 'America/Los_Angeles';

// GET - Fetch upcoming events
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'upcoming'; // upcoming, past, all
    const limit = parseInt(searchParams.get('limit') || '50');

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

    if (!events || events.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Get game info for each event
    const gameIds: string[] = [];
    events.forEach(e => {
      if (e.game_id && !gameIds.includes(e.game_id)) {
        gameIds.push(e.game_id);
      }
    });

    const gameMap: Record<string, any> = {};
    if (gameIds.length > 0) {
      const { data: games } = await supabaseAdmin
        .from('games')
        .select('id, name, icon, color')
        .in('id', gameIds);
      
      games?.forEach(g => { gameMap[g.id] = g; });
    }

    // Get interest counts and user's interest status
    const eventIds = events.map(e => e.id);
    
    // Get counts
    const { data: interestCounts } = await supabaseAdmin
      .from('event_interest')
      .select('event_id')
      .in('event_id', eventIds);

    // Count per event
    const counts: Record<string, number> = {};
    interestCounts?.forEach(i => {
      if (i.event_id) {
        counts[i.event_id] = (counts[i.event_id] || 0) + 1;
      }
    });

    // Get user's interests
    const userInterests: Set<string> = new Set();
    if (currentPlayerId) {
      const { data: myInterests } = await supabaseAdmin
        .from('event_interest')
        .select('event_id')
        .eq('player_id', currentPlayerId)
        .in('event_id', eventIds);
      
      myInterests?.forEach(i => {
        if (i.event_id) {
          userInterests.add(i.event_id);
        }
      });
    }

    // Helper to get current time in store timezone
    const nowInStore = new Date().toLocaleString('en-US', { timeZone: STORE_TIMEZONE });
    const nowDate = new Date(nowInStore);
    const todayStr = nowDate.toDateString();
    const tomorrowDate = new Date(nowDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toDateString();

    // Build response
    const eventsWithDetails = events.map(event => {
      const game = event.game_id ? gameMap[event.game_id] : null;
      const interestCount = counts[event.id] || 0;
      const isInterested = userInterests.has(event.id);
      
      // Convert event time to store timezone for display
      const eventTime = new Date(event.scheduled_at);
      const hoursUntil = (eventTime.getTime() - Date.now()) / (1000 * 60 * 60);
      
      // Get event date string in store timezone
      const eventDateInStore = eventTime.toLocaleDateString('en-US', { 
        timeZone: STORE_TIMEZONE,
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const eventDateStr = eventTime.toLocaleDateString('en-US', { timeZone: STORE_TIMEZONE });
      const eventDateObj = new Date(eventDateStr);
      
      // Check if today/tomorrow in store timezone
      const isToday = eventDateObj.toDateString() === todayStr;
      const isTomorrow = eventDateObj.toDateString() === tomorrowStr;
      
      let dateLabel = eventDateInStore;
      if (isToday) dateLabel = 'Today';
      if (isTomorrow) dateLabel = 'Tomorrow';

      // Format time in store timezone
      const timeStr = eventTime.toLocaleTimeString('en-US', { 
        timeZone: STORE_TIMEZONE,
        hour: 'numeric', 
        minute: '2-digit' 
      });

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        date: dateLabel,
        time: timeStr,
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
        isFree: !event.entry_fee || Number(event.entry_fee) === 0,
        passFreeEntry: event.pass_free_entry,
        status: event.status,
        hasStream: event.has_stream,
        twitchUrl: event.twitch_url,
        youtubeUrl: event.youtube_url,
        attendanceXp: event.attendance_xp || 20,
        winXp: event.win_xp || 10,
        interestedCount: interestCount,
        isInterested: isInterested,
        isStartingSoon: hoursUntil > 0 && hoursUntil <= 2,
        isLive: event.status === 'active',
      };
    });

    return NextResponse.json({ events: eventsWithDetails });

  } catch (error) {
    console.error('Events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
