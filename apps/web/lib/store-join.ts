import 'server-only';
import { randomInt } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

// Store join codes keep strangers from claiming a store they have never visited.
// Codes live in store_join_codes (service role only). A player is "verified" for their home store
// once they join with the code, check in at an event there, or staff vouch for them.

// No O/0/I/1/L so a code read off a sign is hard to mistype.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Uppercases and strips spaces/dashes. Returns null if the result cannot be a join code. */
export function normalizeJoinCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}

export type JoinStore = { id: string; name: string; city: string | null; slug: string | null; color: string | null };

export async function findStoreByJoinCode(code: string): Promise<JoinStore | null> {
  const { data: row } = await supabaseAdmin
    .from('store_join_codes')
    .select('store_id')
    .eq('code', code)
    .maybeSingle();
  if (!row) return null;
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, name, city, slug, color')
    .eq('id', row.store_id)
    .eq('is_active', true)
    .maybeSingle();
  return store ?? null;
}

/** Returns the store's code, creating one if the store has none yet. */
export async function getJoinCode(storeId: string): Promise<{ code: string; rotatedAt: string } | null> {
  const { data } = await supabaseAdmin
    .from('store_join_codes')
    .select('code, rotated_at')
    .eq('store_id', storeId)
    .maybeSingle();
  if (data) return { code: data.code, rotatedAt: data.rotated_at };
  return setJoinCode(storeId);
}

/** Replaces the store's code with a fresh one. The old code stops working immediately. */
export async function setJoinCode(storeId: string): Promise<{ code: string; rotatedAt: string } | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode();
    const rotatedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('store_join_codes')
      .upsert({ store_id: storeId, code, rotated_at: rotatedAt }, { onConflict: 'store_id' });
    if (!error) return { code, rotatedAt };
    if (error.code !== '23505') {
      console.error('setJoinCode error:', error);
      return null;
    }
    // 23505 = another store already has this code; try a new one
  }
  return null;
}

/** Marks the player's home store as verified, setting it first if they have none or an unverified different one. */
export async function verifyHomeStore(playerId: string, storeId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('players')
    .update({ home_store_id: storeId, home_store_verified_at: new Date().toISOString() })
    .eq('id', playerId);
  if (error) {
    console.error('verifyHomeStore error:', error);
    return false;
  }
  return true;
}

/** True when the player has checked in at an event run by this store. */
export async function hasAttendedStore(playerId: string, storeId: string): Promise<boolean> {
  const { data: events } = await supabaseAdmin.from('events').select('id').eq('store_id', storeId).limit(1000);
  const ids = (events ?? []).map(e => e.id);
  if (ids.length === 0) return false;
  const { count } = await supabaseAdmin
    .from('event_attendances')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .in('event_id', ids);
  return (count ?? 0) > 0;
}
