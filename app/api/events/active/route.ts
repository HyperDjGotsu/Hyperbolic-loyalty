import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Debug: which Supabase URL is this route using?
  const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(-20) ?? 'missing';

  // Debug: dump what the DB actually has
  const { data: allStatuses } = await supabaseAdmin
    .from('events')
    .select('id, name, status')
    .order('scheduled_at', { ascending: true })
    .limit(5);

  // Step 1: find the active event — if this fails, nothing to return
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('id, name, game_id, attendance_xp, scheduled_at, status')
    .eq('status', 'active')
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error('Active event query error:', eventError);
    return NextResponse.json({ event: null, _debug: 'query_error', _err: eventError.message, _statuses: allStatuses, _url: _supabaseUrl });
  }

  if (!event) {
    return NextResponse.json({ event: null, _debug: 'no_active_event', _statuses: allStatuses, _url: _supabaseUrl });
  }

  // Step 2: game info (non-critical)
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, name, icon, color')
    .eq('id', event.game_id ?? '')
    .maybeSingle();

  // Step 3: attendance data — isolated so a missing table never kills the response
  let attendanceCount = 0;
  const recentCheckIns: Array<{ playerName: string; hypId: string; xpAwarded: number; checkedInAt: string }> = [];

  try {
    const db = supabaseAdmin as any;

    const { count } = await db
      .from('event_attendances')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id);

    attendanceCount = count || 0;

    const { data: recentRaw } = await db
      .from('event_attendances')
      .select('player_id, checked_in_at, xp_awarded')
      .eq('event_id', event.id)
      .order('checked_in_at', { ascending: false })
      .limit(5);

    if (recentRaw && recentRaw.length > 0) {
      const playerIds = (recentRaw as any[]).map((r: any) => r.player_id);
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('id, display_name, player_id')
        .in('id', playerIds);

      const playerMap = new Map(players?.map(p => [p.id, p]) || []);

      for (const r of recentRaw as any[]) {
        const player = playerMap.get(r.player_id);
        recentCheckIns.push({
          playerName: player?.display_name || 'Player',
          hypId: player?.player_id || '',
          xpAwarded: r.xp_awarded,
          checkedInAt: r.checked_in_at,
        });
      }
    }
  } catch (attendanceError) {
    console.error('event_attendances query failed (table may not exist yet):', attendanceError);
  }

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      gameId: event.game_id,
      attendanceXp: event.attendance_xp || 20,
      scheduledAt: event.scheduled_at,
      game: game ? { name: game.name, icon: game.icon || '🎮', color: game.color || '#3b82f6' } : null,
      attendanceCount,
      recentCheckIns,
    },
  });
}
