import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ATTENDANCE_LIFETIME_XP, WIN_LIFETIME_XP } from '@/lib/xp-constants';

export const dynamic = 'force-dynamic';

// Game configuration for display
const GAME_CONFIG: Record<string, { name: string; icon: string; color: string }> = {
  one_piece: { name: 'One Piece', icon: '🏴‍☠️', color: '#E63946' },
  gundam: { name: 'Gundam', icon: '🤖', color: '#3B82F6' },
  pokemon: { name: 'Pokémon', icon: '⚡', color: '#FACC15' },
  mtg: { name: 'Magic: The Gathering', icon: '✨', color: '#8B5CF6' },
  star_wars: { name: 'Star Wars', icon: '🌟', color: '#00d4ff' },
  star_wars_unlimited: { name: 'Star Wars Unlimited', icon: '🌟', color: '#00d4ff' },
  vanguard: { name: 'Vanguard', icon: '⚔️', color: '#ef4444' },
  uvs: { name: 'UVS', icon: '👊', color: '#f97316' },
  hololive: { name: 'Hololive', icon: '🎤', color: '#ff69b4' },
  riftbound: { name: 'Riftbound', icon: '🌀', color: '#22c55e' },
  lorcana: { name: 'Lorcana', icon: '🪄', color: '#EC4899' },
  weiss_schwarz: { name: 'Weiss Schwarz', icon: '🎴', color: '#e11d48' },
  union_arena: { name: 'Union Arena', icon: '🛡️', color: '#3b82f6' },
  flesh_and_blood: { name: 'Flesh & Blood', icon: '⚔️', color: '#dc2626' },
  warhammer: { name: 'Warhammer', icon: '🔨', color: '#ca8a04' },
  sw_legion: { name: 'SW Legion', icon: '🎖️', color: '#65a30d' },
  legion: { name: 'SW Legion', icon: '🎖️', color: '#65a30d' },
  dragonball: { name: 'Dragon Ball', icon: '🐉', color: '#f97316' },
  digimon: { name: 'Digimon', icon: '🦖', color: '#3b82f6' },
  yugioh: { name: 'Yu-Gi-Oh!', icon: '👁️', color: '#7c3aed' },
  general: { name: 'General', icon: '🎮', color: '#64748b' },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // Create client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch event details - USE EXPLICIT COLUMNS LIKE /api/events DOES
    const { data: event, error } = await supabase
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
        prizing
      `)
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found', details: error },
        { status: 404 }
      );
    }

    // Get interested count - use explicit column selection
    const { data: interests, error: interestError } = await supabase
      .from('event_interest')
      .select('id')
      .eq('event_id', eventId);
    
    const interestedCount = interests?.length || 0;

    // Format the event for public display
    const gameConfig = GAME_CONFIG[event.game_id || ''] || GAME_CONFIG.general;
    
    // Format in Pacific timezone (store timezone)
    const scheduledAt = new Date(event.scheduled_at);
    const formattedDate = scheduledAt.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = scheduledAt.toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const publicEvent = {
      id: event.id,
      name: event.name,
      description: event.description,
      date: formattedDate,
      time: formattedTime,
      scheduledAt: event.scheduled_at,
      endsAt: event.ends_at,
      game: {
        id: event.game_id,
        name: gameConfig.name,
        icon: gameConfig.icon,
        color: gameConfig.color,
      },
      entryFee: event.entry_fee ? `$${event.entry_fee}` : 'Free',
      isFree: !event.entry_fee || event.entry_fee === 0,
      maxSpots: event.max_players,
      hasStream: event.has_stream || false,
      twitchUrl: event.twitch_url,
      youtubeUrl: event.youtube_url,
      interestedCount: interestedCount || 0,
      attendanceXp: ATTENDANCE_LIFETIME_XP,
      winXp: WIN_LIFETIME_XP,
      prizing: event.prizing || [],
      location: 'Games of Martinez',
      address: '1155 Arnold Dr Ste E & F, Martinez, CA 94553',
    };

    return NextResponse.json({ event: publicEvent });
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
