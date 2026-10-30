import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { effectivePassTier } from '@/lib/points';
import { EVENT_CREDIT_AMOUNT_CENTS, EVENT_CREDIT_TIER, pacificMonthKey } from '@/lib/event-credit';

export const dynamic = 'force-dynamic';

async function loadPlayer(clerkUserId: string) {
  return supabaseAdmin
    .from('players')
    .select('id, player_id, display_name, real_name, home_store_id, pass_tier, pass_expires_at, pass_status')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
}

async function loadRedemption(playerId: string, monthKey: string) {
  return supabaseAdmin
    .from('event_credit_redemptions')
    .select('redeemed_at, amount_cents, month_key')
    .eq('player_id', playerId)
    .eq('month_key', monthKey)
    .maybeSingle();
}

// Whether this month's credit is available, plus the ticket details if it's already been used.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: player, error } = await loadPlayer(userId);
    if (error || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const eligible = effectivePassTier(player.pass_tier, player.pass_expires_at, player.pass_status) === EVENT_CREDIT_TIER;
    const monthKey = pacificMonthKey();
    const { data: redemption, error: redemptionError } = await loadRedemption(player.id, monthKey);
    if (redemptionError) throw redemptionError;

    return NextResponse.json({
      eligible,
      monthKey,
      amountCents: EVENT_CREDIT_AMOUNT_CENTS,
      redeemedAt: redemption?.redeemed_at ?? null,
      name: player.real_name || player.display_name,
      playerId: player.player_id,
    });
  } catch (err) {
    console.error('event-credit GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Redeem this month's credit. The unique (player_id, month_key) key makes a second use impossible, even from two phones at once.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: player, error } = await loadPlayer(userId);
    if (error || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const tier = effectivePassTier(player.pass_tier, player.pass_expires_at, player.pass_status);
    if (tier !== EVENT_CREDIT_TIER) {
      return NextResponse.json({ error: 'Event Credit is a Diamond pass perk' }, { status: 403 });
    }

    const monthKey = pacificMonthKey();
    const { data: created, error: insertError } = await supabaseAdmin
      .from('event_credit_redemptions')
      .insert({
        player_id: player.id,
        store_id: player.home_store_id,
        month_key: monthKey,
        amount_cents: EVENT_CREDIT_AMOUNT_CENTS,
        pass_tier: tier,
      })
      .select('redeemed_at')
      .single();

    if (insertError) {
      // 23505 = unique_violation: already used this month
      if (insertError.code === '23505') {
        const { data: existing } = await loadRedemption(player.id, monthKey);
        return NextResponse.json({ error: 'Event Credit already used this month', redeemedAt: existing?.redeemed_at ?? null }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      monthKey,
      amountCents: EVENT_CREDIT_AMOUNT_CENTS,
      redeemedAt: created.redeemed_at,
      name: player.real_name || player.display_name,
      playerId: player.player_id,
    });
  } catch (err) {
    console.error('event-credit POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
