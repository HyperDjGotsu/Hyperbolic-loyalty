import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStaffContext } from '@/lib/auth-helpers';
import { enforceRateLimitPermissive } from '@/lib/rate-limit';
import { currentCheckinToken, TOKEN_BLOCK_MS } from '@/lib/checkin-token';

export const dynamic = 'force-dynamic';

// GET — the current check-in token for the kiosk QR. Staff only (the kiosk runs on a staff session).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const staff = await getStaffContext();
    if (!staff) return NextResponse.json({ error: 'Staff access required' }, { status: 403 });

    const limited = await enforceRateLimitPermissive(`checkin-token:${staff.clerkUserId}`, 60, 60);
    if (limited) return limited;

    const { data: event } = await supabaseAdmin
      .from('events')
      .select('id, status, store_id')
      .eq('id', params.id)
      .maybeSingle();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event is not active' }, { status: 400 });

    const allowed = event.store_id === null
      ? staff.isNetworkAdmin || staff.managedStoreIds.length > 0
      : staff.isNetworkAdmin || staff.allStoreIds.includes(event.store_id);
    if (!allowed) return NextResponse.json({ error: 'Staff access required for this store' }, { status: 403 });

    const { token, rotatesInMs } = currentCheckinToken(event.id);
    return NextResponse.json({ token, rotatesInMs, blockMs: TOKEN_BLOCK_MS });
  } catch (err) {
    console.error('checkin-token GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
