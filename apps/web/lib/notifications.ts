import { supabaseAdmin } from '@/lib/supabase';
import { pushToPlayers } from '@/lib/push';

// Only these kinds of alert also buzz a phone. Everything else stays in the in-app Alerts list, which people see when
// they open the app. A friend sharing an event is worth a buzz (people choose their friends); new-event announcements
// and the like are frequent and would be noise. To make another kind push, add its type here.
const PUSH_TYPES = new Set<string>(['event_share']);

export type NotificationCategory = 'daily_rewards' | 'events' | 'leaderboard' | 'social' | 'store';

interface NotificationPrefs {
  daily_rewards: boolean;
  events: boolean;
  leaderboard: boolean;
  social: boolean;
  store: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  daily_rewards: true,
  events: true,
  leaderboard: true,
  social: true,
  store: true,
};

async function getPrefs(playerId: string): Promise<NotificationPrefs> {
  const { data } = await supabaseAdmin
    .from('players')
    .select('notification_preferences')
    .eq('id', playerId)
    .single();
  const prefs = (data?.notification_preferences ?? {}) as Partial<NotificationPrefs>;
  return { ...DEFAULT_PREFS, ...prefs };
}

export async function createNotification(
  playerId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory,
  storeId?: string
): Promise<void> {
  try {
    const prefs = await getPrefs(playerId);
    if (!prefs[category]) return;

    await supabaseAdmin.from('notifications').insert({
      player_id: playerId,
      type,
      title,
      message,
      data,
      is_read: false,
      store_id: storeId ?? null,
    });
    if (PUSH_TYPES.has(type)) await pushToPlayers([{ playerId, title, body: message }]);
  } catch (err) {
    console.error('createNotification error:', err);
  }
}

// Send a notification to all players at a specific store (filtered by home_store_id).
// Returns the number of players actually notified (after preference filtering).
export async function notifyStorePlayers(
  storeId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory
): Promise<number> {
  try {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, notification_preferences')
      .eq('home_store_id', storeId);

    if (!players?.length) return 0;

    const eligible = players.filter((p) => {
      const prefs = { ...DEFAULT_PREFS, ...((p.notification_preferences ?? {}) as Partial<NotificationPrefs>) };
      return prefs[category];
    });

    if (!eligible.length) return 0;

    const rows = eligible.map((p) => ({
      player_id: p.id,
      store_id: storeId,
      type,
      title,
      message,
      data,
      is_read: false,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100));
    }
    if (PUSH_TYPES.has(type)) await pushToPlayers(eligible.map((p) => ({ playerId: p.id, title, body: message })));

    return eligible.length;
  } catch (err) {
    console.error('notifyStorePlayers error:', err);
    return 0;
  }
}

// Send a notification to all players across the entire network.
// Returns the number of players actually notified (after preference filtering).
export async function notifyAllPlayers(
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory
): Promise<number> {
  try {
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, notification_preferences');

    if (!players?.length) return 0;

    const eligible = players.filter((p) => {
      const prefs = { ...DEFAULT_PREFS, ...((p.notification_preferences ?? {}) as Partial<NotificationPrefs>) };
      return prefs[category];
    });

    if (!eligible.length) return 0;

    const rows = eligible.map((p) => ({
      player_id: p.id,
      store_id: null,
      type,
      title,
      message,
      data,
      is_read: false,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100));
    }
    if (PUSH_TYPES.has(type)) await pushToPlayers(eligible.map((p) => ({ playerId: p.id, title, body: message })));

    return eligible.length;
  } catch (err) {
    console.error('notifyAllPlayers error:', err);
    return 0;
  }
}

export interface BulkNotification {
  playerId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string | null> | null;
  category: NotificationCategory;
  storeId?: string;
}

// Create many in-app notifications with a constant number of queries instead of
// two queries per player: preferences are loaded 200 players at a time, opted-out
// players are dropped, and the rest are inserted 100 rows at a time.
// Returns the number of notifications actually created.
export async function createNotificationsBulk(items: BulkNotification[]): Promise<number> {
  if (!items.length) return 0;
  try {
    const playerIds = Array.from(new Set(items.map((i) => i.playerId)));
    const prefsById = new Map<string, NotificationPrefs>();
    for (let i = 0; i < playerIds.length; i += 200) {
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('id, notification_preferences')
        .in('id', playerIds.slice(i, i + 200));
      for (const p of players ?? []) {
        prefsById.set(p.id, { ...DEFAULT_PREFS, ...((p.notification_preferences ?? {}) as Partial<NotificationPrefs>) });
      }
    }

    // A player we could not load gets the same default createNotification used (all categories on)
    const rows = items
      .filter((i) => (prefsById.get(i.playerId) ?? DEFAULT_PREFS)[i.category])
      .map((i) => ({
        player_id: i.playerId,
        type: i.type,
        title: i.title,
        message: i.message,
        data: i.data,
        is_read: false,
        store_id: i.storeId ?? null,
      }));

    let created = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100));
      if (error) console.error('createNotificationsBulk insert error:', error);
      else created += Math.min(100, rows.length - i);
    }
    await pushToPlayers(rows.filter((r) => PUSH_TYPES.has(r.type)).map((r) => ({ playerId: r.player_id, title: r.title, body: r.message })));
    return created;
  } catch (err) {
    console.error('createNotificationsBulk error:', err);
    return 0;
  }
}
