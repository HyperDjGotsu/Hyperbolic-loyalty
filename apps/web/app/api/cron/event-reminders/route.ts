import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendExpoPushToPlayers } from '@/lib/expo-push';

export const dynamic = 'force-dynamic';

// Runs every hour — notifies players of events starting in the next 1-13h window
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 60 * 60 * 1000);    // 1h from now
    const windowEnd = new Date(now.getTime() + 13 * 60 * 60 * 1000); // 13h from now

    const { data: events } = await supabaseAdmin
      .from('events')
      .select('id, name, scheduled_at, game_id, store_id')
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString());

    if (!events?.length) return NextResponse.json({ sent: 0 });

    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, notification_preferences, home_store_id');

    if (!players?.length) return NextResponse.json({ sent: 0 });

    const DEFAULT_PREFS = { daily_rewards: true, events: true, leaderboard: true, social: true, store: true };

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    let sent = 0;
    for (const event of events) {
      const startsAt = new Date(event.scheduled_at);
      const minutesUntil = Math.round((startsAt.getTime() - now.getTime()) / 60000);
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      const timeLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;

      // Only notify players whose home store matches this event's store
      const eligible = players.filter((p) => {
        if (event.store_id && p.home_store_id !== event.store_id) return false;
        const prefs = { ...DEFAULT_PREFS, ...((p.notification_preferences ?? {}) as Record<string, boolean>) };
        return prefs.events;
      });

      const eligibleIds = eligible.map((p) => p.id);

      const rows = eligible.map((p) => ({
        player_id: p.id,
        store_id: event.store_id ?? null,
        type: 'event_reminder',
        title: `⏰ ${event.name} starts in ${timeLabel}`,
        message: `Head to the store — doors open soon!`,
        data: { event_id: event.id, event_name: event.name, scheduled_at: event.scheduled_at },
        is_read: false,
      }));

      for (let i = 0; i < rows.length; i += 100) {
        await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100));
      }
      sent += rows.length;

      // Push idempotency: check if a reminder was already pushed for this event
      // in the past hour (guards against cron retry/duplicate execution).
      // Uses existing notification rows as proxy — no schema change required.
      const { count: alreadyPushed } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'event_reminder')
        .contains('data', { event_id: event.id })
        .gte('created_at', oneHourAgo);

      // alreadyPushed counts rows we just inserted + any from a prior run.
      // If prior run inserted rows (count > rows.length), skip push.
      if ((alreadyPushed ?? 0) > rows.length) {
        console.log(`[expo-push] skipping duplicate push for event ${event.id}`);
        continue;
      }

      try {
        const tokenCount = await sendExpoPushToPlayers(eligibleIds, {
          title: `⏰ ${event.name} starts in ${timeLabel}`,
          body: 'Head to the store — doors open soon!',
          data: { event_id: event.id, event_name: event.name, scheduled_at: event.scheduled_at },
          category: 'events',
        });
        console.log(`[expo-push] event-reminder: ${tokenCount} tokens for event ${event.id}`);
      } catch (err) {
        // Push failure must not affect the in-app notification count
        console.error('[expo-push] event-reminder dispatch error:', err);
      }
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('event-reminders cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
