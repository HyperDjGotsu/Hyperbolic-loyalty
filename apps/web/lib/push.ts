import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

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
    subs.map(async (sub) => {
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
