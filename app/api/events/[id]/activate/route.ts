import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: staffPlayer } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staffPlayer?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { action } = await request.json() as { action: 'start' | 'end' };
    const eventId = params.id;

    if (action === 'start') {
      // End any currently active event first
      await supabaseAdmin
        .from('events')
        .update({ status: 'completed' } as any)
        .eq('status', 'active');

      const { error } = await supabaseAdmin
        .from('events')
        .update({ status: 'active' } as any)
        .eq('id', eventId);

      if (error) {
        return NextResponse.json({ error: 'Failed to start event' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'active' });
    }

    if (action === 'end') {
      const { error } = await supabaseAdmin
        .from('events')
        .update({ status: 'completed' } as any)
        .eq('id', eventId);

      if (error) {
        return NextResponse.json({ error: 'Failed to end event' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'completed' });
    }

    return NextResponse.json({ error: 'Invalid action. Use start or end.' }, { status: 400 });
  } catch (error) {
    console.error('Activate event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
