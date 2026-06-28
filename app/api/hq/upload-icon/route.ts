import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function verifyStaff(userId: string | null) {
  if (!userId) return false;
  const { data } = await supabaseAdmin
    .from('players')
    .select('is_staff')
    .eq('clerk_user_id', userId)
    .single();
  return data?.is_staff === true;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!await verifyStaff(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 512_000) {
      return NextResponse.json({ error: 'File too large (max 500 KB)' }, { status: 400 });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'png';
    const path = `icons/${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error } = await supabaseAdmin.storage
      .from('store-assets')
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('store-assets')
      .getPublicUrl(path);

    // Prune: keep only the 2 most recent uploads so the store can revert if needed
    try {
      const { data: files } = await supabaseAdmin.storage.from('store-assets').list('icons', {
        sortBy: { column: 'name', order: 'desc' },
      });
      if (files && files.length > 2) {
        const toDelete = files.slice(2).map(f => `icons/${f.name}`);
        await supabaseAdmin.storage.from('store-assets').remove(toDelete);
      }
    } catch (pruneErr) {
      console.warn('Storage prune error (non-fatal):', pruneErr);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('upload-icon error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
