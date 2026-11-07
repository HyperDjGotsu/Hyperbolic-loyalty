import { NextResponse } from 'next/server';
import { enforceRateLimitStrict, getClientIp } from '@/lib/rate-limit';
import { PITCH_COOKIE, PITCH_COOKIE_MAX_AGE_S, accessKey, checkPitchPassword, makeAccessToken } from '@/lib/pitch-access';

export const dynamic = 'force-dynamic';

// POST { password } — unlocks the store pitch pages on this browser for 30 days.
export async function POST(request: Request) {
  try {
    const key = accessKey();
    if (!key) {
      return NextResponse.json({ error: 'The store pitch is not available right now.' }, { status: 503 });
    }

    const limited = await enforceRateLimitStrict(`pitch-access:${getClientIp(request)}`, 600, 10);
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    if (!(await checkPitchPassword(body.password))) {
      return NextResponse.json({ error: 'That password is not right.' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(PITCH_COOKIE, await makeAccessToken(key), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PITCH_COOKIE_MAX_AGE_S,
    });
    return res;
  } catch (err) {
    console.error('pitch-access error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
