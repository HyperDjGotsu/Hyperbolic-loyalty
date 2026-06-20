import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, name, game_id, attendance_xp, scheduled_at, status')
      .eq('status', 'active')
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ event: null });
    }

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('id, name, icon, color')
      .eq('id', event.game_id)
      .maybeSingle();

    const { count } = await supabaseAdmin
      .from('event_attendances')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id);

    const { data: recentRaw } = await supabaseAdmin
      .from('event_attendances')
      .select('player_id, checked_in_at, xp_awarded')
      .eq('event_id', event.id)
      .order('checked_in_at', { ascending: false })
      .limit(5);

    const recentCheckIns: Array<{ playerName: string; hypId: string; xpAwarded: number; checkedInAt: string }> = [];

    if (recentRaw && recentRaw.length > 0) {
      const playerIds = recentRaw.map(r => r.player_id);
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('id, display_name, player_id')
        .in('id', playerIds);

      const playerMap = new Map(players?.map(p => [p.id, p]) || []);

      for (const r of recentRaw) {
        const player = playerMap.get(r.player_id);
        recentCheckIns.push({
          playerName: player?.display_name || 'Player',
          hypId: player?.player_id || '',
          xpAwarded: r.xp_awarded,
          checkedInAt: r.checked_in_at,
        });
      }
    }

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        gameId: event.game_id,
        attendanceXp: event.attendance_xp || 20,
        scheduledAt: event.scheduled_at,
        game: game ? { name: game.name, icon: game.icon || '🎮', color: game.color || '#3b82f6' } : null,
        attendanceCount: count || 0,
        recentCheckIns,
      },
    });
  } catch (error) {
    console.error('Active event error:', error);
    return NextResponse.json({ event: null });
  }
}
