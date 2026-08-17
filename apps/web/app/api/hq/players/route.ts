import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStaffContext } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Lightweight player search — network-wide for any authorized staff.
// Player Pass identity is network-wide: a player's home store does not restrict
// which staff can find and service them (e.g. a visiting player at a different store).
// Returns only identification fields; sensitive fields are exposed only on the
// individual player route with appropriate store-scoped authorization.
export async function GET(request: Request) {
  const staffCtx = await getStaffContext();
  if (!staffCtx) return NextResponse.json({ error: 'Staff only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (q.length < 2) return NextResponse.json({ players: [] });

  const isId = q.toUpperCase().startsWith('HYP') || q.includes('-');
  const query = supabaseAdmin
    .from('players')
    .select('id, player_id, display_name')
    .limit(8);

  const { data, error } = isId
    ? await query.ilike('player_id', `%${q}%`)
    : await query.ilike('display_name', `%${q}%`);

  if (error) return NextResponse.json({ players: [] });

  return NextResponse.json({ players: data || [] });
}
