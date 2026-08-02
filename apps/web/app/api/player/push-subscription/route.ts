import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getPlayer(userId: string) {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

// Save a push subscription for the current player
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const player = await getPlayer(userId);
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const body = await request.json();
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('push_subscriptions')
    .upsert(
      { player_id: player.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'player_id,endpoint' }
    );

  if (error) {
    console.error('push-subscription POST error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Remove a push subscription (player opted out)
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const player = await getPlayer(userId);
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const body = await request.json();
  const { endpoint } = body;

  if (endpoint) {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('player_id', player.id)
      .eq('endpoint', endpoint);
  } else {
    // Remove all subscriptions for this player
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('player_id', player.id);
  }

  return NextResponse.json({ ok: true });
}
