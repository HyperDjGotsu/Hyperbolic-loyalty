import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotificationsBulk } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Sunday 6pm Pacific — sends each player their weekly XP recap.
// Scheduled at 01:00 and 02:00 UTC Monday so it lands at 6pm through daylight saving; the other run exits.
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pacific = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
    if (pacific.weekday !== 'Sun' || pacific.hour !== '18') return NextResponse.json({ sent: 0, skipped: 'not Sunday 6pm Pacific' });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // XP earned per player in the last 7 days (paged: Supabase returns at most 1000 rows per request)
    const xpMap: Record<string, number> = {};
    for (let from = 0; ; from += 1000) {
      const { data: rows } = await supabaseAdmin
        .from('xp_ledger')
        .select('player_id, final_xp')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })
        .range(from, from + 999);
      for (const row of rows ?? []) {
        if (!row.player_id) continue;
        xpMap[row.player_id] = (xpMap[row.player_id] ?? 0) + (row.final_xp ?? 0);
      }
      if ((rows?.length ?? 0) < 1000) break;
    }

    const playerIds = Object.keys(xpMap).filter((id) => xpMap[id] > 0);
    if (!playerIds.length) return NextResponse.json({ sent: 0 });

    // Home store for each player who earned XP, plus store names
    const homeStore: Record<string, string | null> = {};
    for (let i = 0; i < playerIds.length; i += 200) {
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('id, home_store_id')
        .in('id', playerIds.slice(i, i + 200));
      for (const p of players ?? []) homeStore[p.id] = p.home_store_id;
    }
    const { data: stores } = await supabaseAdmin.from('stores').select('id, name');
    const storeName: Record<string, string> = {};
    for (const st of stores ?? []) storeName[st.id] = st.name;

    // Rank within each home store by this week's XP (ties share a rank)
    const rankMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    const byStore: Record<string, string[]> = {};
    for (const id of playerIds) {
      const storeId = homeStore[id];
      if (storeId) (byStore[storeId] ??= []).push(id);
    }
    for (const ids of Object.values(byStore)) {
      ids.sort((a, b) => xpMap[b] - xpMap[a]);
      ids.forEach((id, i) => {
        rankMap[id] = i > 0 && xpMap[ids[i - 1]] === xpMap[id] ? rankMap[ids[i - 1]] : i + 1;
        countMap[id] = ids.length;
      });
    }

    const sent = await createNotificationsBulk(
      playerIds.map((playerId) => {
        const weeklyXp = xpMap[playerId];
        const storeId = homeStore[playerId];
        // A rank only means something when at least two players at the store earned XP
        const rank = storeId && countMap[playerId] > 1 ? rankMap[playerId] : null;
        const name = storeId ? storeName[storeId] : null;
        return {
          playerId,
          type: 'weekly_summary',
          title: `📊 Your week in review`,
          message: `You earned +${weeklyXp} XP this week.${rank ? ` You are now ranked #${rank} at ${name ?? 'your store'}.` : ''}`,
          data: { weekly_xp: String(weeklyXp), store_rank: rank ? String(rank) : null },
          category: 'daily_rewards' as const,
        };
      })
    );

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('weekly-summary cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
