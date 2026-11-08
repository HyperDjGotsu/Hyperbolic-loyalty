import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';
import { isAllowedPushEndpoint } from '@/lib/push-endpoint';

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_CONTACT ?? 'mailto:admin@playerpass.gg', pub, priv);
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  count?: number; // number to show on the app icon (home-screen app) when supported
}

// Send a web push to all active subscriptions for a player.
// Silently removes any subscriptions that have expired or been revoked.
export async function sendPushToPlayer(playerId: string, payload: PushPayload): Promise<void> {
  if (!initVapid()) return; // VAPID keys not configured — skip silently

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('player_id', playerId);

  if (!subs?.length) return;

  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.filter((s) => isAllowedPushEndpoint(s.endpoint)).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired/unregistered — remove it
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(sub.id);
        } else {
          console.error('web push error:', err?.message ?? err);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds);
  }
}

// Send a push to all players in a store.
export async function sendPushToStorePlayers(storeId: string, payload: PushPayload): Promise<void> {
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('home_store_id', storeId);

  if (!players?.length) return;
  await Promise.allSettled(players.map((p) => sendPushToPlayer(p.id, payload)));
}

// Send a push to all players network-wide.
export async function sendPushToAllPlayers(payload: PushPayload): Promise<void> {
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id');

  if (!players?.length) return;
  await Promise.allSettled(players.map((p) => sendPushToPlayer(p.id, payload)));
}

export interface WebPushItem {
  playerId: string;
  title: string;
  body: string;
  url?: string;
}

// Sends one push per item to every device the player has allowed notifications on, with the app-icon badge set to
// the player's unread count. Call it AFTER the in-app notification rows are saved so the count includes the new one.
// Only players with a saved device cost anything. It never throws: a failed push must not break the action that
// created the notification.
export async function pushToPlayers(items: WebPushItem[]): Promise<void> {
  try {
    if (!items.length || !initVapid()) return;

    const playerIds = Array.from(new Set(items.map((i) => i.playerId)));
    const subsByPlayer = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
    for (let i = 0; i < playerIds.length; i += 200) {
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, player_id, endpoint, p256dh, auth')
        .in('player_id', playerIds.slice(i, i + 200));
      for (const s of subs ?? []) {
        if (!isAllowedPushEndpoint(s.endpoint)) continue;
        const list = subsByPlayer.get(s.player_id) ?? [];
        list.push({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
        subsByPlayer.set(s.player_id, list);
      }
    }
    if (subsByPlayer.size === 0) return;

    // Unread count per subscribed player, for the icon badge
    const unread = new Map<string, number>();
    const subscribed = Array.from(subsByPlayer.keys());
    for (let i = 0; i < subscribed.length; i += 10) {
      await Promise.all(
        subscribed.slice(i, i + 10).map(async (id) => {
          const { count } = await supabaseAdmin
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('player_id', id)
            .eq('is_read', false);
          unread.set(id, count ?? 1);
        })
      );
    }

    const jobs: { sub: { id: string; endpoint: string; p256dh: string; auth: string }; body: string }[] = [];
    for (const item of items) {
      const subs = subsByPlayer.get(item.playerId);
      if (!subs) continue;
      const body = JSON.stringify({
        title: item.title,
        body: item.body,
        url: item.url ?? '/dashboard/notifications',
        tag: `pp-${Math.random().toString(36).slice(2)}`, // a unique tag so a new alert never replaces an earlier one
        count: Math.max(1, unread.get(item.playerId) ?? 1),
      });
      for (const sub of subs) jobs.push({ sub, body });
    }

    const stale = new Set<string>();
    for (let i = 0; i < jobs.length; i += 20) {
      await Promise.allSettled(
        jobs.slice(i, i + 20).map(async ({ sub, body }) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
          } catch (err: any) {
            if (err?.statusCode === 410 || err?.statusCode === 404) stale.add(sub.id);
            else console.error('web push error:', err?.message ?? err);
          }
        })
      );
    }
    if (stale.size > 0) await supabaseAdmin.from('push_subscriptions').delete().in('id', Array.from(stale));
  } catch (err) {
    console.error('pushToPlayers error:', err);
  }
}
