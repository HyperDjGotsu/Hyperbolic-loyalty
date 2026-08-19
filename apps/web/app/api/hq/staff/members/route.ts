import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ctx = await requireAnyStaff();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all app_users that have any staff role, joined with player display info
    const { data: networkAdmins, error: naError } = await supabaseAdmin
      .from('network_staff_roles')
      .select(`
        id,
        role,
        granted_at,
        app_users!network_staff_roles_user_id_fkey (
          id,
          clerk_user_id,
          email
        )
      `);

    if (naError) throw naError;

    const { data: storeRoles, error: srError } = await supabaseAdmin
      .from('staff_store_roles')
      .select(`
        id,
        role,
        store_id,
        granted_at,
        app_users!staff_store_roles_user_id_fkey (
          id,
          clerk_user_id,
          email
        ),
        stores!staff_store_roles_store_id_fkey ( name )
      `);

    if (srError) throw srError;

    // Gather all clerk_user_ids to fetch display names from players table
    const clerkIds = new Set<string>();
    (networkAdmins ?? []).forEach(r => {
      const u = r.app_users as { clerk_user_id: string } | null;
      if (u?.clerk_user_id) clerkIds.add(u.clerk_user_id);
    });
    (storeRoles ?? []).forEach(r => {
      const u = r.app_users as { clerk_user_id: string } | null;
      if (u?.clerk_user_id) clerkIds.add(u.clerk_user_id);
    });

    let playerMap: Record<string, { display_name: string; player_id: string }> = {};
    if (clerkIds.size > 0) {
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('clerk_user_id, display_name, player_id')
        .in('clerk_user_id', Array.from(clerkIds));
      (players ?? []).forEach(p => {
        if (p.clerk_user_id) {
          playerMap[p.clerk_user_id] = { display_name: p.display_name, player_id: p.player_id };
        }
      });
    }

    // Only network admins can see all staff; store managers see their own stores only
    const filteredStoreRoles = ctx.isNetworkAdmin
      ? (storeRoles ?? [])
      : (storeRoles ?? []).filter(r => ctx.allStoreIds.includes(r.store_id));

    const members = [
      ...(ctx.isNetworkAdmin ? (networkAdmins ?? []).map(r => {
        const u = r.app_users as { id: string; clerk_user_id: string; email: string } | null;
        const player = u ? playerMap[u.clerk_user_id] : null;
        return {
          row_id: r.id,
          app_user_id: u?.id ?? null,
          role: 'network_admin' as const,
          store_id: null,
          store_name: null,
          display_name: player?.display_name ?? u?.email ?? '(unknown)',
          player_id: player?.player_id ?? null,
          email: u?.email ?? null,
          granted_at: r.granted_at,
        };
      }) : []),
      ...filteredStoreRoles.map(r => {
        const u = r.app_users as { id: string; clerk_user_id: string; email: string } | null;
        const store = r.stores as { name: string } | null;
        const player = u ? playerMap[u.clerk_user_id] : null;
        return {
          row_id: r.id,
          app_user_id: u?.id ?? null,
          role: r.role as 'store_manager' | 'store_staff',
          store_id: r.store_id,
          store_name: store?.name ?? r.store_id,
          display_name: player?.display_name ?? u?.email ?? '(unknown)',
          player_id: player?.player_id ?? null,
          email: u?.email ?? null,
          granted_at: r.granted_at,
        };
      }),
    ];

    return NextResponse.json({ members });
  } catch (err) {
    console.error('staff/members error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
