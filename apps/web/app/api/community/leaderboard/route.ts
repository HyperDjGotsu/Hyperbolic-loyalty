import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUnverifiedPlayerIds } from '@/lib/player-visibility';
import { getTitlesForPlayers } from '@/lib/titles-server';
import { auth } from '@clerk/nextjs/server';
import { fetchAllLedgerRows } from '@/lib/ledger-pages';

export const dynamic = 'force-dynamic';

const ANONYMOUS_AVATAR = {
  type: 'emoji',
  base: '❓',
  photoUrl: null,
  background: '#374151',
  frame: 'none',
  badge: null,
};

// Params:
//   game      — omit or 'overall' for all games; game_id for a specific game
//   period    — 'lifetime' (default) | 'season'
//   store_id  — omit for network-wide; uuid for store-seasonal leaderboard
//               (filters xp_ledger.store_id, NOT players.home_store_id)
//   limit     — default 50
//   me        — when signed in and ranked below the limit, the response also carries `me`: the caller's own row
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit  = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const game   = searchParams.get('game');
    const period = searchParams.get('period') || 'lifetime';
    const storeId = searchParams.get('store_id');
    if (storeId && !/^[0-9a-f-]{36}$/i.test(storeId)) {
      return NextResponse.json({ error: 'Invalid store_id' }, { status: 400 });
    }

    // ── Season bounds ────────────────────────────────────────────────────────
    let seasonStart: string | null = null;
    let seasonEnd:   string | null = null;

    if (period === 'season') {
      const { data: season } = await supabaseAdmin
        .from('seasons')
        .select('starts_at, ends_at')
        .eq('status', 'active')
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!season) {
        // No active season — return empty rather than falling back to lifetime
        return NextResponse.json({ leaderboard: [], period, noActiveSeason: true });
      }
      seasonStart = season.starts_at;
      seasonEnd   = season.ends_at;
    }

    // ── Build XP query ───────────────────────────────────────────────────────
    // Store seasonal: aggregate xp_ledger by store_id and season dates.
    // The competitive rank is based on XP *earned at that store*, regardless
    // of where the player's home store is set.
    // Read in id-ordered pages so totals cover every ledger row, not just the first 1,000 (lib/ledger-pages.ts).
    const buildXpPage = (afterId: string | null, size: number) => {
      let q = supabaseAdmin
        .from('xp_ledger')
        .select('id, player_id, final_xp, store_id');

      if (storeId) {
        // XP earned at this store, plus XP that is not tied to any store (daily spins, welcome bonus) for the
        // players whose home store this is. Every point a player earns counts somewhere.
        q = q.or(`store_id.eq.${storeId},store_id.is.null`);
      }
      if (seasonStart) {
        q = q.gte('created_at', seasonStart);
      }
      if (seasonEnd) {
        q = q.lt('created_at', seasonEnd);
      }
      if (game && game !== 'overall') {
        q = q.eq('game_id', game);
      }
      q = q.order('id', { ascending: true }).limit(size);
      if (afterId) q = q.gt('id', afterId);
      return q;
    };

    type XpRow = { id: string; player_id: string | null; final_xp: number; store_id: string | null };
    let xpData: XpRow[];
    let xpError: unknown = null;
    try {
      xpData = await fetchAllLedgerRows<XpRow>(buildXpPage);
    } catch (err) {
      xpData = [];
      xpError = err;
    }
    if (xpError) {
      console.error('Leaderboard XP error:', xpError);
      return NextResponse.json({ error: 'Failed to fetch XP data' }, { status: 500 });
    }

    // Aggregate per player — skip anonymized rows (player_id = null) so
    // deleted players don't form a phantom "null" group in the results.
    const xpByPlayer: Record<string, number> = {};
    // Players not yet verified for a store stay off the board
    const hidden = await getUnverifiedPlayerIds();

    // Store board: untagged XP only counts for players whose home store is this store
    let homeOfStore: Set<string> | null = null;
    if (storeId) {
      const untaggedIds = Array.from(new Set((xpData ?? []).filter(e => e.store_id === null && e.player_id !== null).map(e => e.player_id as string)));
      homeOfStore = new Set<string>();
      for (let i = 0; i < untaggedIds.length; i += 400) {
        const { data: homes, error: homesError } = await supabaseAdmin
          .from('players')
          .select('id')
          .eq('home_store_id', storeId)
          .in('id', untaggedIds.slice(i, i + 400));
        if (homesError) {
          console.error('Leaderboard home store error:', homesError);
          return NextResponse.json({ error: 'Failed to fetch XP data' }, { status: 500 });
        }
        for (const h of homes ?? []) homeOfStore.add(h.id);
      }
    }

    const counts = (e: { player_id: string | null; store_id: string | null }) =>
      e.player_id !== null && !hidden.has(e.player_id) && (!homeOfStore || e.store_id !== null || homeOfStore.has(e.player_id));

    for (const entry of (xpData ?? []).filter(counts)) {
      xpByPlayer[entry.player_id!] = (xpByPlayer[entry.player_id!] || 0) + (entry.final_xp || 0);
    }

    const sortedPlayerIds = Object.entries(xpByPlayer)
      .filter(([, xp]) => xp > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);
    const rankedPlayerIds = sortedPlayerIds.slice(0, limit);

    // The caller's own standing, when they rank below the cut-off
    let me: Record<string, unknown> | null = null;
    const { userId: clerkUserId } = await auth();
    let viewerId: string | null = null;
    if (clerkUserId) {
      const { data: self } = await supabaseAdmin
        .from('players')
        .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, status_text')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();
      viewerId = self?.id ?? null;
      const selfIndex = self ? sortedPlayerIds.indexOf(self.id) : -1;
      if (self && selfIndex >= limit) {
        me = {
          rank: selfIndex + 1,
          id: self.player_id,
          odid: self.id,
          name: self.display_name || 'You',
          totalXp: xpByPlayer[self.id] || 0,
          level: Math.floor((xpByPlayer[self.id] || 0) / 100) + 1,
          hidden: false,
          avatar: buildAvatar(self),
          status: self.status_text || null,
        };
      }
    }

    if (rankedPlayerIds.length === 0) {
      return NextResponse.json({ leaderboard: [], me: null, period, storeId });
    }

    // ── Fetch player display data for ranked players ──────────────────────────
    const { data: players, error: playersError } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_show_as_anonymous, privacy_profile_visibility, status_text')
      .in('id', rankedPlayerIds);

    if (playersError) {
      console.error('Leaderboard players error:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    // Status follows profile visibility: public = anyone, friends = accepted friends only, private = nobody (except yourself)
    const friendIds = new Set<string>();
    if (viewerId) {
      const { data: fs } = await supabaseAdmin
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`);
      for (const f of fs ?? []) friendIds.add(f.requester_id === viewerId ? f.addressee_id : f.requester_id);
    }
    const canSeeStatus = (p: { id: string; privacy_profile_visibility?: string | null }) => {
      if (p.id === viewerId) return true;
      const v = p.privacy_profile_visibility || 'public';
      return v === 'public' || (v === 'friends' && friendIds.has(p.id));
    };

    // Leave out anyone the viewer has blocked, or who has blocked the viewer
    const blockedIds = new Set<string>();
    if (viewerId) {
      const { data: bs } = await supabaseAdmin
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'blocked')
        .or(`requester_id.eq.${viewerId},addressee_id.eq.${viewerId}`);
      for (const b of bs ?? []) blockedIds.add(b.requester_id === viewerId ? b.addressee_id : b.requester_id);
    }

    const playerMap: Record<string, (typeof players)[0]> = {};
    for (const p of players ?? []) playerMap[p.id] = p;

    const titlesByPlayer = await getTitlesForPlayers(rankedPlayerIds);

    const leaderboard = rankedPlayerIds
      .map((playerId, index) => {
        const player = playerMap[playerId];
        if (!player || blockedIds.has(playerId)) return null;
        const isAnonymous = player.privacy_show_as_anonymous === true;
        return {
          rank: index + 1,
          id: player.player_id,
          odid: player.id,
          name: isAnonymous ? 'Anonymous' : (player.display_name || 'Unknown'),
          totalXp: xpByPlayer[playerId] || 0,
          level: Math.floor((xpByPlayer[playerId] || 0) / 100) + 1,
          hidden: isAnonymous,
          memberTitles: isAnonymous ? [] : (titlesByPlayer[playerId] ?? []),
          avatar: isAnonymous ? ANONYMOUS_AVATAR : buildAvatar(player),
          status: !isAnonymous && canSeeStatus(player) ? (player.status_text || null) : null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ leaderboard, me, period, storeId: storeId ?? null });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildAvatar(player: any) {
  if (player.avatar_config) {
    const config = typeof player.avatar_config === 'string'
      ? JSON.parse(player.avatar_config)
      : player.avatar_config;
    return {
      type: config.photo_url ? 'photo' : 'emoji',
      base: config.base || '😎',
      photoUrl: config.photo_url || null,
      background: config.background || '#3b82f6',
      frame: config.frame || 'none',
      badge: config.badge || null,
    };
  }
  return {
    type: player.avatar_photo_url ? 'photo' : 'emoji',
    base: player.avatar_base || '😎',
    photoUrl: player.avatar_photo_url || null,
    background: player.avatar_background || '#3b82f6',
    frame: player.avatar_frame || 'none',
    badge: player.avatar_badge || null,
  };
}
