import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface FriendActivity {
  type: 'checkin' | 'xp' | 'placement';
  icon: string;
  headline: string;
  subtext?: string;
  date: string;
}

const GAME_ICONS: Record<string, string> = {
  one_piece: '🏴‍☠️',
  gundam: '🤖',
  pokemon: '⚡',
  mtg: '✨',
  star_wars: '🌟',
  star_wars_unlimited: '🌟',
  vanguard: '⚔️',
  uvs: '👊',
  hololive: '🎤',
  riftbound: '🌀',
  lorcana: '🪄',
  yugioh: '🃏',
  digimon: '🦖',
  weiss_schwarz: '🎴',
  weiss: '🎴',
  union_arena: '🏟️',
  warhammer: '⚔️',
  sw_legion: '🎖️',
  general: '🎮',
};

function placementLabel(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ activity: [] });

    // Resolve current player id
    const { data: me } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (!me) return NextResponse.json({ activity: [] });

    // Get accepted friend player IDs
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`);

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ activity: [] });
    }

    const friendIds = friendships.map(f =>
      f.requester_id === me.id ? f.addressee_id : f.requester_id
    );

    const activity: FriendActivity[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString();

    // --- Source 1: Friend event check-ins ---
    const { data: checkins } = await supabaseAdmin
      .from('event_attendances')
      .select(`
        checked_in_at,
        game_id,
        xp_awarded,
        player_id,
        players ( display_name ),
        events ( name )
      `)
      .in('player_id', friendIds)
      .gte('checked_in_at', cutoffStr)
      .order('checked_in_at', { ascending: false })
      .limit(10);

    for (const row of checkins || []) {
      const player = row.players as any;
      const event = row.events as any;
      if (!player?.display_name) continue;
      const gameIcon = (row.game_id ? GAME_ICONS[row.game_id] : null) || '🎮';
      activity.push({
        type: 'checkin',
        icon: gameIcon,
        headline: `${player.display_name} checked into ${event?.name || 'an event'}`,
        subtext: row.xp_awarded > 0 ? `+${row.xp_awarded} Guild Points` : undefined,
        date: row.checked_in_at,
      });
    }

    // --- Source 2: Friend XP events (wins, achievements, undefeated) ---
    const { data: xpEvents } = await supabaseAdmin
      .from('xp_ledger')
      .select(`
        created_at,
        source,
        final_xp,
        game_id,
        description,
        player_id,
        players ( display_name )
      `)
      .in('player_id', friendIds)
      .in('source', ['match_win', 'achievement', 'undefeated_bonus'])
      .gte('created_at', cutoffStr)
      .order('created_at', { ascending: false })
      .limit(10);

    const SOURCE_LABELS: Record<string, string> = {
      match_win: 'won a match',
      achievement: 'earned an achievement',
      undefeated_bonus: 'went undefeated',
    };

    for (const row of xpEvents || []) {
      const player = row.players as any;
      if (!player?.display_name) continue;
      const gameIcon = (row.game_id ? GAME_ICONS[row.game_id] : null) || '⚡';
      const verb = SOURCE_LABELS[row.source] || 'earned XP';
      activity.push({
        type: 'xp',
        icon: gameIcon,
        headline: `${player.display_name} ${verb}`,
        subtext: row.description || `+${row.final_xp} Guild Points`,
        date: row.created_at || new Date().toISOString(),
      });
    }

    // --- Source 3: Friend event placements ---
    const { data: placements } = await supabaseAdmin
      .from('circuit_qualifiers')
      .select(`
        placement,
        qualified_at,
        player_id,
        players ( display_name ),
        events!circuit_qualifiers_qualifier_event_id_fkey ( name, game_id )
      `)
      .in('player_id', friendIds)
      .lte('placement', 3)
      .gte('qualified_at', cutoffStr)
      .order('qualified_at', { ascending: false })
      .limit(5);

    for (const row of placements || []) {
      const player = row.players as any;
      const event = row.events as any;
      if (!player?.display_name || !event?.name) continue;
      const gameIcon = (event.game_id ? GAME_ICONS[event.game_id] : null) || '🏆';
      activity.push({
        type: 'placement',
        icon: gameIcon,
        headline: `${player.display_name} placed ${placementLabel(row.placement)} at ${event.name}`,
        date: row.qualified_at || new Date().toISOString(),
      });
    }

    // Sort by date desc, return top 5
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ activity: activity.slice(0, 5) });
  } catch (err) {
    console.error('friends-activity error:', err);
    return NextResponse.json({ activity: [] });
  }
}
