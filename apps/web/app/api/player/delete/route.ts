import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const dynamic = 'force-dynamic';

function getAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function DELETE() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const db = getAdminClient();

  // ── Look up player by clerk_user_id ──────────────────────────────────────
  const { data: player, error: playerError } = await db
    .from('players')
    .select('id, is_staff')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const playerId: string = player.id;

  // ── Pre-flight: staff check via denormalized flag ────────────────────────
  if (player.is_staff) {
    return NextResponse.json(
      {
        error: 'staff_active',
        message:
          'Your account has active staff permissions. Ask your network administrator to remove your staff role before deleting your account.',
      },
      { status: 400 }
    );
  }

  // Belt-and-suspenders: also check role tables in case is_staff is stale
  const { data: appUser } = await db
    .from('app_users')
    .select(
      'id, network_staff_roles!network_staff_roles_user_id_fkey(role), staff_store_roles!staff_store_roles_user_id_fkey(store_id)'
    )
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (appUser) {
    const hasNetworkRole = ((appUser.network_staff_roles ?? []) as { role: string }[]).length > 0;
    const hasStoreRole = ((appUser.staff_store_roles ?? []) as { store_id: string }[]).length > 0;
    if (hasNetworkRole || hasStoreRole) {
      return NextResponse.json(
        {
          error: 'staff_active',
          message:
            'Your account has active staff permissions. Ask your network administrator to remove your staff role before deleting your account.',
        },
        { status: 400 }
      );
    }
  }

  // ── Pre-flight: idempotency ──────────────────────────────────────────────
  const { data: existingDeletion } = await db
    .from('player_deletions')
    .select('id, status')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingDeletion) {
    if (existingDeletion.status === 'completed') {
      return NextResponse.json({ success: true });
    }
    if (existingDeletion.status === 'in_progress') {
      return NextResponse.json({ error: 'deletion_in_progress' }, { status: 409 });
    }
  }

  // ── Create audit record (committed before the transactional cleanup) ─────
  // This record persists even if the RPC rolls back, so we always have a log.
  const { data: auditRow, error: auditInsertError } = await db
    .from('player_deletions')
    .insert({
      player_id: playerId,
      clerk_user_id: clerkUserId,
      status: 'in_progress',
      current_step: 'cleanup_rpc',
    })
    .select('id')
    .single();

  if (auditInsertError || !auditRow) {
    console.error('[delete] audit insert failed:', auditInsertError?.message);
    return NextResponse.json(
      { error: 'deletion_failed', message: 'Account deletion could not be completed. Please contact support.' },
      { status: 500 }
    );
  }

  const auditId: string = auditRow.id;

  // ── Transactional Supabase cleanup via SECURITY DEFINER RPC ─────────────
  // All anonymize/delete steps run inside one Postgres transaction.
  // If any step fails the entire transaction rolls back — no partial state.
  const { error: rpcError } = await db.rpc('cleanup_player_data', { p_player_id: playerId });

  if (rpcError) {
    console.error('[delete] cleanup_player_data RPC failed:', rpcError.message);
    await db
      .from('player_deletions')
      .update({
        status: 'manual_review_required',
        current_step: 'cleanup_rpc',
        error_message: 'RPC failed — player data unchanged. Contact support.',
      })
      .eq('id', auditId);
    return NextResponse.json(
      { error: 'deletion_failed', message: 'Account deletion could not be completed. Please contact support.' },
      { status: 500 }
    );
  }

  // ── Delete Clerk identity (last — Supabase data is fully gone) ───────────
  // Even if this fails the player row is deleted, so sign-in would 404
  // on every subsequent data request. The audit record tracks the state.
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);
  } catch (clerkErr: unknown) {
    const errObj = clerkErr as { status?: number };
    if (errObj?.status !== 404) {
      // Log for manual cleanup — clerk_user_id retained in audit row for recovery
      console.error('[delete] Clerk deletion failed — requires manual cleanup. See player_deletions audit table.');
      await db
        .from('player_deletions')
        .update({
          status: 'failed_at_clerk',
          current_step: 'delete_clerk',
          completed_at: new Date().toISOString(),
        })
        .eq('id', auditId);
      // Return success to the client — their data is gone; Clerk cleanup is an admin task
      return NextResponse.json({ success: true });
    }
    // 404 = already deleted; treat as success (idempotent)
  }

  // ── Mark complete; clear clerk_user_id (it is no longer needed) ──────────
  await db
    .from('player_deletions')
    .update({
      status: 'completed',
      current_step: 'complete',
      completed_at: new Date().toISOString(),
      clerk_user_id: null,
    })
    .eq('id', auditId);

  return NextResponse.json({ success: true });
}
