import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// POST — accept a staff invitation
// Body: { token: string }
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'You must be signed in to accept an invitation', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    // Look up the invitation by hash
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from('staff_invitations' as any)
      .select('id, email, store_id, role, expires_at, accepted_at, revoked_at')
      .eq('token_hash', tokenHash)
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or invalid token' }, { status: 404 });
    }

    const inv = invitation as any;

    if (inv.revoked_at) {
      return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 410 });
    }
    if (inv.accepted_at) {
      return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 410 });
    }
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    // Find or create an app_users record for the Clerk user
    let { data: appUser, error: appUserErr } = await supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (appUserErr) throw appUserErr;

    if (!appUser) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('app_users')
        .insert({ clerk_user_id: userId })
        .select('id')
        .single();

      if (createErr) throw createErr;
      appUser = created;
    }

    // Check if this role assignment already exists (idempotent accept)
    const { data: existingRole } = await supabaseAdmin
      .from('staff_store_roles')
      .select('id')
      .eq('user_id', appUser!.id)
      .eq('store_id', inv.store_id)
      .eq('role', inv.role)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleErr } = await supabaseAdmin
        .from('staff_store_roles')
        .insert({
          user_id: appUser!.id,
          store_id: inv.store_id,
          role: inv.role,
          granted_by: null, // invitation flow; inviter reference lives on the invitation record
        });

      if (roleErr) throw roleErr;
    }

    // Mark invitation as accepted
    const { error: acceptErr } = await supabaseAdmin
      .from('staff_invitations' as any)
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id);

    if (acceptErr) throw acceptErr;

    return NextResponse.json({
      accepted: true,
      store_id: inv.store_id,
      role: inv.role,
      already_had_role: !!existingRole,
    });
  } catch (err) {
    console.error('accept-invite POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
