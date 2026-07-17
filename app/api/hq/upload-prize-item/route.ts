import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireNetworkAdmin, requireStoreManager } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const storeId = formData.get('storeId') as string | null;

    // storeId present → store-scoped upload; absent → network-wide upload
    const staffCtx = storeId
      ? await requireStoreManager(storeId)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: png, jpg, webp, gif' }, { status: 400 });
    }

    const timestamp = Date.now();
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `prize-items/${timestamp}-${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('store-assets')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('upload-prize-item upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('store-assets')
      .getPublicUrl(path);

    const { data: existing } = await supabaseAdmin.storage
      .from('store-assets')
      .list('prize-items', { sortBy: { column: 'created_at', order: 'desc' } });

    if (existing && existing.length > 20) {
      const toDelete = existing.slice(20).map((f) => `prize-items/${f.name}`);
      await supabaseAdmin.storage.from('store-assets').remove(toDelete);
    }

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('upload-prize-item error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
