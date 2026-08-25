import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// Runs daily at 10am UTC — notifies players whose pass expires in 7 days
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eightDaysOut = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, display_name, pass_tier, pass_expires_at')
      .or('pass_status.eq.active,pass_status.eq.cancel_scheduled')
      .in('pass_tier', ['access', 'player', 'all_access', 'diamond'])
      .gt('pass_expires_at', now.toISOString())
      .gte('pass_expires_at', sevenDaysOut.toISOString())
      .lte('pass_expires_at', eightDaysOut.toISOString());

    if (!players?.length) return NextResponse.json({ sent: 0 });

    let sent = 0;
    for (const player of players) {
      const tierLabel =
        player.pass_tier === 'access' ? 'Access Pass' :
        player.pass_tier === 'player' ? 'Player Pass' :
        player.pass_tier === 'all_access' ? 'All Access Pass' :
        player.pass_tier === 'diamond' ? 'Diamond Pass' :
        'Pass';

      await createNotification(
        player.id,
        'pass_expiring',
        `⏳ Your ${tierLabel} expires in 7 days`,
        `Visit the store to renew and keep your benefits.`,
        { pass_tier: player.pass_tier, expires_at: player.pass_expires_at },
        'store'
      );
      sent++;
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error('pass-expiring cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
