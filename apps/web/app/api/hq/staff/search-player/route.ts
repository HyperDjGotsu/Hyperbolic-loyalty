import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStaffContext } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// Search for a player to promote — requires store_manager or network_admin
export async function GET(request: NextRequest) {
  try {
    const ctx = await getStaffContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ordinary store_staff cannot promote players, so no need to expose this search to them
    if (!ctx.isNetworkAdmin && ctx.managedStoreIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ players: [] });
    }

    // Search by player_id prefix, display_name, or email — never expose clerk_user_id externally
    const isPlayerIdQuery = /^[A-Z]{2,6}-/i.test(q);

    let query = supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, email, clerk_user_id')
      .limit(10);

    if (isPlayerIdQuery) {
      query = query.ilike('player_id', `${q.toUpperCase()}%`);
    } else {
      // Use separate filters chained with .or to avoid PostgREST metachar injection
      query = query.or(
        `display_name.ilike.${encodePostgrestLike(q)},email.ilike.${encodePostgrestLike(q)}`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    // Strip clerk_user_id — internal identity, not needed by callers
    const players = (data ?? []).map(({ clerk_user_id: _cid, ...p }) => p);

    return NextResponse.json({ players });
  } catch (err) {
    console.error('staff/search-player error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Wrap value in PostgREST ilike wildcard pattern, escaping % and _ literals
function encodePostgrestLike(value: string): string {
  return `%${value.replace(/[%_]/g, '\\$&')}%`;
}
