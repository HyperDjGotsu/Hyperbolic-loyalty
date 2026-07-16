import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Staff invite codes — grant is_staff: true on account creation
const STAFF_INVITE_CODES = new Set(['HYPSTAFF2026', 'GGCSTAFF2026']);

function generateHypId(): string {
  let id = 'HYP-';
  for (let i = 0; i < 6; i++) {
    id += ID_CHARS.charAt(Math.floor(Math.random() * ID_CHARS.length));
  }
  return id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, games, avatar, staffInviteCode } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name required' }, { status: 400 });
    }

    const isStaff = typeof staffInviteCode === 'string' &&
      STAFF_INVITE_CODES.has(staffInviteCode.trim().toUpperCase());

    let hypId = generateHypId();
    let attempts = 0;

    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('player_id', hypId)
        .single();

      if (!existing) break;
      hypId = generateHypId();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Failed to generate unique ID' }, { status: 500 });
    }

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .insert({
        player_id: hypId,
        display_name: displayName.trim(),
        avatar_base: avatar?.base || '😎',
        avatar_background: avatar?.background || '#3b82f6',
        avatar_frame: avatar?.frame || 'none',
        avatar_badge: avatar?.badge || null,
        pass_tier: 'none',
        profile_visibility: 'public',
        is_staff: isStaff,
      })
      .select()
      .single();

    if (error) {
      console.error('Create player error:', error);
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
    }

    return NextResponse.json({
      id: player.id,
      hyp_id: player.player_id,
      displayName: player.display_name,
      isStaff,
      avatar: {
        emoji: player.avatar_base,
        background: player.avatar_background,
        frame: player.avatar_frame,
        badge: player.avatar_badge,
      },
    });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
