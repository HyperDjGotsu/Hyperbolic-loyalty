import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import { sendPushToPlayer } from '@/lib/push';

export const dynamic = 'force-dynamic';

// POST — sends a test push to the signed-in player's own saved devices (nobody else's), so a player can see
// that notifications and the app-icon badge work on their phone.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limited = await enforceRateLimitStrict(`push-test:${userId}`, 600, 5);
  if (limited) return limited;

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const { count } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', player.id);
  if (!count) {
    return NextResponse.json({ error: 'No device is set up for notifications yet. Allow notifications first.', code: 'no_subscription' }, { status: 400 });
  }

  await sendPushToPlayer(player.id, {
    title: 'PlayerPass test',
    body: 'Notifications are working on this device.',
    url: '/dashboard',
    tag: 'pp-test',
    count: 1,
  });
  return NextResponse.json({ success: true, devices: count });
}
