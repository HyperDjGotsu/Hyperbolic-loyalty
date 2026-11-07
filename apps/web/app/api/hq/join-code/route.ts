import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireStoreAccess, requireStoreManager } from '@/lib/auth-helpers';
import { getJoinCode, setJoinCode } from '@/lib/store-join';
import { enforceRateLimitPermissive, enforceRateLimitStrict } from '@/lib/rate-limit';
import { getAppUrl } from '@/lib/app-url';

export const dynamic = 'force-dynamic';

// Canonical app URL. Only on preview and local builds, where that env var is often missing, fall back to the
// address this request came in on. Production keeps failing loudly rather than printing a link from an unknown host.
function baseUrl(request: Request): string {
  try {
    return getAppUrl();
  } catch (err) {
    if (process.env.VERCEL_ENV === 'production') throw err;
    return new URL(request.url).origin;
  }
}

async function describe(request: Request, storeId: string, code: string, rotatedAt: string) {
  const { data: store } = await supabaseAdmin.from('stores').select('name, slug').eq('id', storeId).maybeSingle();
  const slug = store?.slug ?? storeId;
  return {
    code,
    rotatedAt,
    storeName: store?.name ?? '',
    joinUrl: `${baseUrl(request)}/join/${encodeURIComponent(slug)}?c=${code}`,
  };
}

// GET /api/hq/join-code?storeId=… — any staff member of the store can see its code
export async function GET(request: Request) {
  try {
    const storeId = new URL(request.url).searchParams.get('storeId');
    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    const ctx = await requireStoreAccess(storeId);
    if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const limited = await enforceRateLimitPermissive(`hq-join-code:${ctx.clerkUserId}`, 60, 60);
    if (limited) return limited;

    const current = await getJoinCode(storeId);
    if (!current) return NextResponse.json({ error: 'Could not load code' }, { status: 500 });
    return NextResponse.json(await describe(request, storeId, current.code, current.rotatedAt));
  } catch (err) {
    console.error('join-code GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/hq/join-code { storeId } — rotate. Store managers and network admins only.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { storeId?: string };
    if (!body.storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    const ctx = await requireStoreManager(body.storeId);
    if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const limited = await enforceRateLimitStrict(`hq-join-code-rotate:${ctx.clerkUserId}`, 600, 10);
    if (limited) return limited;

    const next = await setJoinCode(body.storeId);
    if (!next) return NextResponse.json({ error: 'Could not rotate code' }, { status: 500 });
    return NextResponse.json(await describe(request, body.storeId, next.code, next.rotatedAt));
  } catch (err) {
    console.error('join-code POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
