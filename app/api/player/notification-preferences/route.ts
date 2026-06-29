import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = {
  daily_rewards: true,
  events: true,
  leaderboard: true,
  social: true,
  store: true,
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await (supabaseAdmin as any)
      .from('players')
      .select('notification_preferences')
      .eq('clerk_user_id', userId)
      .single();

    return NextResponse.json({
      prefs: { ...DEFAULT_PREFS, ...(data?.notification_preferences ?? {}) },
    });
  } catch (err) {
    console.error('notification-preferences GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { daily_rewards, events, leaderboard, social, store } = body;

    const prefs = {
      daily_rewards: daily_rewards ?? true,
      events: events ?? true,
      leaderboard: leaderboard ?? true,
      social: social ?? true,
      store: store ?? true,
    };

    const { error } = await (supabaseAdmin as any)
      .from('players')
      .update({ notification_preferences: prefs })
      .eq('clerk_user_id', userId);

    if (error) throw error;

    return NextResponse.json({ prefs });
  } catch (err) {
    console.error('notification-preferences POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
