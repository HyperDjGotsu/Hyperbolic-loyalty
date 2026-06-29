import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Runs every hour — notifies players of events starting in the next 2 hours
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 90 * 60 * 1000);  // 1.5h from now
    const windowEnd = new Date(now.getTime() + 150 * 60 * 1000);   // 2.5h from now

    // Find events starting in the 2h window
    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, name, scheduled_at, game_id')
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString());

    if (!events?.length) return NextResponse.json({ sent: 0 });

    // Get all players for mass notification
    const { data: players } = await (supabaseAdmin as any)
      .from('players')
      .select('id, notification_preferences');

    if (!players?.length) return NextResponse.json({ sent: 0 });

    const DEFAULT_PREFS = { daily_rewards: true, events: true, leaderboard: true, social: true, store: true };
    const eligible = (players as { id: string; notification_preferences: Record<string, boolean> | null }[]).filter((p) => {
      const prefs = { ...DEFAULT_PREFS, ...(p.notification_preferences ?? {}) };
      return prefs.events;
    });

    let sent = 0;
    for (const event of events) {
      const startsAt = new Date(event.scheduled_at);
      const minutesUntil = Math.round((startsAt.getTime() - now.getTime()) / 60000);
      const timeLabel = minutesUntil >= 60
        ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
        : `${minutesUntil}m`;

      const rows: Record<string, unknown>[] = eligible.map((p) => ({
        player_id: p.id,
        type: 'event_reminder',
        title: `⏰ ${event.name} starts in ${timeLabel}`,
        message: `Head to the store — doors open soon!`,
        data: { event_id: event.id, event_name: event.name, scheduled_at: event.scheduled_at },
        is_read: false,
      }));

      for (let i = 0; i < rows.length; i += 100) {
        await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100) as any);
      }
      sent += rows.length;
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('event-reminders cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
