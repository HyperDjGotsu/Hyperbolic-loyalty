// TODO: Remove or further restrict before show day.
// Dev-only endpoint for animation iteration.

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEV_WHITELIST = new Set([
  'af741fa0-c22e-48f8-af85-21ec1db12d7c',
]);

function getPacificDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

async function getPlayerId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ isWhitelisted: false });
    const playerId = await getPlayerId(userId);
    return NextResponse.json({ isWhitelisted: playerId !== null && DEV_WHITELIST.has(playerId) });
  } catch {
    return NextResponse.json({ isWhitelisted: false });
  }
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const playerId = await getPlayerId(userId);

    if (!playerId || !DEV_WHITELIST.has(playerId)) {
      console.log(`[dev/reset-spin] REJECTED ${new Date().toISOString()} player=${playerId ?? 'unknown'}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const todayPacific = getPacificDate(new Date());

    const { data: deleted, error } = await supabaseAdmin
      .from('daily_spins')
      .delete()
      .eq('player_id', playerId)
      .eq('spin_date', todayPacific)
      .select('id');

    if (error) {
      console.error(`[dev/reset-spin] ERROR ${new Date().toISOString()} player=${playerId}`, error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const deletedCount = deleted?.length ?? 0;
    console.log(`[dev/reset-spin] RESET ${new Date().toISOString()} player=${playerId} deleted=${deletedCount}`);

    return NextResponse.json({ success: true, reset: true, deletedCount });
  } catch (err) {
    console.error('[dev/reset-spin] EXCEPTION', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
