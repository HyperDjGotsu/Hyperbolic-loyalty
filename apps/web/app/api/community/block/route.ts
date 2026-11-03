import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// POST { targetPlayerId } - block a player (removes any friendship/request, hides them from search for both sides).
// DELETE { targetPlayerId } - unblock.
async function resolve(request: Request) {
  const { userId } = await auth();
  if (!userId) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  const { targetPlayerId } = await request.json().catch(() => ({}));
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof targetPlayerId !== 'string' || !UUID.test(targetPlayerId)) return { error: NextResponse.json({ error: 'Target player required' }, { status: 400 }) };
  const { data: me } = await supabaseAdmin.from('players').select('id').eq('clerk_user_id', userId).single();
  if (!me) return { error: NextResponse.json({ error: 'Player not found' }, { status: 404 }) };
  if (me.id === targetPlayerId) return { error: NextResponse.json({ error: "You can't block yourself" }, { status: 400 }) };
  return { me: me.id, target: targetPlayerId as string };
}

export async function POST(request: Request) {
  try {
    const r = await resolve(request);
    if (r.error) return r.error;
    // Clear friendship/pending rows in each direction; an existing block by the other player is kept
    for (const [a, b] of [[r.me!, r.target!], [r.target!, r.me!]]) {
      await supabaseAdmin.from('friendships').delete()
        .eq('requester_id', a).eq('addressee_id', b).in('status', ['accepted', 'pending']);
    }
    await supabaseAdmin.from('friendships').delete()
      .eq('requester_id', r.me!).eq('addressee_id', r.target!).eq('status', 'blocked');
    const { error } = await supabaseAdmin
      .from('friendships')
      .insert({ requester_id: r.me!, addressee_id: r.target!, status: 'blocked' });
    if (error) {
      console.error('Block error:', error);
      return NextResponse.json({ error: 'Failed to block' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Block error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const r = await resolve(request);
    if (r.error) return r.error;
    await supabaseAdmin.from('friendships').delete()
      .eq('requester_id', r.me!).eq('addressee_id', r.target!).eq('status', 'blocked');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Unblock error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
