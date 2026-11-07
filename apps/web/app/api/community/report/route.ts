import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASONS = ['harassment', 'inappropriate_profile', 'spam', 'other'];

// POST { targetPlayerId, reason, details? } - report a player. Saved to player_reports and emailed to REPORTS_EMAIL when that is set.
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { targetPlayerId, reason, details } = body as { targetPlayerId?: unknown; reason?: unknown; details?: unknown };
    if (typeof targetPlayerId !== 'string' || !UUID.test(targetPlayerId)) {
      return NextResponse.json({ error: 'Target player required' }, { status: 400 });
    }
    const why = typeof reason === 'string' && REASONS.includes(reason) ? reason : 'other';
    const note = typeof details === 'string' ? details.slice(0, 1000) : null;

    const { data: me } = await supabaseAdmin.from('players').select('id, display_name').eq('clerk_user_id', userId).single();
    if (!me) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    if (me.id === targetPlayerId) return NextResponse.json({ error: "You can't report yourself" }, { status: 400 });

    const { data: target } = await supabaseAdmin.from('players').select('id, display_name').eq('id', targetPlayerId).single();
    if (!target) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    // Same reporter and target within a day: already on file, don't pile on
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dupe } = await supabaseAdmin.from('player_reports').select('id')
      .eq('reporter_id', me.id).eq('reported_id', target.id).gte('created_at', since).limit(1);
    if (dupe?.length) return NextResponse.json({ success: true });

    const { error } = await supabaseAdmin
      .from('player_reports')
      .insert({ reporter_id: me.id, reported_id: target.id, reason: why, details: note });
    if (error) {
      console.error('Report insert error:', error);
      return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
    }

    const to = process.env.REPORTS_EMAIL;
    if (to && process.env.RESEND_API_KEY) {
      try {
        await new Resend(process.env.RESEND_API_KEY).emails.send({
          from: 'PlayerPass <noreply@playerpass.gg>',
          to,
          subject: `Player report: ${target.display_name ?? target.id}`,
          text: `Reported player: ${target.display_name ?? ''} (${target.id})\nReported by: ${me.display_name ?? ''} (${me.id})\nReason: ${why}\n\n${note ?? '(no details)'}`,
        });
      } catch (e) {
        // The report is already saved; a mail failure must not lose it
        console.error('Report email error:', e);
      }
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Report error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
