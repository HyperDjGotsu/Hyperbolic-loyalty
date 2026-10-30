import { createClient } from '@supabase/supabase-js';

export interface PublicEventBasics {
  name: string;
  gameId: string | null;
  storeId: string | null;
  scheduledAt: string;
  storeName: string | null;
  isFree: boolean;
}

// Minimal event fields for share-link previews (title, description, OG image).
export async function getPublicEventBasics(id: string): Promise<PublicEventBasics | null> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabase
    .from('events')
    .select('name, game_id, store_id, scheduled_at, entry_fee, stores!events_store_id_fkey ( name )')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    gameId: data.game_id,
    storeId: data.store_id ?? null,
    scheduledAt: data.scheduled_at,
    storeName: (data.stores as unknown as { name: string } | null)?.name ?? null,
    isFree: !data.entry_fee,
  };
}

export function formatEventWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}
