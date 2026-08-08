import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function getPlayerId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();
  return data?.id ?? null;
}

// Register an Expo push token for the signed-in player
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const playerId = await getPlayerId(userId);
  if (!playerId) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const body = await request.json();
  const { expo_push_token, platform } = body as { expo_push_token?: string; platform?: string };

  if (!expo_push_token || !expo_push_token.startsWith('ExponentPushToken[')) {
    return NextResponse.json({ error: 'Invalid Expo push token' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('expo_push_tokens')
    .upsert(
      { player_id: playerId, token: expo_push_token, platform: platform ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'player_id,token' }
    );

  if (error) {
    console.error('expo-push-token POST error:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Remove token on sign-out
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const playerId = await getPlayerId(userId);
  if (!playerId) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { expo_push_token } = body as { expo_push_token?: string };

  if (expo_push_token) {
    await supabaseAdmin
      .from('expo_push_tokens')
      .delete()
      .eq('player_id', playerId)
      .eq('token', expo_push_token);
  } else {
    // Sign-out: remove all tokens for this player
    await supabaseAdmin
      .from('expo_push_tokens')
      .delete()
      .eq('player_id', playerId);
  }

  return NextResponse.json({ ok: true });
}
