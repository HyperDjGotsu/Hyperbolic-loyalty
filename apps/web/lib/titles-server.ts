import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { TITLES, isTitleKey, sortTitles, type TitleKey } from '@/lib/titles';

export interface TitleSettings {
  autoFounding: boolean; // new verified players become Founding Members until the cap is reached
  foundingCap: number;
}
export const DEFAULT_TITLE_SETTINGS: TitleSettings = { autoFounding: true, foundingCap: 100 };

export function normalizeTitleSettings(raw: unknown): TitleSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cap = Math.floor(Number(src.foundingCap));
  return {
    autoFounding: typeof src.autoFounding === 'boolean' ? src.autoFounding : DEFAULT_TITLE_SETTINGS.autoFounding,
    foundingCap: Number.isFinite(cap) ? Math.min(100000, Math.max(0, cap)) : DEFAULT_TITLE_SETTINGS.foundingCap,
  };
}

export async function loadTitleSettings(): Promise<TitleSettings> {
  const { data } = await supabaseAdmin.from('store_config').select('title_settings').eq('id', 1).maybeSingle();
  return normalizeTitleSettings(data?.title_settings);
}

/** Titles held by each of the given players (player row ids), in display order. */
export async function getTitlesForPlayers(ids: string[]): Promise<Record<string, TitleKey[]>> {
  const out: Record<string, TitleKey[]> = {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 400) {
    const { data, error } = await supabaseAdmin
      .from('player_titles')
      .select('player_id, title_key')
      .in('player_id', unique.slice(i, i + 400));
    if (error) { console.error('getTitlesForPlayers error:', error); continue; } // titles are decoration; never break a page over them
    const grouped: Record<string, string[]> = {};
    for (const r of data ?? []) (grouped[r.player_id] ??= []).push(r.title_key);
    for (const [id, keys] of Object.entries(grouped)) out[id] = sortTitles(keys);
  }
  return out;
}

/**
 * Gives a player a title. The first time only, they also get the title's XP bonus.
 * Returns whether it was newly granted (false = they already held it).
 */
export async function grantTitle(playerId: string, titleKey: string, grantedByAppUserId: string | null): Promise<boolean> {
  if (!isTitleKey(titleKey)) throw new Error('Unknown title');
  const def = TITLES[titleKey];

  const { data: inserted, error } = await supabaseAdmin
    .from('player_titles')
    .upsert({ player_id: playerId, title_key: titleKey, granted_by: grantedByAppUserId }, { onConflict: 'player_id,title_key', ignoreDuplicates: true })
    .select('title_key');
  if (error) throw error;
  if (!inserted || inserted.length === 0) return false;

  if (titleKey === 'founding_member') {
    await supabaseAdmin.from('players').update({ is_founding_member: true }).eq('id', playerId);
  }

  const { data: player } = await supabaseAdmin.from('players').select('home_store_id').eq('id', playerId).maybeSingle();
  const { error: xpErr } = await supabaseAdmin.from('xp_ledger').insert({
    player_id: playerId,
    game_id: 'general',
    base_xp: def.xp,
    final_xp: def.xp,
    multiplier: 1,
    description: `${def.label} title bonus`,
    source: 'achievement',
    store_id: player?.home_store_id ?? null,
  });
  if (xpErr) console.error('title XP insert failed:', xpErr);

  createNotification(
    playerId,
    'title',
    `New title: ${def.label}`,
    `${def.blurb}. +${def.xp} XP.`,
    { title_key: titleKey },
    'store'
  ).catch(() => {});

  return true;
}

export async function revokeTitle(playerId: string, titleKey: string): Promise<void> {
  if (!isTitleKey(titleKey)) throw new Error('Unknown title');
  const { error } = await supabaseAdmin.from('player_titles').delete().eq('player_id', playerId).eq('title_key', titleKey);
  if (error) throw error;
  if (titleKey === 'founding_member') {
    await supabaseAdmin.from('players').update({ is_founding_member: false }).eq('id', playerId);
  }
  // Bonus XP already paid is left alone: it is a ledger entry and ledger entries are never rewritten.
}

/** Called when a player becomes verified. Awards Founding Member while the automatic window is open. Never throws. */
export async function maybeAwardFounding(playerId: string): Promise<void> {
  try {
    const settings = await loadTitleSettings();
    if (!settings.autoFounding) return;
    const { count } = await supabaseAdmin
      .from('player_titles')
      .select('player_id', { count: 'exact', head: true })
      .eq('title_key', 'founding_member');
    if ((count ?? 0) >= settings.foundingCap) return;
    await grantTitle(playerId, 'founding_member', null);
  } catch (err) {
    console.error('maybeAwardFounding error:', err);
  }
}
