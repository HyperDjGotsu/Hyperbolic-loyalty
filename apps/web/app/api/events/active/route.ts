import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ATTENDANCE_LIFETIME_XP } from '@/lib/xp-constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('store_id');

  // Find the active event — use .in() to match the working pattern in /api/events
  let query = supabaseAdmin
    .from('events')
    .select('id, name, game_id, attendance_xp, scheduled_at, status')
    .in('status', ['active'])
    .order('scheduled_at', { ascending: true })
    .limit(1);

  if (storeId) {
    query = query.eq('store_id', storeId);
  }

  const { data: activeEvents, error: eventError } = await query;

  if (eventError) {
    console.error('Active event query error:', eventError);
    return NextResponse.json({ event: null });
  }

  const event = activeEvents?.[0] ?? null;

  if (!event) {
    return NextResponse.json({ event: null });
  }

  const { data: game } = await supabaseAdmin
    .from('games')
    .select('id, name, icon, color')
    .eq('id', event.game_id ?? '')
    .maybeSingle();

  // Attendance data — isolated so a missing table never kills the response
  let attendanceCount = 0;
  const recentCheckIns: Array<{ playerName: string; playerId: string; xpAwarded: number; checkedInAt: string }> = [];

  try {
    const { count } = await supabaseAdmin
      .from('event_attendances')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id);

    attendanceCount = count || 0;

    const { data: recentRaw } = await supabaseAdmin
      .from('event_attendances')
      .select('player_id, checked_in_at, xp_awarded')
      .eq('event_id', event.id)
      .order('checked_in_at', { ascending: false })
      .limit(5);

    if (recentRaw && recentRaw.length > 0) {
      const playerIds = recentRaw.map((r) => r.player_id).filter((id): id is string => id !== null);
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('id, display_name, player_id')
        .in('id', playerIds);

      const playerMap = new Map(players?.map(p => [p.id, p]) || []);

      for (const r of recentRaw) {
        const player = r.player_id ? playerMap.get(r.player_id) : undefined;
        recentCheckIns.push({
          playerName: player?.display_name || 'Player',
          playerId: player?.player_id || '',
          xpAwarded: r.xp_awarded ?? 0,
          checkedInAt: r.checked_in_at ?? '',
        });
      }
    }
  } catch (attendanceError) {
    console.error('event_attendances query failed:', attendanceError);
  }

  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      gameId: event.game_id,
      attendanceXp: ATTENDANCE_LIFETIME_XP,
      scheduledAt: event.scheduled_at,
      game: game ? { name: game.name, icon: game.icon || '🎮', color: game.color || '#3b82f6' } : null,
      attendanceCount,
      recentCheckIns,
    },
  });
}
