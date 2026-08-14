import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitPermissive, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET - Validate a referral code
export async function GET(request: Request) {
  try {
    // 20 validations per hour per IP — pre-auth endpoint, protect referral enumeration
    const rl = await enforceRateLimitPermissive(`referral-v:${getClientIp(request)}`, 3600, 20);
    if (rl) return rl;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ valid: false, error: 'No code provided' });
    }

    // Look up the referral code
    const { data: referrer, error } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .eq('referral_code', code.toUpperCase())
      .single();

    if (error || !referrer) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ 
      valid: true,
      referrerName: referrer.display_name,
    });
  } catch (error) {
    console.error('Referral validation error:', error);
    return NextResponse.json({ valid: false, error: 'Internal error' });
  }
}
