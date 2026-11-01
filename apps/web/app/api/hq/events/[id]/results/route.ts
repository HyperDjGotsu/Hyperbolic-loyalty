import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess, requireNetworkAdmin, type StaffContext } from '@/lib/auth-helpers';
import { logPointTransaction, TIER_MULTIPLIERS, effectivePassTier } from '@/lib/points';
import { enforceRateLimitStrict } from '@/lib/rate-limit';
import { verifyStaffPin } from '@/lib/staff-pin';
import { WIN_LIFETIME_XP, WIN_PRIZE_POINTS, BONUS_TILE_XP } from '@/lib/xp-constants';

export const dynamic = 'force-dynamic';

const MAX_WINS = 10;
const MAX_PLACEMENT = 64;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Community tiles staff can tick. Undefeated is its own switch; Attended is excluded because check-in already awarded it.
const COMMUNITY_TILES = Object.keys(BONUS_TILE_XP).filter(t => t !== 'Undefeated');

async function loadEvent(eventId: string) {
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, name, game_id, store_id, status')
    .eq('id', eventId)
    .maybeSingle();
  return event;
}

// Same gate as starting/ending the event: staff at the event's store, or a network admin for network events
async function authorize(event: { store_id: string | null }): Promise<StaffContext | null> {
  return event.store_id ? requireStoreAccess(event.store_id) : requireNetworkAdmin();
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const event = await loadEvent(params.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const staff = await authorize(event);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { data: attendances } = await supabaseAdmin
    .from('event_attendances')
    .select('player_id, checked_in_at')
    .eq('event_id', event.id)
    .order('checked_in_at', { ascending: true });
  const ids = (attendances ?? []).map(a => a.player_id).filter((x): x is string => !!x);

  const [{ data: players }, { data: results }] = await Promise.all([
    ids.length
      ? supabaseAdmin.from('players').select('id, display_name, player_id, pass_tier, pass_expires_at, pass_status').in('id', ids)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin
      .from('event_results')
      .select('player_id, rounds_won, undefeated, tiles, placement, xp_awarded, prize_points_awarded')
      .eq('event_id', event.id),
  ]);

  const resultByPlayer = new Map((results ?? []).map(r => [r.player_id, r]));
  const attendees = (players ?? []).map((p: any) => {
    const tier = effectivePassTier(p.pass_tier ?? null, p.pass_expires_at ?? null, p.pass_status ?? null);
    const r = resultByPlayer.get(p.id);
    return {
      id: p.id,
      name: p.display_name || 'Player',
      playerCode: p.player_id,
      multiplier: TIER_MULTIPLIERS[tier] ?? 1,
      result: r
        ? { roundsWon: r.rounds_won, undefeated: r.undefeated, tiles: r.tiles, placement: r.placement, xp: r.xp_awarded, prizePoints: r.prize_points_awarded }
        : null,
    };
  }).sort((a: any, b: any) => a.name.localeCompare(b.name));

  return NextResponse.json({
    event: { id: event.id, name: event.name, status: event.status },
    attendees,
    tiles: COMMUNITY_TILES.map(label => ({ label, xp: BONUS_TILE_XP[label] })),
    winXp: WIN_LIFETIME_XP,
    winPrizePoints: WIN_PRIZE_POINTS,
    undefeatedXp: BONUS_TILE_XP['Undefeated'],
    maxWins: MAX_WINS,
  });
}

// Save one player's wrap-up. First save awards; changing a saved award needs the staff member's PIN
// and posts a correcting entry for the difference instead of deleting anything.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const event = await loadEvent(params.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const staff = await authorize(event);
  if (!staff) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const rl = await enforceRateLimitStrict(`hq-event-results:${staff.clerkUserId}`, 300, 60);
  if (rl) return rl;

  let body: { playerId?: string; roundsWon?: number; undefeated?: boolean; tiles?: string[]; placement?: number | null; pin?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const playerId = body.playerId;
  if (!playerId || !UUID_RE.test(playerId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const roundsWon = Math.min(MAX_WINS, Math.max(0, Math.floor(Number(body.roundsWon ?? 0)) || 0));
  const undefeated = body.undefeated === true;
  const tiles = Array.from(new Set((body.tiles ?? []).filter(t => COMMUNITY_TILES.includes(t))));
  let placement: number | null = null;
  if (body.placement !== null && body.placement !== undefined) {
    const n = Math.floor(Number(body.placement));
    if (!Number.isFinite(n) || n < 1 || n > MAX_PLACEMENT) return NextResponse.json({ error: 'Bad placement' }, { status: 400 });
    placement = n;
  }

  // Results are entered after the event has ended, and only for a week afterwards
  if (event.status !== 'completed') return NextResponse.json({ error: 'End the event before wrapping it up' }, { status: 400 });
  const { data: evTime } = await supabaseAdmin.from('events').select('scheduled_at').eq('id', event.id).maybeSingle();
  const scheduledMs = evTime?.scheduled_at ? new Date(evTime.scheduled_at).getTime() : NaN;
  if (!Number.isFinite(scheduledMs) || Date.now() - scheduledMs > 7 * 24 * 3600_000) {
    return NextResponse.json({ error: 'This event ended more than a week ago. Ask a manager to adjust points.' }, { status: 400 });
  }

  // Only players who checked in to this event can be rewarded for it
  const { data: att } = await supabaseAdmin
    .from('event_attendances')
    .select('id')
    .eq('event_id', event.id)
    .eq('player_id', playerId)
    .maybeSingle();
  if (!att) return NextResponse.json({ error: 'That player did not check in to this event' }, { status: 400 });

  const { data: staffPlayer } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('clerk_user_id', staff.clerkUserId)
    .maybeSingle();

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('clerk_user_id, pass_tier, pass_expires_at, pass_status')
    .eq('id', playerId)
    .maybeSingle();
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  // Nobody rewards themselves: another staff member does it. Fails closed if we can't tell who the staff member is.
  if (!staffPlayer) return NextResponse.json({ error: 'Your staff profile could not be found' }, { status: 403 });
  if (staffPlayer.id === playerId || (player.clerk_user_id && player.clerk_user_id === staff.clerkUserId)) {
    return NextResponse.json({ error: 'You can\'t reward yourself. Ask another staff member to do it.' }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from('event_results')
    .select('id, rounds_won, undefeated, tiles, placement, xp_awarded, prize_points_awarded, updated_at')
    .eq('event_id', event.id)
    .eq('player_id', playerId)
    .maybeSingle();

  // Prize Points keep the multiplier the player earned at; a first save uses their pass today
  const tier = effectivePassTier(player.pass_tier ?? null, player.pass_expires_at ?? null, player.pass_status ?? null);
  let multiplier = TIER_MULTIPLIERS[tier] ?? 1;
  if (existing && existing.rounds_won > 0) multiplier = existing.prize_points_awarded / (existing.rounds_won * WIN_PRIZE_POINTS) || multiplier;

  const bonusXp = (undefeated ? BONUS_TILE_XP['Undefeated'] : 0) + tiles.reduce((s, t) => s + (BONUS_TILE_XP[t] ?? 0), 0);
  const xp = roundsWon * WIN_LIFETIME_XP + bonusXp;
  const prizePoints = Math.round(roundsWon * WIN_PRIZE_POINTS * multiplier);

  const gameId = event.game_id ?? 'general';
  const storeId = event.store_id;
  const label = event.name;

  if (existing) {
    // Changing a saved award: PIN first
    const pin = await verifyStaffPin(staff.appUserId, body.pin);
    if (!pin.ok) return NextResponse.json({ error: pin.error, locked: pin.locked, pinRequired: true }, { status: pin.status });

    const dXp = xp - existing.xp_awarded;
    const dPp = prizePoints - existing.prize_points_awarded;

    // Claim the change first, only if nobody changed the row since we read it. A second device or a double tap
    // finds the row already changed and stops here, so a correction is never posted twice.
    const { data: claimed } = await supabaseAdmin.from('event_results').update({
      rounds_won: roundsWon, undefeated, tiles, placement,
      xp_awarded: xp, prize_points_awarded: prizePoints,
      awarded_by: staff.appUserId, updated_at: new Date().toISOString(),
    })
      .eq('id', existing.id)
      .eq('xp_awarded', existing.xp_awarded)
      .eq('prize_points_awarded', existing.prize_points_awarded)
      .eq('updated_at', existing.updated_at)
      .select('id');
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'Someone just changed this result. Reload and try again.' }, { status: 409 });
    }

    const undo = () => supabaseAdmin.from('event_results').update({
      rounds_won: existing.rounds_won, undefeated: existing.undefeated, tiles: existing.tiles, placement: existing.placement,
      xp_awarded: existing.xp_awarded, prize_points_awarded: existing.prize_points_awarded, updated_at: existing.updated_at,
    }).eq('id', existing.id);

    let xpRowId: string | null = null;
    try {
      if (dXp !== 0) {
        const { data: xr, error } = await supabaseAdmin.from('xp_ledger').insert({
          player_id: playerId, game_id: gameId, base_xp: dXp, final_xp: dXp, multiplier: 1,
          description: `Wrap-up correction: ${label}`, source: 'manual_adjustment',
          awarded_by: staffPlayer?.id ?? null, store_id: storeId, event_id: event.id,
        }).select('id').single();
        if (error || !xr) throw error ?? new Error('xp insert failed');
        xpRowId = xr.id;
      }
      if (dPp !== 0) {
        await logPointTransaction({
          playerId, storeId, amount: dPp, type: 'admin_adjust', source: 'event_wrapup',
          referenceId: event.id, note: `Wrap-up correction: ${label}`,
        });
      }
    } catch (err) {
      console.error('wrap-up correction failed, reverting:', err);
      if (xpRowId) await supabaseAdmin.from('xp_ledger').delete().eq('id', xpRowId);
      await undo();
      return NextResponse.json({ error: 'Failed to save the change. Nothing was changed, try again.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, corrected: true, xp, prizePoints });
  }

  // First save. The unique key makes a second tap or a second device a no-op rather than a double award.
  const { data: row, error: insErr } = await supabaseAdmin.from('event_results').insert({
    event_id: event.id, player_id: playerId, rounds_won: roundsWon, undefeated, tiles, placement,
    xp_awarded: xp, prize_points_awarded: prizePoints, awarded_by: staff.appUserId,
  }).select('id').single();
  if (insErr || !row) {
    if (insErr?.code === '23505') return NextResponse.json({ error: 'Already saved. Reopen it with your PIN to change it.', pinRequired: true }, { status: 409 });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  const ledger: Array<{ source: 'match_win' | 'undefeated_bonus' | 'community_contribution'; xp: number; desc: string }> = [];
  if (roundsWon > 0) ledger.push({ source: 'match_win', xp: roundsWon * WIN_LIFETIME_XP, desc: `${label} — ${roundsWon} round win${roundsWon > 1 ? 's' : ''}` });
  if (undefeated) ledger.push({ source: 'undefeated_bonus', xp: BONUS_TILE_XP['Undefeated'], desc: `${label} — Undefeated` });
  if (tiles.length > 0) ledger.push({ source: 'community_contribution', xp: tiles.reduce((s, t) => s + (BONUS_TILE_XP[t] ?? 0), 0), desc: `${label} — ${tiles.join(', ')}` });

  // Track what this request wrote so a failure part-way undoes all of it, not just the result row
  const writtenXpIds: string[] = [];
  try {
    for (const l of ledger) {
      const { data: xr, error } = await supabaseAdmin.from('xp_ledger').insert({
        player_id: playerId, game_id: gameId, base_xp: l.xp, final_xp: l.xp, multiplier: 1,
        description: l.desc, source: l.source, awarded_by: staffPlayer?.id ?? null, store_id: storeId, event_id: event.id,
      }).select('id').single();
      if (error || !xr) throw error ?? new Error('xp insert failed');
      writtenXpIds.push(xr.id);
    }
    // Prize Points go last: if it fails nothing from it exists, and the XP rows are removed below
    if (prizePoints > 0) {
      await logPointTransaction({
        playerId, storeId, amount: prizePoints, type: 'earn', source: 'event_wrapup',
        referenceId: event.id, note: `${label} — ${roundsWon} round win${roundsWon > 1 ? 's' : ''} (${tier} ${multiplier}x)`,
      });
    }
  } catch (err) {
    console.error('wrap-up award failed, undoing this request:', err);
    if (writtenXpIds.length) await supabaseAdmin.from('xp_ledger').delete().in('id', writtenXpIds);
    await supabaseAdmin.from('event_results').delete().eq('id', row.id);
    return NextResponse.json({ error: 'Failed to award. Nothing was saved, try again.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, xp, prizePoints });
}
