import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get player's referral code and stats
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('id, referral_code, display_name')
      .eq('clerk_user_id', userId)
      .single();

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // If player doesn't have a referral code yet, generate one
    let referralCode = player.referral_code;
    if (!referralCode) {
      referralCode = `REF-${player.id.substring(0, 8).toUpperCase()}`;
      await supabaseAdmin
        .from('players')
        .update({ referral_code: referralCode })
        .eq('id', player.id);
    }

    // Count how many players this user has referred
    const { count: referralCount } = await supabaseAdmin
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', player.id);

    // Count how many referrals have attended (bonus paid)
    const { count: attendedCount } = await supabaseAdmin
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', player.id)
      .eq('referral_bonus_paid', true);

    // Get list of referred players with their status
    const { data: referrals } = await supabaseAdmin
      .from('players')
      .select('id, display_name, referral_bonus_paid, created_at')
      .eq('referred_by', player.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate total XP earned from referrals
    const totalReferralXp = (referralCount || 0) * 0 + (attendedCount || 0) * 50;

    return NextResponse.json({
      referralCode,
      shareUrl: `https://hyperbolic-loyalty.vercel.app/onboarding?ref=${referralCode}`,
      stats: {
        totalReferred: referralCount || 0,
        attendedFirstEvent: attendedCount || 0,
        pendingAttendance: (referralCount || 0) - (attendedCount || 0),
        totalXpEarned: totalReferralXp,
      },
      referrals: referrals?.map((r) => ({
        id: r.id,
        name: r.display_name,
        hasAttended: r.referral_bonus_paid,
        joinedAt: r.created_at,
      })) || [],
    });
  } catch (error) {
    console.error('Referral stats error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
