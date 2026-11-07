import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';

const PAGE = 1000; // the API returns at most this many rows per request, so read in pages
const MAX_PAGES = 200;

// Players who have not been verified for a store yet (no join code, no staff check-in) stay out of
// everything other players can see: leaderboards, search, friends, public profiles.
// HQ and the kiosk still list them so staff can help them get verified.
// Fails closed: if the lookup breaks this throws, so the caller errors instead of showing everyone.
export async function getUnverifiedPlayerIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id')
      .is('home_store_verified_at', null)
      .order('id', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error(`getUnverifiedPlayerIds failed: ${error.message}`);
    for (const r of data ?? []) ids.add(r.id as string);
    if (!data || data.length < PAGE) return ids;
  }
  throw new Error('getUnverifiedPlayerIds: too many unverified players to list');
}
