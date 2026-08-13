import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface StoreUpdate {
  type: 'winner' | 'new_event' | 'broadcast';
  icon: string;
  label: string;
  headline: string;
  subtext?: string;
  date: string;
  link?: string;
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    const updates: StoreUpdate[] = [];

    // --- Source 1: Circuit qualifier placements (verified FK to events.id) ---
    {
      let q = supabaseAdmin
        .from('circuit_qualifiers')
        .select(`
          placement,
          qualified_at,
          qualifier_event_id,
          player_id,
          players ( display_name ),
          events!circuit_qualifiers_qualifier_event_id_fkey ( name, game_id, store_id )
        `)
        .lte('placement', 3)
        .order('qualified_at', { ascending: false })
        .limit(3);

      if (storeId) q = q.eq('store_id', storeId);

      const { data: qualifiers } = await q;

      for (const row of qualifiers || []) {
        const event = row.events as any;
        const player = row.players as any;
        if (!player?.display_name || !event?.name) continue;
        updates.push({
          type: 'winner',
          icon: GAME_ICONS[event.game_id] || '🏆',
          label: 'Event Winner',
          headline: `${player.display_name} placed ${placementLabel(row.placement)} at ${event.name}`,
          date: row.qualified_at || new Date().toISOString(),
          link: `/event/${row.qualifier_event_id}`,
        });
      }
    }

    // --- Source 2: Recently added events (last 14 days) ---
    {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);

      let q = supabaseAdmin
        .from('events')
        .select('id, name, scheduled_at, game_id, created_at')
        .gte('created_at', cutoff.toISOString())
        .in('status', ['scheduled', 'active'])
        .order('created_at', { ascending: false })
        .limit(2);

      if (storeId) {
        q = q.eq('store_id', storeId);
      }

      const { data: newEvents } = await q;

      for (const ev of newEvents || []) {
        const scheduledDate = new Date(ev.scheduled_at).toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        });
        updates.push({
          type: 'new_event',
          icon: (ev.game_id ? GAME_ICONS[ev.game_id] : null) || '📅',
          label: 'New Event',
          headline: ev.name,
          subtext: scheduledDate,
          date: ev.created_at || ev.scheduled_at,
          link: `/event/${ev.id}`,
        });
      }
    }

    // --- Source 3: Broadcasts (store-scoped + network-wide) ---
    {
      let q = supabaseAdmin
        .from('broadcasts')
        .select('id, title, message, created_at, scope, store_id')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: allBroadcasts } = await q;

      const relevant = (allBroadcasts || []).filter(b => {
        if (b.scope === 'network') return true;
        if (b.scope === 'store' && storeId && b.store_id === storeId) return true;
        return false;
      }).slice(0, 2);

      for (const b of relevant) {
        updates.push({
          type: 'broadcast',
          icon: '📢',
          label: b.scope === 'network' ? 'Network Update' : 'Store Update',
          headline: b.title,
          subtext: b.message.length > 80 ? b.message.slice(0, 77) + '…' : b.message,
          date: b.created_at,
        });
      }
    }

    // Sort all by date descending, return up to 3 (or fewer — no padding)
    updates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const top = updates.slice(0, 3);

    return NextResponse.json({ updates: top });
  } catch (err) {
    console.error('store-updates error:', err);
    return NextResponse.json({ updates: [] });
  }
}
