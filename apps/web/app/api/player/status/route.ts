import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get current player's status
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('status_text, status_updated_at')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching status:', error);
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    return NextResponse.json({ 
      status: player?.status_text || null,
      updatedAt: player?.status_updated_at || null,
    });

  } catch (error) {
    console.error('Status GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update player's status
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { status } = await request.json();

    // Validate status length (max 50 chars)
    if (status && status.length > 50) {
      return NextResponse.json({ error: 'Status too long (max 50 characters)' }, { status: 400 });
    }

    // Update status
    const { error } = await supabaseAdmin
      .from('players')
      .update({
        status_text: status || null,
        status_updated_at: new Date().toISOString(),
      })
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('Error updating status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: status || null });

  } catch (error) {
    console.error('Status POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
