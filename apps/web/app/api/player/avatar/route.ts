import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';


export const dynamic = 'force-dynamic';
interface AvatarConfig {
  base: string;
  background: string;
  frame: string;
  badge: string | null;
  photo_url: string | null;
  previous_photo_url?: string | null;
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
    let currentConfig: AvatarConfig = defaultAvatarConfig;
    if (player.avatar_config && typeof player.avatar_config === 'object' && !Array.isArray(player.avatar_config)) {
      const config = player.avatar_config as unknown as Record<string, unknown>;
      currentConfig = {
        base: typeof config.base === 'string' ? config.base : defaultAvatarConfig.base,
        background: typeof config.background === 'string' ? config.background : defaultAvatarConfig.background,
        frame: typeof config.frame === 'string' ? config.frame : defaultAvatarConfig.frame,
        badge: typeof config.badge === 'string' ? config.badge : null,
        photo_url: typeof config.photo_url === 'string' ? config.photo_url : null,
        // Always preserve — managed exclusively by avatar-photo route
        previous_photo_url: typeof config.previous_photo_url === 'string' ? config.previous_photo_url : null,
      };
    }

    // Validate photo_url — must be null or a Supabase storage URL owned by this app
    const SUPABASE_STORAGE_PREFIX = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')}/storage/`;
    const validatedPhotoUrl = photo_url === undefined
      ? currentConfig.photo_url
      : (photo_url === null || (typeof photo_url === 'string' && photo_url.startsWith(SUPABASE_STORAGE_PREFIX))
          ? photo_url
          : currentConfig.photo_url); // reject arbitrary external URLs silently

    // Build new config — never touch previous_photo_url (managed by avatar-photo route only)
    const newConfig: AvatarConfig = {
      base: base !== undefined ? base : currentConfig.base,
      background: background !== undefined ? background : currentConfig.background,
      frame: frame !== undefined ? frame : currentConfig.frame,
      badge: badge !== undefined ? badge : currentConfig.badge,
      photo_url: validatedPhotoUrl,
      previous_photo_url: currentConfig.previous_photo_url ?? null,
    };

    // Update avatar config - cast to JSON compatible type
    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_config: JSON.parse(JSON.stringify(newConfig)) })
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

    let avatarConfig: AvatarConfig = defaultAvatarConfig;
    if (player.avatar_config && typeof player.avatar_config === 'object' && !Array.isArray(player.avatar_config)) {
      const config = player.avatar_config as unknown as Record<string, unknown>;
      avatarConfig = {
        base: typeof config.base === 'string' ? config.base : defaultAvatarConfig.base,
        background: typeof config.background === 'string' ? config.background : defaultAvatarConfig.background,
        frame: typeof config.frame === 'string' ? config.frame : defaultAvatarConfig.frame,
        badge: typeof config.badge === 'string' ? config.badge : null,
        photo_url: typeof config.photo_url === 'string' ? config.photo_url : null,
        previous_photo_url: typeof config.previous_photo_url === 'string' ? config.previous_photo_url : null,
      };
    }

    return NextResponse.json({ avatarConfig });

  } catch (error) {
    console.error('Avatar get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
