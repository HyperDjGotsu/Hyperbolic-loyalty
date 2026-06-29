import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Lightweight player search — returns a list, used by Circuit standings picker
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: staff } = await supabaseAdmin
    .from('players')
    .select('is_staff')
    .eq('clerk_user_id', userId)
    .single();

  if (!staff?.is_staff) return NextResponse.json({ error: 'Staff only' }, { status: 403 });

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
