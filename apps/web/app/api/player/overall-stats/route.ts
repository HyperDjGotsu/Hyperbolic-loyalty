import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { computeOverallStats } from '@/lib/overall-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Read-only: attendance ledger rows are the single source for attended/wins/streak.
    const { data: rows, error } = await supabase
      .from('xp_ledger')
      .select('description, created_at')
      .eq('player_id', player.id)
      .eq('source', 'event_attendance');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      stats: computeOverallStats(rows ?? []),
    });
  } catch (error) {
    console.error('Error in overall-stats API:', error);
    return NextResponse.json({ error: 'Failed to fetch overall stats' }, { status: 500 });
  }
}
