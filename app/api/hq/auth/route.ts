import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ isStaff: false });
    }

    const { data: player } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    return NextResponse.json({ 
      isStaff: player?.is_staff === true 
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ isStaff: false });
  }
}
