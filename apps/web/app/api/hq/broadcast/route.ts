import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';
import { notifyStorePlayers, notifyAllPlayers } from '@/lib/notifications';
import { sendExpoPushToStorePlayers, sendExpoPushToAllPlayers } from '@/lib/expo-push';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      title: string;
      message: string;
      scope: 'store' | 'network';
      storeId: string | null;
    };

    const { title, message, scope, storeId } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    if (!['store', 'network'].includes(scope)) {
      return NextResponse.json({ error: 'scope must be "store" or "network"' }, { status: 400 });
    }

    if (scope === 'store' && !storeId) {
      return NextResponse.json({ error: 'storeId is required for store scope' }, { status: 400 });
    }

    if (scope === 'network') {
      const ctx = await requireNetworkAdmin();
      if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      const ctx = await requireStoreAccess(storeId!);
      if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();

    let playerCount = 0;
    if (scope === 'network') {
      playerCount = await notifyAllPlayers('store_announcement', trimmedTitle, trimmedMessage, null, 'store');
      sendExpoPushToAllPlayers({ title: trimmedTitle, body: trimmedMessage, category: 'store' }).catch(() => {});
    } else {
      playerCount = await notifyStorePlayers(storeId!, 'store_announcement', trimmedTitle, trimmedMessage, null, 'store');
      sendExpoPushToStorePlayers(storeId!, { title: trimmedTitle, body: trimmedMessage, category: 'store' }).catch(() => {});
    }

    await supabaseAdmin.from('broadcasts').insert({
      store_id: scope === 'store' ? storeId : null,
      scope,
      title: trimmedTitle,
      message: trimmedMessage,
      notification_type: 'store_announcement',
      sent_by_clerk_id: userId,
      player_count: playerCount,
    });

    return NextResponse.json({ success: true, playerCount });
  } catch (err) {
    console.error('broadcast POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      const ctx = await requireNetworkAdmin();
      if (!ctx) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from('broadcasts')
        .select('id, store_id, scope, title, message, player_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ broadcasts: data ?? [] });
    }

    const ctx = await requireStoreAccess(storeId);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabaseAdmin
      .from('broadcasts')
      .select('id, store_id, scope, title, message, player_count, created_at')
      .or(`store_id.eq.${storeId},scope.eq.network`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ broadcasts: data ?? [] });
  } catch (err) {
    console.error('broadcast GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
