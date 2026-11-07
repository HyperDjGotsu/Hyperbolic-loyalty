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

/** Titles held by each of the given players (player row ids), in display order. Removed titles are left out. */
export async function getTitlesForPlayers(ids: string[]): Promise<Record<string, TitleKey[]>> {
  const out: Record<string, TitleKey[]> = {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  for (let i = 0; i < unique.length; i += 400) {
    const { data, error } = await supabaseAdmin
      .from('player_titles')
      .select('player_id, title_key')
      .is('revoked_at', null)
      .in('player_id', unique.slice(i, i + 400));
    if (error) { console.error('getTitlesForPlayers error:', error); continue; } // titles are decoration; never break a page over them
    const grouped: Record<string, string[]> = {};
    for (const r of data ?? []) (grouped[r.player_id] ??= []).push(r.title_key);
    for (const [id, keys] of Object.entries(grouped)) out[id] = sortTitles(keys);
  }
  return out;
}

/**
 * Gives a player a title. Returns whether the player newly holds it (false = they already did).
 * - The XP bonus is paid only when the title is given for the very first time. Taking a title away and giving it
 *   back later restores it without paying again.
 * - `opts.cap` is used by automatic awards: the cap is checked and the row inserted atomically in the database,
 *   and an automatic award never undoes a removal.
 */
export async function grantTitle(
  playerId: string,
  titleKey: string,
  grantedByAppUserId: string | null,
  opts: { cap?: number } = {}
): Promise<boolean> {
  if (!isTitleKey(titleKey)) throw new Error('Unknown title');
  const def = TITLES[titleKey];

  const { data: existing } = await supabaseAdmin
    .from('player_titles')
    .select('revoked_at')
    .eq('player_id', playerId)
    .eq('title_key', titleKey)
    .maybeSingle();

  if (existing) {
    if (!existing.revoked_at) return false;
    if (opts.cap !== undefined) return false; // automatic awards never undo a removal
    const { error } = await supabaseAdmin
      .from('player_titles')
      .update({ revoked_at: null, granted_by: grantedByAppUserId, granted_at: new Date().toISOString() })
      .eq('player_id', playerId)
      .eq('title_key', titleKey);
    if (error) throw error;
    if (titleKey === 'founding_member') await supabaseAdmin.from('players').update({ is_founding_member: true }).eq('id', playerId);
    return true; // restored, no second XP bonus
  }

  let inserted: boolean;
  if (opts.cap !== undefined) {
    const { data, error } = await supabaseAdmin.rpc('award_title_capped', {
      p_player: playerId, p_title: titleKey, p_cap: opts.cap, p_by: grantedByAppUserId,
    });
    if (error) throw error;
    inserted = data === true;
  } else {
    const { data, error } = await supabaseAdmin
      .from('player_titles')
      .upsert({ player_id: playerId, title_key: titleKey, granted_by: grantedByAppUserId }, { onConflict: 'player_id,title_key', ignoreDuplicates: true })
      .select('title_key');
    if (error) throw error;
    inserted = !!data && data.length > 0;
  }
  if (!inserted) return false;

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

/** Takes a title away. The row stays (marked removed) so it can never be re-awarded automatically or pay XP twice. */
export async function revokeTitle(playerId: string, titleKey: string): Promise<void> {
  if (!isTitleKey(titleKey)) throw new Error('Unknown title');
  const { error } = await supabaseAdmin
    .from('player_titles')
    .update({ revoked_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .eq('title_key', titleKey)
    .is('revoked_at', null);
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
    if (!settings.autoFounding || settings.foundingCap <= 0) return;
    await grantTitle(playerId, 'founding_member', null, { cap: settings.foundingCap });
  } catch (err) {
    console.error('maybeAwardFounding error:', err);
  }
}
