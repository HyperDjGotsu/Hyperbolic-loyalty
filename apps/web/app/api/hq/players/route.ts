import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Lightweight player search — returns a list, used by Circuit standings picker
export async function GET(request: Request) {
  const staffCtx = await requireAnyStaff();
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

  const { data, error } = await query;
  if (error) return NextResponse.json({ players: [] });

  return NextResponse.json({ players: data || [] });
}
