import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';
import { STAFF_GUIDES, GUIDE_MIN_VIEWS } from '@/lib/staff-guides';

export const dynamic = 'force-dynamic';

const ACTIONS = ['shown', 'skipped', 'got_it', 'acknowledged', 'reopened'] as const;

// Per-tab progress for the signed-in staff member, for the current guide version only.
export async function GET() {
  const staff = await requireAnyStaff();
  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('staff_guide_log')
    .select('tab_key, guide_version, action')
    .eq('app_user_id', staff.appUserId)
    .in('action', ['shown', 'acknowledged']);
  if (error) return NextResponse.json({ error: 'Failed to load guides' }, { status: 500 });

  const guides: Record<string, { views: number; acknowledged: boolean }> = {};
  for (const [tab, g] of Object.entries(STAFF_GUIDES)) {
    const rows = (data ?? []).filter(r => r.tab_key === tab && r.guide_version === g.version);
    guides[tab] = {
      views: rows.filter(r => r.action === 'shown').length,
      acknowledged: rows.some(r => r.action === 'acknowledged'),
    };
  }
  return NextResponse.json({ guides, minViews: GUIDE_MIN_VIEWS });
}

// Append-only log. The server decides who the user is; the client only says what happened.
export async function POST(request: Request) {
  const staff = await requireAnyStaff();
  if (!staff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { tab?: string; action?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const guide = body.tab ? STAFF_GUIDES[body.tab] : undefined;
  const action = ACTIONS.find(a => a === body.action);
  if (!body.tab || !guide || !action) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  if (action === 'acknowledged') {
    const { count } = await supabaseAdmin
      .from('staff_guide_log')
      .select('id', { count: 'exact', head: true })
      .eq('app_user_id', staff.appUserId)
      .eq('tab_key', body.tab)
      .eq('guide_version', guide.version)
      .eq('action', 'shown');
    if ((count ?? 0) < GUIDE_MIN_VIEWS) {
      return NextResponse.json({ error: 'Not enough views yet' }, { status: 409 });
    }
  }

  const { error } = await supabaseAdmin.from('staff_guide_log').insert({
    app_user_id: staff.appUserId,
    tab_key: body.tab,
    guide_version: guide.version,
    action,
  });
  if (error) return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
