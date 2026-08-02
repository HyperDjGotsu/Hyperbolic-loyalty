import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, name, icon, currency_name')
      .order('name');

    // Map currency_name to xp_name for consistency with frontend
    const mappedGames = games?.map(g => ({
      ...g,
      xp_name: g.currency_name,
    }));

    return NextResponse.json({ games: mappedGames || [] });
  } catch (error) {
    console.error('Games fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
