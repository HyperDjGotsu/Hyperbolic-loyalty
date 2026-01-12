import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

interface AvatarConfig {
  base: string;
  background: string;
  frame: string;
  badge: string | null;
  photo_url: string | null;
}

const defaultAvatarConfig: AvatarConfig = {
  base: '😎',
  background: '#3b82f6',
  frame: 'none',
  badge: null,
  photo_url: null,
};

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
      .select('id, avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Parse current config safely
    const currentConfig: AvatarConfig = 
      typeof player.avatar_config === 'object' && player.avatar_config !== null
        ? (player.avatar_config as AvatarConfig)
        : defaultAvatarConfig;

    // Build new config
    const newConfig: AvatarConfig = {
      base: base !== undefined ? base : currentConfig.base,
      background: background !== undefined ? background : currentConfig.background,
      frame: frame !== undefined ? frame : currentConfig.frame,
      badge: badge !== undefined ? badge : currentConfig.badge,
      photo_url: photo_url !== undefined ? photo_url : currentConfig.photo_url,
    };

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

    const avatarConfig: AvatarConfig = 
      typeof player.avatar_config === 'object' && player.avatar_config !== null
        ? (player.avatar_config as AvatarConfig)
        : defaultAvatarConfig;

    return NextResponse.json({ avatarConfig });

  } catch (error) {
    console.error('Avatar get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
