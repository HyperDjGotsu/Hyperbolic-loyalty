import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET — fetch all qualifiers for a championship event (or all if no championship yet)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qualifierEventId = searchParams.get('qualifier_event_id');
  const championshipEventId = searchParams.get('championship_event_id');
  const orgSlug = searchParams.get('org') || 'ggc';

  const db = supabaseAdmin as any;

  let query = db
    .from('circuit_qualifiers')
    .select(`
      id,
      placement,
      has_bye,
      qualified_at,
      qualifier_event_id,
      championship_event_id,
      store_id,
      player_id,
      players (id, display_name, player_id, gems),
      stores (id, name, city, color, player_id_prefix),
      events!qualifier_event_id (id, name, scheduled_at)
    `)
    .order('placement', { ascending: true });

  if (qualifierEventId) query = query.eq('qualifier_event_id', qualifierEventId);
  if (championshipEventId) query = query.eq('championship_event_id', championshipEventId);

  const { data, error } = await query;

  if (error) {
    console.error('Circuit qualifiers fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch qualifiers' }, { status: 500 });
  }

  return NextResponse.json({ qualifiers: data || [] });
}

// POST — record final standings for a qualifier event (staff only)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      qualifier_event_id,
      store_id,
      championship_event_id,
      // Array of { player_id, placement } sorted by finish position
      standings,
      // How many top finishers qualify (default 5)
      qualify_count = 5,
    }: {
      qualifier_event_id: string;
      store_id: string;
      championship_event_id?: string;
      standings: Array<{ player_id: string; placement: number }>;
      qualify_count?: number;
    } = body;

    if (!qualifier_event_id || !store_id || !standings?.length) {
      return NextResponse.json({ error: 'qualifier_event_id, store_id, and standings are required' }, { status: 400 });
    }

    // Only insert qualifiers (top N) with has_bye = true
    const qualifiers = standings
      .filter(s => s.placement <= qualify_count)
      .map(s => ({
        qualifier_event_id,
        store_id,
        player_id: s.player_id,
        placement: s.placement,
        has_bye: true,
        championship_event_id: championship_event_id || null,
      }));

    const db = supabaseAdmin as any;
    const { data, error } = await db
      .from('circuit_qualifiers')
      .upsert(qualifiers, { onConflict: 'qualifier_event_id,player_id' })
      .select('id, player_id, placement, has_bye');

    if (error) {
      console.error('Circuit qualifiers insert error:', error);
      return NextResponse.json({ error: 'Failed to record qualifiers' }, { status: 500 });
    }

    return NextResponse.json({ qualifiers: data, count: data?.length || 0 });
  } catch (err) {
    console.error('Circuit qualifiers exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
