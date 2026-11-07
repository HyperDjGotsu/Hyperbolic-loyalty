import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin } from '@/lib/auth-helpers';
import { enforceRateLimitPermissive, enforceRateLimitStrict } from '@/lib/rate-limit';
import { TITLES, isTitleKey } from '@/lib/titles';
import { DEFAULT_TITLE_SETTINGS, grantTitle, loadTitleSettings, normalizeTitleSettings, revokeTitle } from '@/lib/titles-server';

export const dynamic = 'force-dynamic';

// GET — settings, title counts and the latest grants. Network admins only.
export async function GET() {
  try {
    const ctx = await requireNetworkAdmin();
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const limited = await enforceRateLimitPermissive(`hq-titles:${ctx.clerkUserId}`, 60, 30);
    if (limited) return limited;

    const [settings, recent] = await Promise.all([
      loadTitleSettings(),
      supabaseAdmin
        .from('player_titles')
        .select('player_id, title_key, granted_at, players!player_titles_player_id_fkey(display_name, player_id)')
        .order('granted_at', { ascending: false })
        .limit(50),
    ]);
    if (recent.error) throw recent.error;

    const grants = (recent.data ?? []).map(r => {
      const p = (r.players as unknown as { display_name: string | null; player_id: string | null } | null);
      return { titleKey: r.title_key, grantedAt: r.granted_at, playerName: p?.display_name ?? 'Unknown', playerId: p?.player_id ?? '' };
    });
    const counts: Record<string, number> = {};
    for (const key of Object.keys(TITLES)) {
      const { count } = await supabaseAdmin.from('player_titles').select('player_id', { count: 'exact', head: true }).eq('title_key', key);
      counts[key] = count ?? 0;
    }

    return NextResponse.json({
      settings,
      defaults: DEFAULT_TITLE_SETTINGS,
      titles: Object.entries(TITLES).map(([key, t]) => ({ key, label: t.label, xp: t.xp, blurb: t.blurb, count: counts[key] ?? 0 })),
      grants,
    });
  } catch (err) {
    console.error('hq titles GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT { settings } — automatic Founding Member window.
export async function PUT(request: Request) {
  try {
    const ctx = await requireNetworkAdmin();
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const limited = await enforceRateLimitPermissive(`hq-titles-save:${ctx.clerkUserId}`, 60, 20);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as { settings?: unknown };
    const settings = normalizeTitleSettings(body.settings);
    const { error } = await supabaseAdmin.from('store_config').update({ title_settings: { ...settings } }).eq('id', 1);
    if (error) throw error;
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('hq titles PUT error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST { action: 'grant' | 'revoke', playerId, titleKey } — playerId is the public ID (e.g. GGOB-ABC123).
export async function POST(request: Request) {
  try {
    const ctx = await requireNetworkAdmin();
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const limited = await enforceRateLimitStrict(`hq-titles-grant:${ctx.clerkUserId}`, 600, 60);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as { action?: string; playerId?: string; titleKey?: string };
    if (body.action !== 'grant' && body.action !== 'revoke') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    if (!isTitleKey(body.titleKey)) return NextResponse.json({ error: 'Unknown title' }, { status: 400 });
    const publicId = String(body.playerId ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{2,6}-[A-Z0-9]{4,16}$/.test(publicId)) return NextResponse.json({ error: 'Enter a player ID like GGOB-ABC123' }, { status: 400 });

    const { data: player } = await supabaseAdmin.from('players').select('id, display_name').eq('player_id', publicId).maybeSingle();
    if (!player) return NextResponse.json({ error: 'No player has that ID' }, { status: 404 });

    if (body.action === 'grant') {
      const granted = await grantTitle(player.id, body.titleKey, ctx.appUserId);
      return NextResponse.json({ ok: true, granted, playerName: player.display_name });
    }
    await revokeTitle(player.id, body.titleKey);
    return NextResponse.json({ ok: true, playerName: player.display_name });
  } catch (err) {
    console.error('hq titles POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
