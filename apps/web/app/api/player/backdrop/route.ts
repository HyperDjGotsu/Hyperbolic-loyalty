import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { SELECTABLE_GAME_IDS } from '@/lib/games';

export const dynamic = 'force-dynamic';

const BUCKET = 'store-assets';
const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Storage path of a previous upload, only if it sits inside this player's own folder.
function ownedUploadPath(value: string | null, playerId: string): string | null {
  if (!value || !value.startsWith('upload:')) return null;
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  const url = value.slice(7);
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length);
  return path.startsWith(`backdrops/${playerId}/`) && !path.includes('..') ? path : null;
}

async function getPlayer(userId: string) {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id, hero_backdrop')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

async function removeOld(value: string | null, playerId: string) {
  const path = ownedUploadPath(value, playerId);
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) console.error('backdrop delete non-fatal:', path, error.message);
}

// POST JSON { gameId: string | null }  -> choose curated game art (null = back to default)
// POST multipart file                  -> upload your own (shown on the private Home hero only)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const player = await getPlayer(userId);
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const file = (await request.formData()).get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 3 MB)' }, { status: 400 });
      if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG or WebP image' }, { status: 400 });

      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `backdrops/${player.id}/${randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, await file.arrayBuffer(), { contentType: file.type });
      if (uploadError) {
        console.error('backdrop upload error:', uploadError);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
      }
      const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      const value = `upload:${publicUrl}`;
      const { error: updateError } = await supabaseAdmin.from('players').update({ hero_backdrop: value }).eq('id', player.id);
      if (updateError) {
        await supabaseAdmin.storage.from(BUCKET).remove([path]);
        return NextResponse.json({ error: 'Failed to save backdrop' }, { status: 500 });
      }
      await removeOld(player.hero_backdrop, player.id);
      return NextResponse.json({ heroBackdrop: value });
    }

    const { gameId } = (await request.json()) as { gameId: string | null };
    if (gameId !== null && !(typeof gameId === 'string' && (gameId === 'general' || SELECTABLE_GAME_IDS.includes(gameId)))) {
      return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
    }
    const value = gameId ? `game:${gameId}` : null;
    const { error } = await supabaseAdmin.from('players').update({ hero_backdrop: value }).eq('id', player.id);
    if (error) return NextResponse.json({ error: 'Failed to save backdrop' }, { status: 500 });
    await removeOld(player.hero_backdrop, player.id);
    return NextResponse.json({ heroBackdrop: value });
  } catch (err) {
    console.error('backdrop error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
