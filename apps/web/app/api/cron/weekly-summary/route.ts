import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Runs every Sunday at 8pm UTC — sends each player their weekly XP recap
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get XP earned per player in the last 7 days
    const { data: ledgerRows } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp')
      .gte('created_at', sevenDaysAgo);

    if (!ledgerRows?.length) return NextResponse.json({ sent: 0 });

    // Aggregate XP per player
    const xpMap: Record<string, number> = {};
    for (const row of ledgerRows) {
      if (!row.player_id) continue;
      xpMap[row.player_id] = (xpMap[row.player_id] ?? 0) + (row.final_xp ?? 0);
    }

    const playerIds = Object.keys(xpMap);
    if (!playerIds.length) return NextResponse.json({ sent: 0 });

    // Get total XP and compute ranks for all active players
    const { data: allXp } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp');

    const totalMap: Record<string, number> = {};
    for (const row of allXp ?? []) {
      if (!row.player_id) continue;
      totalMap[row.player_id] = (totalMap[row.player_id] ?? 0) + (row.final_xp ?? 0);
    }

    const rankList = Object.entries(totalMap).sort((a, b) => b[1] - a[1]);
    const rankMap: Record<string, number> = {};
    rankList.forEach(([id], i) => { rankMap[id] = i + 1; });

    let sent = 0;
    for (const playerId of playerIds) {
      const weeklyXp = xpMap[playerId];
      if (weeklyXp <= 0) continue;
      const rank = rankMap[playerId] ?? null;

      await createNotification(
        playerId,
        'weekly_summary',
        `📊 Your week in review`,
        `You earned +${weeklyXp} XP this week${rank ? ` — you're ranked #${rank}` : ''}.`,
        { weekly_xp: String(weeklyXp), rank: rank ? String(rank) : null },
        'daily_rewards'
      );
      sent++;
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('weekly-summary cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
