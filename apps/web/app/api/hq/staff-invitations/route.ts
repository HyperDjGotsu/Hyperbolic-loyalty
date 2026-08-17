import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin, requireStoreManager } from '@/lib/auth-helpers';
import { getAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['store_manager', 'store_staff'] as const;
type InviteRole = (typeof VALID_ROLES)[number];

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// POST — create an invitation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, store_id, role } = body as {
      email?: string;
      store_id?: string;
      role?: string;
    };

    if (!email || !store_id || !role) {
      return NextResponse.json({ error: 'email, store_id, and role are required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role as InviteRole)) {
      return NextResponse.json({ error: 'role must be store_manager or store_staff' }, { status: 400 });
    }

    // Authorization: network admin can invite managers or staff anywhere.
    // Store manager can only invite store_staff to stores they manage.
    let staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      if (role === 'store_manager') {
        return NextResponse.json(
          { error: 'Only network admins can invite store managers' },
          { status: 403 }
        );
      }
      staffCtx = await requireStoreManager(store_id);
      if (!staffCtx) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Verify the target store exists
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, name')
      .eq('id', store_id)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Require app_users record for the inviter
    const { data: inviterUser, error: inviterErr } = await supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', staffCtx.clerkUserId)
      .single();

    if (inviterErr || !inviterUser) {
      return NextResponse.json({ error: 'Inviter app_users record not found' }, { status: 500 });
    }

    // Fail closed in production if email is not configured
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set — cannot send staff invitation in production');
      return NextResponse.json(
        { error: 'Email service is not configured. Contact the network administrator.' },
        { status: 503 }
      );
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const normalizedEmail = email.toLowerCase().trim();
    // 72-hour expiry: short enough to limit exposure, long enough to be practical
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: insertErr } = await supabaseAdmin
      .from('staff_invitations')
      .insert({
        email: normalizedEmail,
        store_id,
        role,
        token_hash: tokenHash,
        invited_by: inviterUser.id,
        expires_at: expiresAt,
      })
      .select('id, email, store_id, role, expires_at, created_at')
      .single();

    if (insertErr) {
      // Unique index violation = active invite already exists
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email, store, and role. Revoke it first.' },
          { status: 409 }
        );
      }
      throw insertErr;
    }

    const acceptUrl = `${getAppUrl()}/staff/accept-invite?token=${rawToken}`;
    const roleLabel = role === 'store_manager' ? 'Store Manager' : 'Store Staff';
    const storeName = store.name;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: 'Player Pass <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: `You've been invited to join ${storeName} on Player Pass`,
        html: `
          <p>You have been invited to join <strong>${storeName}</strong>
          as <strong>${roleLabel}</strong> on Player Pass.</p>
          <p>
            <a href="${acceptUrl}"
               style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;
                      text-decoration:none;display:inline-block">
              Accept Invitation
            </a>
          </p>
          <p>This link expires in 72 hours and can only be used once by the account
          signed in with this email address.</p>
          <p>If you did not expect this invitation, you can safely ignore it.</p>
        `,
      }).catch((err: unknown) => {
        console.error('Invitation email failed to send:', err);
      });
    } else {
      // Development only — never logged in production (blocked above)
      console.log(`[DEV] Staff invitation accept URL for ${normalizedEmail}: ${acceptUrl}`);
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    console.error('staff-invitations POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — revoke an invitation
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('staff_invitations')
      .select('id, store_id, role, accepted_at, revoked_at')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (existing.accepted_at) {
      return NextResponse.json({ error: 'Cannot revoke an already accepted invitation' }, { status: 409 });
    }
    if (existing.revoked_at) {
      return NextResponse.json({ error: 'Invitation already revoked' }, { status: 409 });
    }

    // Authorization: same rules as creation
    let staffCtx = await requireNetworkAdmin();
    if (!staffCtx) {
      if (existing.role === 'store_manager') {
        return NextResponse.json(
          { error: 'Only network admins can revoke store manager invitations' },
          { status: 403 }
        );
      }
      staffCtx = await requireStoreManager(existing.store_id);
      if (!staffCtx) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { error: updateErr } = await supabaseAdmin
      .from('staff_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ revoked: true });
  } catch (err) {
    console.error('staff-invitations DELETE error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET — list invitations (staff can see invitations for their stores)
export async function GET() {
  try {
    const staffCtx = await requireNetworkAdmin();

    if (staffCtx) {
      // Network admin sees all
      const { data, error } = await supabaseAdmin
        .from('staff_invitations')
        .select('id, email, store_id, role, invited_by, expires_at, accepted_at, revoked_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ invitations: data || [] });
    }

    // Store managers see invitations for their stores only
    const { getStaffContext } = await import('@/lib/auth-helpers');
    const ctx = await getStaffContext();
    if (!ctx || ctx.managedStoreIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff_invitations')
      .select('id, email, store_id, role, invited_by, expires_at, accepted_at, revoked_at, created_at')
      .in('store_id', ctx.managedStoreIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invitations: data || [] });
  } catch (err) {
    console.error('staff-invitations GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
