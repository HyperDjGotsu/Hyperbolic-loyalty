import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  NOT_FOUND:       { message: 'Invitation not found or invalid token',        status: 404 },
  REVOKED:         { message: 'This invitation has been revoked',              status: 410 },
  ALREADY_ACCEPTED:{ message: 'This invitation has already been accepted',     status: 410 },
  EXPIRED:         { message: 'This invitation has expired',                   status: 410 },
  EMAIL_MISMATCH:  { message: 'This invitation was sent to a different email address', status: 403 },
};

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

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

    // Collect verified email addresses from Clerk
    const clerkUser = await currentUser();
    const verifiedEmails = (clerkUser?.emailAddresses ?? [])
      .filter((ea) => ea.verification?.status === 'verified')
      .map((ea) => ea.emailAddress);

    if (verifiedEmails.length === 0) {
      return NextResponse.json(
        { error: 'Your account has no verified email address. Verify your email before accepting an invitation.' },
        { status: 403 }
      );
    }

    const tokenHash = hashToken(token);

    // Atomic: lock, validate, email-bind, find-or-create, assign, mark accepted
    const { data, error } = await supabaseAdmin.rpc('accept_staff_invitation', {
      p_token_hash:      tokenHash,
      p_clerk_user_id:   userId,
      p_verified_emails: verifiedEmails,
    });

    if (error) throw error;

    const result = data as { ok: boolean; code?: string; store_id?: string; role?: string };

    if (!result.ok) {
      const mapped = ERROR_MESSAGES[result.code ?? ''];
      return NextResponse.json(
        { error: mapped?.message ?? 'Invitation could not be accepted' },
        { status: mapped?.status ?? 400 }
      );
    }

    return NextResponse.json({ accepted: true, store_id: result.store_id, role: result.role });
  } catch (err) {
    console.error('accept-invite POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
