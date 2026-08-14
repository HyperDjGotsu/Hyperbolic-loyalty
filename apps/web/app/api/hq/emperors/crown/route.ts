import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin } from '@/lib/auth-helpers';


export const dynamic = 'force-dynamic';
// One Piece bounty thresholds based on TOTAL berries
const BOUNTY_THRESHOLDS = [
  { min: 0, bounty: '฿3,000,000' },
  { min: 200, bounty: '฿30,000,000' },
  { min: 500, bounty: '฿100,000,000' },
  { min: 1000, bounty: '฿300,000,000' },
  { min: 1500, bounty: '฿500,000,000' },
  { min: 2500, bounty: '฿1,000,000,000' },
  { min: 4000, bounty: '฿3,000,000,000' },
];

function getBounty(totalBerries: number): string {
  for (let i = BOUNTY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalBerries >= BOUNTY_THRESHOLDS[i].min) {
      return BOUNTY_THRESHOLDS[i].bounty;
    }
  }
  return BOUNTY_THRESHOLDS[0].bounty;
}

export async function POST(request: Request) {
  try {
    const staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the staff member's players.id for crowned_by
    const { data: staffPlayer } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', staffCtx.clerkUserId)
      .single();

    const body = await request.json();
    const { month, monthSort, playerName, playerId, monthlyXp } = body;
    // playerId here is the player_id (e.g. GGC-XXXX format), monthlyXp is what they earned this month

    if (!month || !monthSort || !playerName || !playerId || monthlyXp === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert monthSort (2026-01) to first of month date (2026-01-01)
    const monthDate = `${monthSort}-01`;

    // Get the player's UUID and calculate their TOTAL lifetime berries
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('player_id', playerId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get total lifetime One Piece XP (berries)
    const { data: totalXpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', player.id)
      .eq('game_id', 'one_piece');

    const totalBerries = totalXpData?.reduce((sum, entry) => sum + (entry.final_xp || 0), 0) || 0;
    const bountyDisplay = getBounty(totalBerries);

    // Check if already crowned for this month
    const { data: existing } = await supabaseAdmin
      .from('emperors')
      .select('id')
      .eq('month', monthDate)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabaseAdmin
        .from('emperors')
        .update({
          month_label: month,
          player_name: playerName,
          player_id: player.id,
          monthly_xp: monthlyXp,
          berries: totalBerries,
          bounty_display: bountyDisplay,
          crowned_at: new Date().toISOString(),
          crowned_by: staffPlayer?.id,
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Emperor update error:', error);
        return NextResponse.json({ error: 'Failed to update emperor' }, { status: 500 });
      }
    } else {
      // Insert new
      const { error } = await supabaseAdmin
        .from('emperors')
        .insert({
          game_id: 'one_piece',
          month: monthDate,
          month_label: month,
          player_name: playerName,
          player_id: player.id,
          monthly_xp: monthlyXp,
          berries: totalBerries,
          bounty_display: bountyDisplay,
          crowned_at: new Date().toISOString(),
          crowned_by: staffPlayer?.id,
        });

      if (error) {
        console.error('Emperor insert error:', error);
        return NextResponse.json({ error: 'Failed to crown emperor' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, totalBerries, bountyDisplay });
  } catch (error) {
    console.error('Crown emperor error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
