import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ATTENDANCE_LIFETIME_XP, WIN_LIFETIME_XP } from '@/lib/xp-constants';

export const dynamic = 'force-dynamic';

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
        win_xp,
        prizing,
        store_id
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

    const storeId = searchParams.get('store_id');
    const networkOnly = searchParams.get('network') === 'true';
    if (networkOnly) {
      query = query.is('store_id', null);
    } else if (storeId) {
      query = query.eq('store_id', storeId);
    }

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

    // Get all interest data with player info
    const eventIds = events.map(e => e.id);
    
    const { data: allInterests } = await supabaseAdmin
      .from('event_interest')
      .select(`
        event_id,
        player_id,
        players (
          id,
          display_name,
          avatar_config
        )
      `)
      .in('event_id', eventIds);

    // Get user's friends (accepted friendships only)
    let friendIds: Set<string> = new Set();
    if (currentPlayerId) {
      const { data: friendships } = await supabaseAdmin
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentPlayerId},addressee_id.eq.${currentPlayerId}`);
      
      friendships?.forEach(f => {
        if (f.requester_id === currentPlayerId) {
          friendIds.add(f.addressee_id);
        } else {
          friendIds.add(f.requester_id);
        }
      });
    }

    // Build interest data per event
    const interestData: Record<string, {
      count: number;
      isInterested: boolean;
      friends: Array<{ id: string; name: string; avatar: any }>;
    }> = {};

    eventIds.forEach(eventId => {
      interestData[eventId] = {
        count: 0,
        isInterested: false,
        friends: [],
      };
    });

    allInterests?.forEach((interest: any) => {
      const eventId = interest.event_id;
      const playerId = interest.player_id;
      const player = interest.players;

      if (!eventId || !interestData[eventId]) return;

      interestData[eventId].count++;

      // Check if this is the current user
      if (playerId === currentPlayerId) {
        interestData[eventId].isInterested = true;
      }

      // Check if this is a friend
      if (friendIds.has(playerId) && player) {
        interestData[eventId].friends.push({
          id: player.id,
          name: player.display_name || 'Player',
          avatar: player.avatar_config || {},
        });
      }
    });

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
      const interest = interestData[event.id] || { count: 0, isInterested: false, friends: [] };
      
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
        attendanceXp: ATTENDANCE_LIFETIME_XP,
        winXp: WIN_LIFETIME_XP,
        interestedCount: interest.count,
        isInterested: interest.isInterested,
        interestedFriends: interest.friends,
        isStartingSoon: hoursUntil > 0 && hoursUntil <= 2,
        isLive: event.status === 'active',
        prizing: event.prizing || null,
        isNetworkEvent: event.store_id === null,
      };
    });

    return NextResponse.json({ events: eventsWithDetails });

  } catch (error) {
    console.error('Events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
