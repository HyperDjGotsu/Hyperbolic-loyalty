import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';
import { sendExpoPushToPlayers } from '@/lib/expo-push';

export const dynamic = 'force-dynamic';

// Runs daily at 6pm UTC — remind players who haven't spun yet today (Pacific time)
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pacificOffset = -7; // PDT; adjust to -8 for PST if needed
    const now = new Date();
    const pacificNow = new Date(now.getTime() + pacificOffset * 60 * 60 * 1000);
    const todayPacific = pacificNow.toISOString().split('T')[0];

    const { data: spunToday } = await supabaseAdmin
      .from('daily_spins')
      .select('player_id')
      .eq('spin_date', todayPacific);

    const spunIds = new Set((spunToday ?? []).filter(r => r.player_id !== null).map(r => r.player_id!));

    const { data: allPlayers } = await supabaseAdmin
      .from('players')
      .select('id, notification_preferences');

    if (!allPlayers?.length) return NextResponse.json({ sent: 0 });

    const DEFAULT_PREFS = { daily_rewards: true, events: true, leaderboard: true, social: true, store: true };
    const eligible = allPlayers.filter((p) => {
      if (spunIds.has(p.id)) return false;
      const prefs = { ...DEFAULT_PREFS, ...((p.notification_preferences ?? {}) as Record<string, boolean>) };
      return prefs.daily_rewards;
    });

    // Create in-app notifications for each eligible player
    let sent = 0;
    for (const player of eligible) {
      await createNotification(
        player.id,
        'spin_ready',
        '🎰 Daily spin is waiting!',
        "Don't miss your free spin today — prizes reset at midnight.",
        null,
        'daily_rewards'
      );
      sent++;
    }

    // Dispatch Expo push once for the full eligible set — no per-player preference
    // re-query because eligibility was already determined above.
    if (eligible.length > 0) {
      try {
        const tokenCount = await sendExpoPushToPlayers(
          eligible.map((p) => p.id),
          {
            title: '🎰 Daily spin is waiting!',
            body: "Don't miss your free spin today — prizes reset at midnight.",
            category: 'daily_rewards',
          }
        );
        console.log(`[expo-push] spin-reminder: ${tokenCount} tokens dispatched`);
      } catch (err) {
        // Push failure must not affect notification-row creation count
        console.error('[expo-push] spin-reminder dispatch error:', err);
      }
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('spin-reminder cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
