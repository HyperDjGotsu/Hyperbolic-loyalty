import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify staff
    const { data: player } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!player?.is_staff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, name, icon, xp_name')
      .order('name');

    return NextResponse.json({ games: games || [] });
  } catch (error) {
    console.error('Games fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
