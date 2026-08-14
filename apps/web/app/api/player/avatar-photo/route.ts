import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg';
    const path = `avatars/${player.id}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from('store-assets')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('Avatar photo upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('store-assets')
      .getPublicUrl(path);

    // Merge photo_url into existing avatar_config
    const current = (typeof player.avatar_config === 'object' && player.avatar_config && !Array.isArray(player.avatar_config))
      ? player.avatar_config as Record<string, unknown>
      : {};

    const newConfig = { ...current, photo_url: publicUrl };

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_config: newConfig })
      .eq('id', player.id);

    if (updateError) {
      console.error('Avatar config update error:', updateError);
      return NextResponse.json({ error: 'Failed to update avatar config' }, { status: 500 });
    }

    return NextResponse.json({ photo_url: publicUrl });
  } catch (err) {
    console.error('avatar-photo error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const current = (typeof player.avatar_config === 'object' && player.avatar_config && !Array.isArray(player.avatar_config))
      ? player.avatar_config as Record<string, unknown>
      : {};

    const newConfig = { ...current, photo_url: null };

    await supabaseAdmin
      .from('players')
      .update({ avatar_config: newConfig })
      .eq('id', player.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('avatar-photo DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
