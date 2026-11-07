import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import { findStoreByJoinCode, normalizeJoinCode, verifyHomeStore } from '@/lib/store-join';

export const dynamic = 'force-dynamic';

// PATCH — change the authenticated player's home store.
// Allowed only with the new store's join code. Staff check-ins verify a store separately (see the check-in route).
// Picking a store without proof is refused, so nobody can claim a store they have never been to.
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limited = await enforceRateLimitStrict(`home-store:${userId}`, 600, 12);
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const { store_id, code } = body as { store_id?: string; code?: string };

    if (!store_id) {
      return NextResponse.json({ error: 'store_id is required' }, { status: 400 });
    }

    // Verify the store exists and is active
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, name, city, slug, is_flagship, color')
      .eq('id', store_id)
      .eq('is_active', true)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, home_store_id, home_store_verified_at')
      .eq('clerk_user_id', userId)
      .maybeSingle();
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Already verified for this store: nothing to change
    if (player.home_store_id === store.id && player.home_store_verified_at) {
      return NextResponse.json({ success: true, homeStore: store, verified: true });
    }

    let proven = false;
    const normalized = normalizeJoinCode(code);
    if (normalized) {
      const codeStore = await findStoreByJoinCode(normalized);
      proven = codeStore?.id === store.id;
      if (!proven) {
        return NextResponse.json({ error: 'That code did not work. Check it with the store.', code: 'bad_join_code' }, { status: 400 });
      }
    }

    if (!proven) {
      return NextResponse.json(
        { error: 'Enter this store\'s join code, or ask a staff member to check you in.', code: 'join_code_required' },
        { status: 403 }
      );
    }

    const ok = await verifyHomeStore(player.id, store.id);
    if (!ok) throw new Error('verifyHomeStore failed');

    return NextResponse.json({ success: true, homeStore: store, verified: true });
  } catch (err) {
    console.error('home-store PATCH error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
