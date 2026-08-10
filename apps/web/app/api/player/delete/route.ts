import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const dynamic = 'force-dynamic';

// Typed client for tables that exist in the generated schema
function getTypedAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Untyped client for player_deletions (not in generated types yet — added by migration)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUntypedAdminClient(): SupabaseClient<any> {
  return createClient(
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

  const db = getTypedAdminClient();
  const dbRaw = getUntypedAdminClient();

  // --------------------------------------------------------
  // Look up player record by clerk_user_id
  // --------------------------------------------------------
  const { data: player, error: playerError } = await db
    .from('players')
    .select('id, is_staff')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const playerId: string = player.id;

  // --------------------------------------------------------
  // Pre-flight: staff check via players.is_staff
  // --------------------------------------------------------
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

  // Also check app_users / role tables
  const { data: appUser } = await db
    .from('app_users')
    .select(
      'id, network_staff_roles!network_staff_roles_user_id_fkey(role), staff_store_roles!staff_store_roles_user_id_fkey(store_id)'
    )
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (appUser) {
    const networkRoles = (appUser.network_staff_roles ?? []) as { role: string }[];
    const storeRoles = (appUser.staff_store_roles ?? []) as { store_id: string }[];
    const hasStaffRole = networkRoles.length > 0 || storeRoles.length > 0;

    if (hasStaffRole) {
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

  // --------------------------------------------------------
  // Pre-flight: idempotency / in-progress check
  // --------------------------------------------------------
  const { data: existingDeletion } = await dbRaw
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

  // --------------------------------------------------------
  // SAGA — start audit record
  // --------------------------------------------------------
  let step = 'audit_init';
  let auditId: string | null = null;

  async function updateStep(s: string) {
    step = s;
    if (auditId) {
      await dbRaw
        .from('player_deletions')
        .update({ current_step: s })
        .eq('id', auditId);
    }
  }

  try {
    // step: audit_init
    const { data: auditRow, error: auditInsertError } = await dbRaw
      .from('player_deletions')
      .insert({
        player_id: playerId,
        clerk_user_id: clerkUserId,
        status: 'in_progress',
        current_step: 'audit_init',
      })
      .select('id')
      .single();

    if (auditInsertError || !auditRow) {
      console.error('[delete] failed to insert audit row:', auditInsertError?.message);
      return NextResponse.json(
        {
          error: 'deletion_failed',
          message: 'Account deletion could not be completed. Please contact support.',
        },
        { status: 500 }
      );
    }

    auditId = auditRow.id as string;

    // --------------------------------------------------------
    // step: cancel_redemptions
    // --------------------------------------------------------
    await updateStep('cancel_redemptions');

    await db
      .from('prize_wall_redemptions')
      .update({
        status: 'cancelled',
        void_reason: 'account_deleted',
        voided_at: new Date().toISOString(),
      })
      .eq('player_id', playerId)
      .in('status', ['pending', 'approved']);

    // --------------------------------------------------------
    // step: delete_personal
    // --------------------------------------------------------
    await updateStep('delete_personal');

    await db.from('friendships').delete().or(`requester_id.eq.${playerId},addressee_id.eq.${playerId}`);
    await db.from('event_interest').delete().eq('player_id', playerId);
    await db.from('notifications').delete().eq('player_id', playerId);
    await db.from('expo_push_tokens').delete().eq('player_id', playerId);
    await db.from('push_subscriptions').delete().eq('player_id', playerId);
    await db.from('bounty_hunter_participants').delete().eq('player_id', playerId);
    await db.from('player_inventory').delete().eq('player_id', playerId);

    // --------------------------------------------------------
    // step: anonymize_history
    // Use dbRaw here because the migration makes these columns nullable,
    // but the generated types haven't been regenerated yet.
    // --------------------------------------------------------
    await updateStep('anonymize_history');

    await dbRaw.from('xp_ledger').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('prize_point_transactions').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('prize_wall_redemptions').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('daily_spins').update({ player_id: null }).eq('player_id', playerId);
    // emperors: anonymize AND snapshot display_name in one update
    await dbRaw
      .from('emperors')
      .update({ player_id: null, display_name_snapshot: 'Deleted Player' })
      .eq('player_id', playerId);
    await dbRaw.from('event_attendance').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('event_attendances').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('pass_history').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('player_pass_subscriptions').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('circuit_qualifiers').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('preorder_claims').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('transactions').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('card_of_the_day_votes').update({ player_id: null }).eq('player_id', playerId);
    await dbRaw.from('bounty_hunter_matches').update({ winner_id: null }).eq('winner_id', playerId);
    await dbRaw.from('bounty_hunter_matches').update({ loser_id: null }).eq('loser_id', playerId);

    // --------------------------------------------------------
    // step: anonymize_references
    // --------------------------------------------------------
    await updateStep('anonymize_references');

    await dbRaw.from('xp_ledger').update({ awarded_by: null }).eq('awarded_by', playerId);
    await dbRaw.from('players').update({ referred_by: null }).eq('referred_by', playerId);

    // --------------------------------------------------------
    // step: delete_player
    // --------------------------------------------------------
    await updateStep('delete_player');

    const { error: deletePlayerError } = await db.from('players').delete().eq('id', playerId);

    if (deletePlayerError) {
      throw new Error(`delete_player: ${deletePlayerError.message}`);
    }

    // --------------------------------------------------------
    // step: delete_clerk
    // All Supabase data is gone at this point. Even if Clerk fails,
    // the player cannot sign in (no players row). Return 200.
    // --------------------------------------------------------
    await updateStep('delete_clerk');

    let clerkFailed = false;
    try {
      const client = await clerkClient();
      await client.users.deleteUser(clerkUserId);
    } catch (clerkErr: unknown) {
      const errObj = clerkErr as { status?: number };
      // 404 = already deleted, treat as success
      if (errObj?.status !== 404) {
        clerkFailed = true;
        // Log for manual cleanup — do not expose clerkUserId in response
        console.error('[delete] Clerk deletion requires manual cleanup. Check player_deletions audit table.');
      }
    }

    // --------------------------------------------------------
    // step: complete
    // --------------------------------------------------------
    if (clerkFailed) {
      await dbRaw
        .from('player_deletions')
        .update({
          status: 'failed_at_clerk',
          current_step: 'delete_clerk',
          completed_at: new Date().toISOString(),
        })
        .eq('id', auditId);
    } else {
      await dbRaw
        .from('player_deletions')
        .update({
          status: 'completed',
          current_step: 'complete',
          completed_at: new Date().toISOString(),
        })
        .eq('id', auditId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[delete] saga failed at step="${step}":`, message);

    // Update audit row for manual review
    if (auditId) {
      await dbRaw
        .from('player_deletions')
        .update({
          status: 'manual_review_required',
          current_step: step,
          error_message: `Failed at step: ${step}`,
        })
        .eq('id', auditId);
    }

    return NextResponse.json(
      {
        error: 'deletion_failed',
        message: 'Account deletion could not be completed. Please contact support.',
      },
      { status: 500 }
    );
  }
}
