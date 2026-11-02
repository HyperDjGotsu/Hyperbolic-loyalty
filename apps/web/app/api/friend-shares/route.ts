import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cards are built from the sender's own ledger row. Nothing typed by the sender ever reaches a friend.
const SOURCE_LABEL: Record<string, string> = {
  match_win: 'a match win',
  undefeated_bonus: 'an undefeated run',
  achievement: 'an achievement',
  daily_spin: 'the daily spin',
  bonus_event: 'a bonus event',
  community_contribution: 'helping the community',
  referral: 'a referral',
};

async function currentPlayerId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const { data } = await supabaseAdmin.from('players').select('id').eq('clerk_user_id', userId).maybeSingle();
  return data?.id ?? null;
}

// Inbox: shares sent to me, newest first, plus how many are unseen
export async function GET() {
  const me = await currentPlayerId();
  if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rows } = await supabaseAdmin
    .from('friend_shares')
    .select('id, sender_id, kind, amount, label, created_at, seen_at')
    .eq('recipient_id', me)
    .order('created_at', { ascending: false })
    .limit(20);

  const senderIds = Array.from(new Set((rows ?? []).map(r => r.sender_id)));
  const senders: Record<string, { name: string; avatar: unknown }> = {};
  if (senderIds.length > 0) {
    const { data: ps } = await supabaseAdmin
      .from('players')
      .select('id, display_name, avatar_config, privacy_show_as_anonymous')
      .in('id', senderIds);
    for (const p of ps ?? []) {
      senders[p.id] = { name: p.privacy_show_as_anonymous ? 'A friend' : (p.display_name || 'A friend'), avatar: p.avatar_config || {} };
    }
  }

  const shares = (rows ?? []).map(r => ({
    id: r.id,
    kind: r.kind,
    amount: r.amount,
    label: r.label,
    createdAt: r.created_at,
    seen: !!r.seen_at,
    from: senders[r.sender_id] ?? { name: 'A friend', avatar: {} },
  }));
  return NextResponse.json({ shares, unseen: shares.filter(s => !s.seen).length });
}

// POST { ledger_id, friend_id }  → share one of my wins with a friend
// POST { action: 'seen' }        → mark my inbox as seen
export async function POST(request: Request) {
  const me = await currentPlayerId();
  if (!me) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: { ledger_id?: string; friend_id?: string; action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  if (body.action === 'seen') {
    await supabaseAdmin.from('friend_shares').update({ seen_at: new Date().toISOString() }).eq('recipient_id', me).is('seen_at', null);
    return NextResponse.json({ ok: true });
  }

  const { ledger_id: ledgerId, friend_id: friendId } = body;
  if (!ledgerId || !friendId || friendId === me || !UUID_RE.test(ledgerId) || !UUID_RE.test(friendId)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // Friends only (two plain lookups, one per direction; no filter strings built from request input)
  const [{ data: sent }, { data: received }] = await Promise.all([
    supabaseAdmin.from('friendships').select('id').eq('status', 'accepted').eq('requester_id', me).eq('addressee_id', friendId).limit(1),
    supabaseAdmin.from('friendships').select('id').eq('status', 'accepted').eq('requester_id', friendId).eq('addressee_id', me).limit(1),
  ]);
  if ((sent?.length ?? 0) + (received?.length ?? 0) === 0) return NextResponse.json({ error: 'You can only share with friends' }, { status: 403 });

  // The win must be the sender's own, and positive
  const { data: win } = await supabaseAdmin
    .from('xp_ledger')
    .select('id, player_id, final_xp, source, event_id, description')
    .eq('id', ledgerId)
    .maybeSingle();
  if (!win || win.player_id !== me || win.final_xp <= 0 || win.source === 'manual_adjustment') {
    return NextResponse.json({ error: 'That cannot be shared' }, { status: 400 });
  }

  // Daily cap
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabaseAdmin
    .from('friend_shares')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', me)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: 'Daily share limit reached. Try again tomorrow.' }, { status: 429 });

  // Name the event when we know it: from the row's event, else from the "Attended <event>" description older check-ins carry
  let eventName: string | null = null;
  if (win.event_id) {
    const { data: ev } = await supabaseAdmin.from('events').select('name').eq('id', win.event_id).maybeSingle();
    eventName = ev?.name ?? null;
  }
  if (!eventName && win.source === 'event_attendance') {
    const m = /^Attended (.+?)(?: — .*)?$/.exec(win.description ?? '');
    if (m && !m[1].startsWith('[TEST')) eventName = m[1].slice(0, 80);
  }
  let label = SOURCE_LABEL[win.source] ?? 'an event';
  if (eventName) label = win.source === 'event_attendance' ? eventName : `${label} at ${eventName}`;

  const { error } = await supabaseAdmin.from('friend_shares').insert({
    sender_id: me,
    recipient_id: friendId,
    kind: win.source === 'daily_spin' ? 'gacha' : 'earned',
    amount: win.final_xp,
    label,
  });
  if (error) return NextResponse.json({ error: 'Failed to share' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
