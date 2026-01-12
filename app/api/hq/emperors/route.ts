import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// One Piece bounty thresholds
const BOUNTY_THRESHOLDS = [
  { min: 0, bounty: '฿3,000,000' },
  { min: 200, bounty: '฿30,000,000' },
  { min: 500, bounty: '฿100,000,000' },
  { min: 1000, bounty: '฿300,000,000' },
  { min: 1500, bounty: '฿500,000,000' },
  { min: 2500, bounty: '฿1,000,000,000' },
  { min: 4000, bounty: '฿3,000,000,000' },
];

function getBounty(berries: number): string {
  for (let i = BOUNTY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (berries >= BOUNTY_THRESHOLDS[i].min) {
      return BOUNTY_THRESHOLDS[i].bounty;
    }
  }
  return BOUNTY_THRESHOLDS[0].bounty;
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff
    const { data: staffCheck } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staffCheck?.is_staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: 2026-01

    // Get monthly rankings
    let rankings: Array<{
      player_id: string;
      display_name: string;
      berries: number;
      bounty: string;
    }> = [];

    if (month) {
      // Parse month to get date range
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1).toISOString();
      const endDate = new Date(year, monthNum, 1).toISOString();

      // Get One Piece XP for the month
      const { data: xpData } = await supabaseAdmin
        .from('xp_ledger')
        .select(`
          player_id,
          xp_amount,
          players!inner(player_id, display_name)
        `)
        .eq('game_id', 'one_piece')
        .gte('created_at', startDate)
        .lt('created_at', endDate);

      // Aggregate by player
      const playerTotals: Record<string, { player_id: string; display_name: string; berries: number }> = {};
      
      xpData?.forEach((entry: any) => {
        const pid = entry.player_id;
        if (!playerTotals[pid]) {
          playerTotals[pid] = {
            player_id: entry.players?.player_id || pid,
            display_name: entry.players?.display_name || 'Unknown',
            berries: 0,
          };
        }
        playerTotals[pid].berries += entry.xp_amount || 0;
      });

      // Sort and add bounty
      rankings = Object.values(playerTotals)
        .sort((a, b) => b.berries - a.berries)
        .map(p => ({
          ...p,
          bounty: getBounty(p.berries),
        }));
    }

    // Get Hall of Fame
    const { data: hallOfFame } = await supabaseAdmin
      .from('emperors')
      .select('*')
      .order('month', { ascending: false });

    // Transform to expected format
    const transformedHoF = (hallOfFame || []).map(e => ({
      id: e.id,
      month: e.month_label,
      month_sort: e.month,
      player_name: e.player_name,
      player_id: e.player_id,
      monthly_xp: e.monthly_xp,      // XP earned that month (determined winner)
      berries: e.berries,            // Total lifetime berries at crowning
      bounty_display: e.bounty_display,
    }));

    return NextResponse.json({
      rankings,
      hallOfFame: transformedHoF,
    });
  } catch (error) {
    console.error('Emperor rankings error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
