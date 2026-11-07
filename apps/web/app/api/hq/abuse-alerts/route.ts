import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin } from '@/lib/auth-helpers';
import { enforceRateLimitPermissive } from '@/lib/rate-limit';
import { loadAbuseSettings, normalizeAbuseSettings, runAbuseChecks, DEFAULT_ABUSE_SETTINGS } from '@/lib/abuse-alerts';

export const dynamic = 'force-dynamic';

// GET — current thresholds plus anything that trips them right now. Network admins only.
export async function GET() {
  try {
    const ctx = await requireNetworkAdmin();
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const limited = await enforceRateLimitPermissive(`hq-abuse-alerts:${ctx.clerkUserId}`, 60, 30);
    if (limited) return limited;

    const settings = await loadAbuseSettings();
    const alerts = await runAbuseChecks(settings);
    return NextResponse.json({ settings, defaults: DEFAULT_ABUSE_SETTINGS, alerts, checkedAt: new Date().toISOString() });
  } catch (err) {
    console.error('abuse-alerts GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT — save thresholds. Values are clamped to whole numbers between 1 and 100000.
export async function PUT(request: Request) {
  try {
    const ctx = await requireNetworkAdmin();
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const limited = await enforceRateLimitPermissive(`hq-abuse-alerts-save:${ctx.clerkUserId}`, 60, 20);
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const settings = normalizeAbuseSettings((body as { settings?: unknown }).settings);
    const { error } = await supabaseAdmin.from('store_config').update({ abuse_alert_settings: { ...settings } }).eq('id', 1);
    if (error) throw error;
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('abuse-alerts PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
