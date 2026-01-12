import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Update player's avatar configuration
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { base, background, frame, badge, photo_url } = body;

    // Get current player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Build new avatar config
    const avatarConfig: Record<string, any> = {};
    
    if (base !== undefined) avatarConfig.base = base;
    if (background !== undefined) avatarConfig.background = background;
    if (frame !== undefined) avatarConfig.frame = frame;
    if (badge !== undefined) avatarConfig.badge = badge;
    if (photo_url !== undefined) avatarConfig.photo_url = photo_url;

    // Get current config and merge
    const { data: currentPlayer } = await supabaseAdmin
      .from('players')
      .select('avatar_config')
      .eq('id', player.id)
      .single();

    const currentConfig = currentPlayer?.avatar_config || {
      base: '😎',
      background: '#3b82f6',
      frame: 'none',
      badge: null,
      photo_url: null,
    };

    const newConfig = { ...currentConfig, ...avatarConfig };

    // Update avatar config
    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_config: newConfig })
      .eq('id', player.id);

    if (updateError) {
      console.error('Error updating avatar:', updateError);
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Avatar updated!',
      avatarConfig: newConfig,
    });

  } catch (error) {
    console.error('Avatar update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Get current avatar config
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (error || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      avatarConfig: player.avatar_config || {
        base: '😎',
        background: '#3b82f6',
        frame: 'none',
        badge: null,
        photo_url: null,
      },
    });

  } catch (error) {
    console.error('Avatar get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
