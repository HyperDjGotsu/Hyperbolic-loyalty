import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
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
