import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// SQL function returns { success: true, ... } or { error: "message" }.
// Map error substrings to HTTP status codes.
function mapSqlError(msg: string): { message: string; status: number } {
  if (msg.includes('Invalid') || msg.includes('expired invitation')) return { message: msg, status: 404 };
  if (msg.includes('revoked'))          return { message: msg, status: 410 };
  if (msg.includes('already accepted')) return { message: msg, status: 410 };
  if (msg.includes('expired'))          return { message: msg, status: 410 };
  if (msg.includes('mismatch') || msg.includes('different address')) return { message: msg, status: 403 };
  return { message: msg, status: 400 };
}

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

    const result = data as {
      success?: boolean;
      error?: string;
      app_user_id?: string;
      store_id?: string;
      role?: string;
    };

    if (!result.success) {
      const { message, status } = mapSqlError(result.error ?? 'Invitation could not be accepted');
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({
      accepted: true,
      store_id: result.store_id,
      role: result.role,
    });
  } catch (err) {
    console.error('accept-invite POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
