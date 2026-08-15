import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const BUCKET = 'store-assets';

interface AvatarConfig {
  base?: string;
  background?: string;
  frame?: string;
  badge?: string | null;
  photo_url?: string | null;
  previous_photo_url?: string | null;
  [key: string]: unknown;
}

function parseConfig(raw: unknown): AvatarConfig {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as AvatarConfig;
  }
  return {};
}

// Extract storage path from a public URL, validated to belong to this player.
// Returns null if the URL does not match the expected pattern — prevents deleting
// another player's object or an arbitrary URL.
function ownedStoragePath(url: string, playerId: string): string | null {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length);
  // Only allow paths inside this player's avatar subdirectory.
  // Legacy paths (avatars/{playerId}.ext, no subdirectory) intentionally fail
  // this check — they are left as orphans rather than risked for deletion.
  if (!path.startsWith(`avatars/${playerId}/`)) return null;
  return path;
}

async function deleteStorageObject(url: string, playerId: string): Promise<void> {
  const path = ownedStoragePath(url, playerId);
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) console.error('Storage delete non-fatal:', path, error.message);
}

// POST — Upload a new photo. Implements rolling two-photo window:
//   current → previous → deleted (oldest on 3rd+ upload)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const current = parseConfig(player.avatar_config);
    const oldCurrentUrl = typeof current.photo_url === 'string' ? current.photo_url : null;
    const toDeleteUrl = typeof current.previous_photo_url === 'string' ? current.previous_photo_url : null;

    const ext = file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
      : file.type === 'image/gif' ? 'gif'
      : 'jpg';
    const path = `avatars/${player.id}/${randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    // Rolling window: new photo becomes current, old current becomes previous.
    const newConfig: AvatarConfig = {
      ...current,
      photo_url: publicUrl,
      previous_photo_url: oldCurrentUrl,
    };

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_config: JSON.parse(JSON.stringify(newConfig)) })
      .eq('id', player.id);

    if (updateError) {
      // DB update failed — compensate by removing the just-uploaded file.
      await supabaseAdmin.storage.from(BUCKET).remove([path]);
      console.error('Avatar config update error:', updateError);
      return NextResponse.json({ error: 'Failed to update avatar config' }, { status: 500 });
    }

    // DB is consistent — now safely delete the oldest photo (the previous previous).
    if (toDeleteUrl) {
      await deleteStorageObject(toDeleteUrl, player.id);
    }

    return NextResponse.json({ photo_url: publicUrl, previous_photo_url: oldCurrentUrl });
  } catch (err) {
    console.error('avatar-photo POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Revert to previous photo (swap current ↔ previous, no storage deletion).
export async function PATCH() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const current = parseConfig(player.avatar_config);
    const currentUrl = typeof current.photo_url === 'string' ? current.photo_url : null;
    const previousUrl = typeof current.previous_photo_url === 'string' ? current.previous_photo_url : null;

    if (!previousUrl) {
      return NextResponse.json({ error: 'No previous photo to revert to' }, { status: 400 });
    }

    // Swap — both files remain in storage, only DB pointers change.
    const newConfig: AvatarConfig = {
      ...current,
      photo_url: previousUrl,
      previous_photo_url: currentUrl,
    };

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_config: JSON.parse(JSON.stringify(newConfig)) })
      .eq('id', player.id);

    if (updateError) {
      console.error('Avatar revert error:', updateError);
      return NextResponse.json({ error: 'Failed to revert photo' }, { status: 500 });
    }

    return NextResponse.json({ photo_url: previousUrl, previous_photo_url: currentUrl });
  } catch (err) {
    console.error('avatar-photo PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Remove both current and previous photos from DB and storage.
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id, avatar_config')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const current = parseConfig(player.avatar_config);
    const urlsToDelete = [current.photo_url, current.previous_photo_url]
      .filter((u): u is string => typeof u === 'string');

    const newConfig: AvatarConfig = { ...current, photo_url: null, previous_photo_url: null };

    const { error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_config: JSON.parse(JSON.stringify(newConfig)) })
      .eq('id', player.id);

    if (updateError) {
      console.error('Avatar delete config error:', updateError);
      return NextResponse.json({ error: 'Failed to remove photo' }, { status: 500 });
    }

    // Storage cleanup after DB is consistent — errors are non-fatal.
    await Promise.all(urlsToDelete.map(url => deleteStorageObject(url, player.id)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('avatar-photo DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
