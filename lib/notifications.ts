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
  const { data } = await (supabaseAdmin as any)
    .from('players')
    .select('notification_preferences')
    .eq('id', playerId)
    .single();
  return { ...DEFAULT_PREFS, ...(data?.notification_preferences ?? {}) };
}

export async function createNotification(
  playerId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory
): Promise<void> {
  try {
    const prefs = await getPrefs(playerId);
    if (!prefs[category]) return;

    await supabaseAdmin.from('notifications').insert({
      player_id: playerId,
      type,
      title,
      message,
      data: data as any,
      is_read: false,
    });
  } catch (err) {
    console.error('createNotification error:', err);
  }
}

// Notify all players who have the given category enabled
export async function notifyAllPlayers(
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory
): Promise<void> {
  try {
    const { data: players } = await (supabaseAdmin as any)
      .from('players')
      .select('id, notification_preferences');

    if (!players?.length) return;

    const eligible = (players as { id: string; notification_preferences: Partial<NotificationPrefs> | null }[])
      .filter((p) => {
        const prefs = { ...DEFAULT_PREFS, ...(p.notification_preferences ?? {}) };
        return prefs[category];
      });

    if (!eligible.length) return;

    const rows = eligible.map((p) => ({
      player_id: p.id,
      type,
      title,
      message,
      data: data as any,
      is_read: false,
    }));

    // Insert in batches of 100 to avoid request size limits
    for (let i = 0; i < rows.length; i += 100) {
      await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100) as any);
    }
  } catch (err) {
    console.error('notifyAllPlayers error:', err);
  }
}
