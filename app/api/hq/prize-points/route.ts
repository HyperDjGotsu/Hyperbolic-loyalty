import { NextResponse } from 'next/server';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';
import { logPointTransaction, getPlayerBalance } from '@/lib/points';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.json() as Record<string, unknown>;
    if (!('storeId' in rawBody)) {
      return NextResponse.json({ error: 'storeId is required (use null for network-level adjustments)' }, { status: 400 });
    }
    const { playerId, amount, reason, storeId } = rawBody as {
      playerId: string;
      amount: number;
      reason: string;
      storeId: string | null;
    };

    if (!playerId || amount === undefined || !reason?.trim()) {
      return NextResponse.json(
        { error: 'playerId, amount, and reason are required' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount) || amount === 0) {
      return NextResponse.json(
        { error: 'amount must be a non-zero integer' },
        { status: 400 }
      );
    }

    // storeId = null → network-level adjustment → network admin only
    // storeId = uuid → store-scoped → any authorized staff for that store
    const staffCtx = storeId
      ? await requireStoreAccess(storeId)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify player exists
    const { data: player, error: playerErr } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('id', playerId)
      .single();

    if (playerErr || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Negative corrections must not result in a negative balance
    if (amount < 0) {
      const currentBalance = await getPlayerBalance(playerId, storeId ?? undefined);
      if (currentBalance + amount < 0) {
        return NextResponse.json(
          { error: `Cannot deduct ${Math.abs(amount)} pts — current balance is ${currentBalance}` },
          { status: 400 }
        );
      }
    }

    await logPointTransaction({
      playerId,
      storeId,
      amount,
      type: 'admin_adjust',
      source: 'hq_manual',
      note: reason.trim(),
    });

    const newBalance = await getPlayerBalance(playerId, storeId ?? undefined);
    return NextResponse.json({ success: true, newBalance });
  } catch (err) {
    console.error('prize-points POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const storeId = searchParams.get('storeId');

    if (!playerId || !storeId) {
      return NextResponse.json({ error: 'playerId and storeId are required' }, { status: 400 });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const balance = await getPlayerBalance(playerId, storeId);
    return NextResponse.json({ balance });
  } catch (err) {
    console.error('prize-points GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
