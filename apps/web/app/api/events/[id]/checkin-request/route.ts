import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import { MAX_OPEN_PER_EVENT, checkinRequestsEnabledFor } from '@/lib/checkin-requests';
import { fetchEvidence, reopenRequest } from '@/lib/checkin-requests-server';

export const dynamic = 'force-dynamic';

// Player side of the printed check-in QR. A request is ONLY a note on a waiting list.
// This route never verifies a home store, never awards Founding Member, never writes XP or Prize Points,
// and never writes event_attendances. All of that stays in the staff check-in path (/api/events/[id]/checkin).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function currentPlayerId(): Promise<{ playerId: string | null; clerkUserId: string | null }> {
  const { userId } = await auth();
  if (!userId) return { playerId: null, clerkUserId: null };
  const { data } = await supabaseAdmin.from('players').select('id').eq('clerk_user_id', userId).maybeSingle();
  return { playerId: data?.id ?? null, clerkUserId: userId };
}

// "Checked in" for a player's screen means a COMPLETE award (attendance + XP + Prize Points as expected), not just the attendance lock.
async function awardComplete(eventId: string, playerId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('event_attendances').select('id').eq('event_id', eventId).eq('player_id', playerId).maybeSingle();
  if (!data) return false;
  return (await fetchEvidence(eventId, playerId))?.verdict === 'complete';
}

// GET: where is MY request for this event? (the player page polls this while waiting for staff)
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const { playerId, clerkUserId } = await currentPlayerId();
    if (!clerkUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!playerId) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const { data: ev } = await supabaseAdmin.from('events').select('id, store_id').eq('id', params.id).maybeSingle();
    if (!ev || !checkinRequestsEnabledFor(ev.store_id)) return NextResponse.json({ status: 'disabled' });

    const { data } = await supabaseAdmin
      .from('checkin_requests').select('status').eq('event_id', params.id).eq('player_id', playerId).maybeSingle();
    // Only a COMPLETE award counts as checked in for the player's screen; the staff screens use the same records.
    if (await awardComplete(params.id, playerId)) return NextResponse.json({ status: 'checked_in' });
    return NextResponse.json({ status: data?.status ?? 'none' });
  } catch (err) {
    console.error('checkin-request GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST: ask to be checked in. Idempotent: one row per (event, player); asking again returns the same row's status.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const { playerId, clerkUserId } = await currentPlayerId();
    if (!clerkUserId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    if (!playerId) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const limited = await enforceRateLimitStrict(`checkin-request:${clerkUserId}`, 60, 10);
    if (limited) return limited;

    const { data: event } = await supabaseAdmin
      .from('events').select('id, status, store_id').eq('id', params.id).maybeSingle();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    // Off unless this store is switched on (CHECKIN_REQUESTS_STORES). Nothing is written when it is off.
    if (!checkinRequestsEnabledFor(event.store_id)) {
      return NextResponse.json({ error: 'This check-in sign is not active yet. Please ask staff to check you in.', code: 'feature_disabled' }, { status: 404 });
    }
    // Only a live event can take requests (not scheduled, not completed).
    if (event.status !== 'active') {
      return NextResponse.json({ error: 'This event is not checking players in right now.', code: 'event_not_active' }, { status: 409 });
    }

    // Already fully checked in (NFC, rotating QR or an earlier approval): nothing to request. A half-written check-in is not "done":
    // it falls through to the request below so staff / a manager can see it.
    if (await awardComplete(event.id, playerId)) return NextResponse.json({ status: 'checked_in' });

    const { data: existing } = await supabaseAdmin
      .from('checkin_requests').select('id, status, event_id, player_id, reopened_count').eq('event_id', event.id).eq('player_id', playerId).maybeSingle();
    if (existing) {
      // An expired request (the event was ended and started again) may be asked for again. The award records decide what happens:
      // nothing written -> pending, already complete -> checked in, partial -> a manager reconciles. A dismissed one stays dismissed:
      // only staff reopen it, so a rejected request cannot be spammed back.
      if (existing.status === 'expired') {
        const out = await reopenRequest(existing, event.status, null);
        if (out === 'reopened') return NextResponse.json({ status: 'pending' });
        if (out === 'already_checked_in') return NextResponse.json({ status: 'checked_in' });
        if (out === 'needs_review') return NextResponse.json({ status: 'needs_review' });
        return NextResponse.json({ status: 'expired' });
      }
      return NextResponse.json({ status: existing.status });
    }

    const { count } = await supabaseAdmin
      .from('checkin_requests').select('id', { count: 'exact', head: true })
      .eq('event_id', event.id).in('status', ['pending', 'approving', 'needs_review']);
    if ((count ?? 0) >= MAX_OPEN_PER_EVENT) {
      return NextResponse.json({ error: 'Too many waiting requests. Please ask staff to check you in.', code: 'too_many_requests' }, { status: 503 });
    }

    const { error } = await supabaseAdmin.from('checkin_requests').insert({ event_id: event.id, player_id: playerId });
    if (error) {
      if (error.code === '23505') {
        // A second tap or device won the insert: same row, same answer.
        const { data: again } = await supabaseAdmin
          .from('checkin_requests').select('status').eq('event_id', event.id).eq('player_id', playerId).maybeSingle();
        return NextResponse.json({ status: again?.status ?? 'pending' });
      }
      console.error('checkin-request insert error:', error);
      return NextResponse.json({ error: 'Could not send the request. Please ask staff to check you in.' }, { status: 500 });
    }
    return NextResponse.json({ status: 'pending' });
  } catch (err) {
    console.error('checkin-request POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
