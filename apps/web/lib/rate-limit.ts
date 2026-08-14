import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

type RateLimitOutcome =
  | { status: 'allowed';      remaining: number; resetAt: Date }
  | { status: 'limited';      remaining: 0;      resetAt: Date }
  | { status: 'unavailable' };

/**
 * Extract a trusted client IP from Vercel request headers.
 *
 * On Vercel production, x-real-ip is set by the edge network and cannot
 * be forged by a client. x-forwarded-for is only safe when the leftmost
 * entry is known to be written by a trusted proxy — valid on Vercel but
 * not on arbitrary reverse-proxy setups, so it is a last resort only.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  // Last resort: leftmost XFF entry (safe on Vercel, attacker-controlled elsewhere)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

/**
 * Core atomic rate-limit check. Returns a discriminated outcome so callers
 * can choose fail-open or fail-closed without forgetting the error case.
 */
async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitOutcome> {
  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error) {
      console.error('[rate-limit] RPC error:', error.message);
      return { status: 'unavailable' };
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.error('[rate-limit] RPC returned empty result');
      return { status: 'unavailable' };
    }

    const row = data[0] as Record<string, unknown>;
    if (typeof row.allowed !== 'boolean' || typeof row.remaining !== 'number') {
      console.error('[rate-limit] RPC returned unexpected shape:', row);
      return { status: 'unavailable' };
    }

    const resetAt = new Date(row.reset_at as string);
    if (isNaN(resetAt.getTime())) {
      console.error('[rate-limit] RPC returned invalid reset_at:', row.reset_at);
      return { status: 'unavailable' };
    }

    if (!row.allowed) {
      return { status: 'limited', remaining: 0, resetAt };
    }
    return { status: 'allowed', remaining: row.remaining as number, resetAt };
  } catch (err) {
    console.error('[rate-limit] unexpected error:', err);
    return { status: 'unavailable' };
  }
}

/**
 * Rate limit check that FAILS CLOSED on infrastructure error.
 * Use for economic operations: purchases, redemptions, daily spin, check-in.
 * Returns a 429/503 NextResponse on deny/error, null on allow.
 */
export async function enforceRateLimitStrict(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<NextResponse | null> {
  const result = await checkRateLimit(key, windowSeconds, maxRequests);

  if (result.status === 'unavailable') {
    // Fail closed: infra error on a sensitive route → deny with 503
    return NextResponse.json(
      { error: 'Service temporarily unavailable', retryAfter: 30 },
      { status: 503, headers: { 'Retry-After': '30' } }
    );
  }
  if (result.status === 'limited') {
    return rateLimitedResponse(result.resetAt);
  }
  return null;
}

/**
 * Rate limit check that FAILS OPEN on infrastructure error.
 * Use for non-economic operations: voting, image proxy, HQ reads, etc.
 * Returns a 429 NextResponse on deny, null on allow or infra error.
 */
export async function enforceRateLimitPermissive(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<NextResponse | null> {
  const result = await checkRateLimit(key, windowSeconds, maxRequests);

  if (result.status === 'unavailable') {
    // Fail open: don't block normal usage when rate-limit infra is down
    return null;
  }
  if (result.status === 'limited') {
    return rateLimitedResponse(result.resetAt);
  }
  return null;
}

/**
 * Build a consistent 429 response with Retry-After header.
 * Does not expose internal bucket keys or limit configuration.
 */
export function rateLimitedResponse(resetAt?: Date): NextResponse {
  const retryAfter = resetAt
    ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
    : 60;

  return NextResponse.json(
    { error: 'Too many requests', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
