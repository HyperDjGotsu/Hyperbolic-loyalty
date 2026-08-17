import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStaffContext } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Lightweight player search — returns a list, used by Circuit standings picker.
// Network admins search network-wide. Store staff/managers only see players
// whose home_store_id is one of their authorized stores. Players with
// home_store_id = null are excluded for non-admins.
export async function GET(request: Request) {
  const staffCtx = await getStaffContext();
  if (!staffCtx) return NextResponse.json({ error: 'Staff only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';

  if (q.length < 2) return NextResponse.json({ players: [] });

  const isId = q.toUpperCase().startsWith('HYP') || q.includes('-');
  let query = supabaseAdmin
    .from('players')
    .select('id, player_id, display_name')
    .limit(8);

  query = isId
    ? query.ilike('player_id', `%${q}%`)
    : query.ilike('display_name', `%${q}%`);

  if (!staffCtx.isNetworkAdmin) {
    query = query.in('home_store_id', staffCtx.allStoreIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ players: [] });

  return NextResponse.json({ players: data || [] });
}
