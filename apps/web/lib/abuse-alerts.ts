import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';

// Misuse checks for network admins. Everything is computed live from existing tables,
// so there is nothing to run on a schedule; thresholds are editable in HQ.
export interface AbuseSettings {
  referralsPer24h: number; // sign-ups credited to one referrer in 24 hours
  signupsPerHour: number; // new accounts network-wide in one hour
  verifiedPerStorePer24h: number; // players newly verified for one store in 24 hours (a leaked join code shows up here)
  xpPerPlayerPer24h: number; // lifetime XP one player earned in 24 hours
  unverifiedDays: number; // days a player may stay unverified before they show up as an alert
}

export const DEFAULT_ABUSE_SETTINGS: AbuseSettings = {
  referralsPer24h: 20,
  signupsPerHour: 30,
  verifiedPerStorePer24h: 30,
  xpPerPlayerPer24h: 1500,
  unverifiedDays: 7,
};

export function normalizeAbuseSettings(raw: unknown): AbuseSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_ABUSE_SETTINGS };
  for (const key of Object.keys(out) as (keyof AbuseSettings)[]) {
    const n = Number(src[key]);
    if (Number.isFinite(n)) out[key] = Math.min(100000, Math.max(1, Math.floor(n)));
  }
  return out;
}

export interface AbuseAlert {
  rule: keyof AbuseSettings;
  title: string;
  detail: string;
  count: number;
  threshold: number;
}

// Counts how many times each key appears and returns those at or above the threshold, biggest first.
export function countOver(keys: (string | null | undefined)[], threshold: number): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const k of keys) if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  return Array.from(counts.entries()).filter(([, c]) => c >= threshold).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function sumOver(rows: { key: string | null; value: number }[], threshold: number): { key: string; count: number }[] {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.key) sums.set(r.key, (sums.get(r.key) ?? 0) + r.value);
  return Array.from(sums.entries()).filter(([, s]) => s >= threshold).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

const ROW_CAP = 20000;

export async function loadAbuseSettings(): Promise<AbuseSettings> {
  const { data } = await supabaseAdmin.from('store_config').select('abuse_alert_settings').eq('id', 1).maybeSingle();
  return normalizeAbuseSettings(data?.abuse_alert_settings);
}

export async function runAbuseChecks(s: AbuseSettings): Promise<AbuseAlert[]> {
  const now = Date.now();
  const day = new Date(now - 24 * 3600_000).toISOString();
  const hour = new Date(now - 3600_000).toISOString();
  const alerts: AbuseAlert[] = [];

  const staleCutoff = new Date(now - s.unverifiedDays * 24 * 3600_000).toISOString();
  const [referred, signups, verified, xp, stale] = await Promise.all([
    supabaseAdmin.from('players').select('referred_by').not('referred_by', 'is', null).gte('created_at', day).limit(ROW_CAP),
    supabaseAdmin.from('players').select('id', { count: 'exact', head: true }).gte('created_at', hour),
    supabaseAdmin.from('players').select('home_store_id').not('home_store_verified_at', 'is', null).gte('home_store_verified_at', day).limit(ROW_CAP),
    supabaseAdmin.from('xp_ledger').select('player_id, final_xp').gte('created_at', day).limit(ROW_CAP),
    supabaseAdmin.from('players').select('display_name, player_id', { count: 'exact' }).is('home_store_verified_at', null).lte('created_at', staleCutoff).order('created_at', { ascending: true }).limit(5),
  ]);

  const refHits = countOver((referred.data ?? []).map(r => r.referred_by as string), s.referralsPer24h);
  const verHits = countOver((verified.data ?? []).map(r => r.home_store_id as string), s.verifiedPerStorePer24h);
  const xpHits = sumOver((xp.data ?? []).map(r => ({ key: r.player_id as string, value: r.final_xp as number })), s.xpPerPlayerPer24h);

  // Look up names only for the few flagged ids
  const playerIds = [...refHits.map(h => h.key), ...xpHits.map(h => h.key)];
  const storeIds = verHits.map(h => h.key);
  const [players, stores] = await Promise.all([
    playerIds.length ? supabaseAdmin.from('players').select('id, display_name, player_id').in('id', playerIds) : Promise.resolve({ data: [] as { id: string; display_name: string | null; player_id: string | null }[] }),
    storeIds.length ? supabaseAdmin.from('stores').select('id, name').in('id', storeIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const who = (id: string) => {
    const p = (players.data ?? []).find(x => x.id === id);
    return p ? `${p.display_name ?? 'Unknown'}${p.player_id ? ` (${p.player_id})` : ''}` : 'Unknown player';
  };
  const storeName = (id: string) => (stores.data ?? []).find(x => x.id === id)?.name ?? 'Unknown store';

  for (const h of refHits) alerts.push({ rule: 'referralsPer24h', title: 'Many referral sign-ups', detail: `${who(h.key)} was credited with ${h.count} sign-ups in 24 hours.`, count: h.count, threshold: s.referralsPer24h });
  if ((signups.count ?? 0) >= s.signupsPerHour) alerts.push({ rule: 'signupsPerHour', title: 'Burst of new accounts', detail: `${signups.count} accounts were created in the last hour.`, count: signups.count ?? 0, threshold: s.signupsPerHour });
  for (const h of verHits) alerts.push({ rule: 'verifiedPerStorePer24h', title: 'Many players verified for one store', detail: `${h.count} players were verified for ${storeName(h.key)} in 24 hours. If that is not expected, change the store's join code.`, count: h.count, threshold: s.verifiedPerStorePer24h });
  for (const h of xpHits) alerts.push({ rule: 'xpPerPlayerPer24h', title: 'Unusually high XP', detail: `${who(h.key)} earned ${h.count} XP in 24 hours.`, count: h.count, threshold: s.xpPerPlayerPer24h });

  const staleCount = stale.count ?? 0;
  if (staleCount > 0) {
    const names = (stale.data ?? []).map(p => `${p.display_name ?? 'Unknown'}${p.player_id ? ` (${p.player_id})` : ''}`).join(', ');
    alerts.push({
      rule: 'unverifiedDays',
      title: 'Players still unverified',
      detail: `${staleCount} ${staleCount === 1 ? 'player has' : 'players have'} been unverified for more than ${s.unverifiedDays} days, oldest first: ${names}${staleCount > 5 ? ', and more' : ''}. A staff check-in or the store's join code verifies them.`,
      count: staleCount,
      threshold: s.unverifiedDays,
    });
  }

  return alerts;
}
