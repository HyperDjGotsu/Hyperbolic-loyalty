import { supabaseAdmin } from '@/lib/supabase';

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

    return eligible.length;
  } catch (err) {
    console.error('notifyAllPlayers error:', err);
    return 0;
  }
}
