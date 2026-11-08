import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendExpoPushToPlayers } from '@/lib/expo-push';
import { pushToPlayers } from '@/lib/push';
import { gameArtUrl } from '@/lib/games';
import type { Database } from '@/types/database.types';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = { daily_rewards: true, events: true, leaderboard: true, social: true, store: true };
const LIVE_STATUS = 'status.is.null,status.in.(scheduled,active)'; // skip cancelled and completed events

// Players who tapped "interested" on an event, limited to those with event notifications on.
async function interestedPlayerIds(eventIds: string[]): Promise<Map<string, string[]>> {
  const byEvent = new Map<string, string[]>();
  if (!eventIds.length) return byEvent;

  const { data: interest } = await supabaseAdmin
    .from('event_interest')
    .select('event_id, player_id')
    .in('event_id', eventIds);
  const playerIds = Array.from(new Set((interest ?? []).map((r) => r.player_id).filter((id): id is string => !!id)));
  if (!playerIds.length) return byEvent;

  const wantsEvents = new Set<string>();
  for (let i = 0; i < playerIds.length; i += 200) {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, notification_preferences')
      .in('id', playerIds.slice(i, i + 200));
    for (const p of players ?? []) {
      const prefs = { ...DEFAULT_PREFS, ...((p.notification_preferences ?? {}) as Record<string, boolean>) };
      if (prefs.events) wantsEvents.add(p.id);
    }
  }

  for (const r of interest ?? []) {
    if (!r.event_id || !r.player_id || !wantsEvents.has(r.player_id)) continue;
    byEvent.set(r.event_id, [...(byEvent.get(r.event_id) ?? []), r.player_id]);
  }
  return byEvent;
}

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

async function insertRows(rows: NotificationInsert[]) {
  for (let i = 0; i < rows.length; i += 100) {
    await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100));
  }
}

async function safePush(playerIds: string[], title: string, body: string, data: Record<string, string>) {
  try {
    const tokens = await sendExpoPushToPlayers(playerIds, { title, body, data, category: 'events' });
    console.log(`[expo-push] event-reminder: ${tokens} tokens`);
  } catch (err) {
    // Push failure must not affect the in-app notification count
    console.error('[expo-push] event-reminder dispatch error:', err);
  }
  // Website (Home Screen app) push. Never throws.
  await pushToPlayers(playerIds.map((playerId) => ({ playerId, title, body })));
}

// 11am Pacific: one nudge per player who is interested in an event still to come today.
// Scheduled at both 18:00 and 19:00 UTC so it lands at 11am through daylight saving; the other run exits.
async function morningDigest(now: Date) {
  const pacific = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d)
      .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});

  const parts = pacific(now);
  if (parts.hour !== '11') return { sent: 0, skipped: 'not 11am Pacific' };

  // End of today in Pacific: next midnight is 24h minus time already elapsed since midnight
  const minutesIntoDay = Number(parts.hour) * 60 + new Date(now).getUTCMinutes();
  const endOfDay = new Date(now.getTime() + (24 * 60 - minutesIntoDay) * 60 * 1000);

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id')
    .or(LIVE_STATUS)
    .gte('scheduled_at', now.toISOString())
    .lt('scheduled_at', endOfDay.toISOString());
  if (!events?.length) return { sent: 0 };

  const byEvent = await interestedPlayerIds(events.map((e) => e.id));
  const playerIds = Array.from(new Set(Array.from(byEvent.values()).flat()));
  if (!playerIds.length) return { sent: 0 };

  const title = 'Events today';
  const message = 'Just a reminder that you have events you showed interest in happening today.';
  await insertRows(playerIds.map((player_id) => ({
    player_id,
    type: 'event_reminder',
    title,
    message,
    data: { kind: 'morning' },
    is_read: false,
  })));
  await safePush(playerIds, title, message, { kind: 'morning' });
  return { sent: playerIds.length };
}

// Every 15 minutes: heads up for events starting in about an hour, to interested players only.
// The window is wider than the run gap and each (player, event) is only sent once, so a late run can't skip or double send.
async function hourBefore(now: Date) {
  const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

  const { data: events } = await supabaseAdmin
    .from('events')
    .select('id, name, scheduled_at, game_id, store_id, image_url')
    .or(LIVE_STATUS)
    .gte('scheduled_at', windowStart.toISOString())
    .lt('scheduled_at', windowEnd.toISOString());
  if (!events?.length) return { sent: 0 };

  const byEvent = await interestedPlayerIds(events.map((e) => e.id));
  let sent = 0;

  for (const event of events) {
    const interested = byEvent.get(event.id) ?? [];
    if (!interested.length) continue;

    const { data: already } = await supabaseAdmin
      .from('notifications')
      .select('player_id')
      .eq('type', 'event_reminder')
      .contains('data', { event_id: event.id, kind: 'hour' });
    const done = new Set((already ?? []).map((r) => r.player_id));
    const targets = interested.filter((id) => !done.has(id));
    if (!targets.length) continue;

    const title = 'Heads up';
    const message = `${event.name} is happening in an hour.`;
    await insertRows(targets.map((player_id) => ({
      player_id,
      store_id: event.store_id ?? null,
      type: 'event_reminder',
      title,
      message,
      data: { event_id: event.id, event_name: event.name, scheduled_at: event.scheduled_at, kind: 'hour', image_url: event.image_url || gameArtUrl(event.game_id) },
      is_read: false,
    })));
    await safePush(targets, title, message, { event_id: event.id, kind: 'hour' });
    sent += targets.length;
  }
  return { sent };
}

// GET ?mode=morning | hour (see vercel.json)
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mode = new URL(request.url).searchParams.get('mode');
    const now = new Date();
    if (mode === 'morning') return NextResponse.json(await morningDigest(now));
    if (mode === 'hour') return NextResponse.json(await hourBefore(now));
    return NextResponse.json({ error: 'mode must be morning or hour' }, { status: 400 });
  } catch (err) {
    console.error('event-reminders cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
