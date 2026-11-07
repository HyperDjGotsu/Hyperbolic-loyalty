import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';

// Players who have not been verified for a store yet (no join code, no staff check-in) stay out of
// everything other players can see: leaderboards, search, friends, public profiles.
// HQ and the kiosk still list them so staff can help them get verified.
export async function getUnverifiedPlayerIds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id')
    .is('home_store_verified_at', null)
    .limit(50000);
  return new Set((data ?? []).map(r => r.id as string));
}
