import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAnyStaff } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: png, jpg, webp, gif' }, { status: 400 });
    }

    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `banners/${timestamp}-${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('store-assets')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('upload-banner upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('store-assets')
      .getPublicUrl(path);

    const { data: existing } = await supabaseAdmin.storage
      .from('store-assets')
      .list('banners', { sortBy: { column: 'created_at', order: 'desc' } });

    if (existing && existing.length > 5) {
      const toDelete = existing.slice(5).map((f) => `banners/${f.name}`);
      await supabaseAdmin.storage.from('store-assets').remove(toDelete);
    }

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('upload-banner error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
