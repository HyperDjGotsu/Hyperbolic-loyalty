import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitStrict, getClientIp } from '@/lib/rate-limit';
import { findStoreByJoinCode, normalizeJoinCode, verifyHomeStore } from '@/lib/store-join';

export const dynamic = 'force-dynamic';

// POST { code } — join a store with its join code. Sets the player's home store and marks it verified.
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Codes are short, so cap guesses per account and per address
    const byUser = await enforceRateLimitStrict(`join-store:user:${userId}`, 600, 8);
    if (byUser) return byUser;
    const byIp = await enforceRateLimitStrict(`join-store:ip:${getClientIp(request)}`, 600, 20);
    if (byIp) return byIp;

    const body = (await request.json().catch(() => ({}))) as { code?: unknown };
    const code = normalizeJoinCode(body.code);
    // Same message for a malformed and a wrong code so the response does not help guessing
    const store = code ? await findStoreByJoinCode(code) : null;
    if (!store) return NextResponse.json({ error: 'That code did not work. Check it with the store.' }, { status: 404 });

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle();
    if (!player) return NextResponse.json({ error: 'Finish signing up first', code: 'no_player' }, { status: 404 });

    const ok = await verifyHomeStore(player.id, store.id);
    if (!ok) return NextResponse.json({ error: 'Internal error' }, { status: 500 });

    return NextResponse.json({ success: true, homeStore: store });
  } catch (err) {
    console.error('join-store POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
