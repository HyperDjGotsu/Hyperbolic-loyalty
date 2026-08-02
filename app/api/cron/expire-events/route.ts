import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Runs daily at 3am PT — marks past scheduled events as expired
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('events')
    .update({ status: 'completed' })
    .eq('status', 'scheduled')
    .lt('ends_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // ended > 1 hour ago
    .select('id');

  if (error) {
    console.error('expire-events cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const expired = data?.length ?? 0;
  console.log(`expire-events: marked ${expired} events as completed`);

  return NextResponse.json({ message: `Marked ${expired} past events as completed`, expired });
}
