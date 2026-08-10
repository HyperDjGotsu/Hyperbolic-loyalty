import { supabaseAdmin } from '@/lib/supabase';
import type { NotificationCategory } from '@/lib/notifications';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface TokenRow {
  id: string;
  token: string;
  player_id: string;
}

async function dispatchBatch(messages: (ExpoPushMessage & { _tokenId: string })[]): Promise<void> {
  const payload = messages.map(({ _tokenId: _, ...msg }) => msg);

  let tickets: ExpoTicket[] = [];
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json() as { data: ExpoTicket[] };
    tickets = json.data ?? [];
  } catch (err) {
    console.error('[expo-push] fetch error:', err);
    return;
  }

  const staleTokenIds: string[] = [];
  tickets.forEach((ticket, i) => {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      staleTokenIds.push(messages[i]._tokenId);
    }
  });

  if (staleTokenIds.length > 0) {
    await supabaseAdmin.from('expo_push_tokens').delete().in('id', staleTokenIds);
  }
}

async function getPrefs(playerId: string): Promise<Record<string, boolean>> {
  const { data } = await supabaseAdmin
    .from('players')
    .select('notification_preferences')
    .eq('id', playerId)
    .single();
  return (data?.notification_preferences as Record<string, boolean>) ?? {};
}

const DEFAULT_PREFS: Record<NotificationCategory, boolean> = {
  daily_rewards: true,
  events: true,
  leaderboard: true,
  social: true,
  store: true,
};

function categoryAllowed(prefs: Record<string, boolean>, category: NotificationCategory): boolean {
  return prefs[category] ?? DEFAULT_PREFS[category];
}

export interface ExpoPushOptions {
  title: string;
  body: string;
  data?: Record<string, string>;
  category: NotificationCategory;
  sound?: 'default' | null;
  channelId?: string;
}

// Send Expo push to all active tokens for a single player, respecting preferences.
export async function sendExpoPushToPlayer(playerId: string, opts: ExpoPushOptions): Promise<void> {
  const prefs = await getPrefs(playerId);
  if (!categoryAllowed(prefs, opts.category)) return;

  const { data: tokens } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('id, token, player_id')
    .eq('player_id', playerId);

  if (!tokens?.length) return;
  await sendToTokens(tokens as TokenRow[], opts);
}

// Send Expo push to a specific pre-filtered list of player IDs.
// Preference checking is the CALLER's responsibility — no re-query here.
// Use this when the caller already has the eligible subset (avoids 2N queries).
export async function sendExpoPushToPlayers(playerIds: string[], opts: ExpoPushOptions): Promise<number> {
  if (!playerIds.length) return 0;
  const uniqueIds = Array.from(new Set(playerIds));

  const { data: tokens } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('id, token, player_id')
    .in('player_id', uniqueIds);

  if (!tokens?.length) return 0;
  // Deduplicate tokens — same physical device could be registered twice
  const seen = new Set<string>();
  const unique = (tokens as TokenRow[]).filter((t) => {
    if (seen.has(t.token)) return false;
    seen.add(t.token);
    return true;
  });
  await sendToTokens(unique, opts);
  return unique.length;
}

// Send Expo push to all players at a store, respecting preferences.
// Returns the token count dispatched.
export async function sendExpoPushToStorePlayers(storeId: string, opts: ExpoPushOptions): Promise<number> {
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, notification_preferences')
    .eq('home_store_id', storeId);

  if (!players?.length) return 0;

  const eligible = players.filter((p) =>
    categoryAllowed((p.notification_preferences as Record<string, boolean>) ?? {}, opts.category)
  );

  if (!eligible.length) return 0;

  const playerIds = eligible.map((p) => p.id);
  const { data: tokens } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('id, token, player_id')
    .in('player_id', playerIds);

  if (!tokens?.length) return 0;
  await sendToTokens(tokens as TokenRow[], opts);
  return tokens.length;
}

// Send Expo push to all players network-wide, respecting preferences.
// Returns the token count dispatched.
export async function sendExpoPushToAllPlayers(opts: ExpoPushOptions): Promise<number> {
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, notification_preferences');

  if (!players?.length) return 0;

  const eligible = players.filter((p) =>
    categoryAllowed((p.notification_preferences as Record<string, boolean>) ?? {}, opts.category)
  );

  if (!eligible.length) return 0;

  const playerIds = eligible.map((p) => p.id);
  const { data: tokens } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('id, token, player_id')
    .in('player_id', playerIds);

  if (!tokens?.length) return 0;
  await sendToTokens(tokens as TokenRow[], opts);
  return tokens.length;
}

async function sendToTokens(tokens: TokenRow[], opts: ExpoPushOptions): Promise<void> {
  const messages = tokens.map((t) => ({
    _tokenId: t.id,
    to: t.token,
    title: opts.title,
    body: opts.body,
    data: opts.data,
    sound: opts.sound ?? 'default',
    channelId: opts.channelId ?? 'default',
  }));

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    await dispatchBatch(messages.slice(i, i + BATCH_SIZE));
  }
}
