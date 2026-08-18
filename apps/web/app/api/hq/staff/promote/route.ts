import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['store_staff', 'store_manager'] as const;
type AssignableRole = (typeof VALID_ROLES)[number];

// POST — assign a role to an existing player
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAnyStaff();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { player_uuid, role, store_id } = body as {
      player_uuid?: string;
      role?: string;
      store_id?: string;
    };

    if (!player_uuid || !role || !store_id) {
      return NextResponse.json({ error: 'player_uuid, role, and store_id are required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role as AssignableRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const assignableRole = role as AssignableRole;

    // Authorization checks:
    // - network_admin: can assign store_staff or store_manager to any store
    // - store_manager: can assign store_staff only, to own stores only
    if (!ctx.isNetworkAdmin) {
      if (assignableRole === 'store_manager') {
        return NextResponse.json(
          { error: 'Store managers cannot grant store_manager role' },
          { status: 403 }
        );
      }
      if (!ctx.managedStoreIds.includes(store_id)) {
        return NextResponse.json(
          { error: 'You can only assign staff to stores you manage' },
          { status: 403 }
        );
      }
    }

    // Verify store exists
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('id, name')
      .eq('id', store_id)
      .single();
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    // Fetch the target player
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, display_name, clerk_user_id')
      .eq('id', player_uuid)
      .single();
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    if (!player.clerk_user_id) {
      return NextResponse.json({ error: 'Player has no linked account' }, { status: 400 });
    }

    // Get or create app_users record atomically via upsert (handles concurrent requests safely)
    const { data: appUser, error: upsertError } = await supabaseAdmin
      .from('app_users')
      .upsert({ clerk_user_id: player.clerk_user_id }, { onConflict: 'clerk_user_id' })
      .select('id')
      .single();
    if (upsertError || !appUser) throw upsertError ?? new Error('Failed to resolve app_users record');

    // Check existing role at this store — treat DB errors as failures (not as "no row")
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('staff_store_roles')
      .select('id, role')
      .eq('user_id', appUser.id)
      .eq('store_id', store_id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      if (existing.role === assignableRole) {
        return NextResponse.json({ error: 'Player already has this role at this store' }, { status: 409 });
      }
      // Prevent downgrade (store_manager → store_staff)
      if (existing.role === 'store_manager' && assignableRole === 'store_staff') {
        return NextResponse.json(
          { error: 'Cannot downgrade store_manager to store_staff — revoke the manager role first' },
          { status: 409 }
        );
      }
      // Upgrade: store_staff → store_manager
      const { error: upgradeError } = await supabaseAdmin
        .from('staff_store_roles')
        .update({ role: assignableRole, granted_by: ctx.appUserId })
        .eq('id', existing.id);
      if (upgradeError) throw upgradeError;

      return NextResponse.json({
        success: true,
        action: 'upgraded',
        display_name: player.display_name,
        store_name: store.name,
        role: assignableRole,
      });
    }

    // Insert new role
    const { error: insertError } = await supabaseAdmin
      .from('staff_store_roles')
      .insert({
        user_id: appUser.id,
        store_id,
        role: assignableRole,
        granted_by: ctx.appUserId,
      });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      action: 'assigned',
      display_name: player.display_name,
      store_name: store.name,
      role: assignableRole,
    });
  } catch (err) {
    console.error('staff/promote error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — revoke a store role (identified by staff_store_roles row id)
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAnyStaff();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const row_id = request.nextUrl.searchParams.get('row_id');
    if (!row_id) return NextResponse.json({ error: 'row_id required' }, { status: 400 });

    // Fetch the role row to authorize the action
    const { data: roleRow } = await supabaseAdmin
      .from('staff_store_roles')
      .select('id, role, store_id, user_id')
      .eq('id', row_id)
      .single();
    if (!roleRow) return NextResponse.json({ error: 'Role not found' }, { status: 404 });

    // Authorization:
    // - network_admin: can revoke any store role
    // - store_manager: can revoke store_staff only at own stores
    if (!ctx.isNetworkAdmin) {
      if (roleRow.role === 'store_manager') {
        return NextResponse.json(
          { error: 'Store managers cannot revoke store_manager roles' },
          { status: 403 }
        );
      }
      if (!ctx.managedStoreIds.includes(roleRow.store_id)) {
        return NextResponse.json(
          { error: 'You can only revoke staff from stores you manage' },
          { status: 403 }
        );
      }
    }

    // Prevent self-revocation
    if (roleRow.user_id === ctx.appUserId) {
      return NextResponse.json({ error: 'Cannot revoke your own role' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('staff_store_roles')
      .delete()
      .eq('id', row_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('staff/promote DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
