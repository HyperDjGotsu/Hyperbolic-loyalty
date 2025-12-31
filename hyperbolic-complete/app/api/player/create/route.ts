import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Characters for HYP ID (no ambiguous 0/O/1/I/L)
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
    const { displayName, games, avatar } = body;

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name required' }, { status: 400 });
    }

    // Generate unique HYP ID
    let hypId = generateHypId();
    let attempts = 0;
    
    // Check for uniqueness (retry up to 10 times)
    while (attempts < 10) {
      const { data: existing } = await supabase
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

    // Create the player
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        player_id: hypId,
        display_name: displayName.trim(),
        avatar_emoji: avatar?.base || '😎',
        avatar_background: avatar?.background || '#3b82f6',
        avatar_frame: avatar?.frame || 'none',
        avatar_badge: avatar?.badge || null,
        pass_tier: 'free',
        profile_visibility: 'public',
      })
      .select()
      .single();

    if (error) {
      console.error('Create player error:', error);
      return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
    }

    // If games were selected, we can track those for personalization later
    // For now, we just return the new player

    return NextResponse.json({
      id: player.id,
      hyp_id: player.player_id,
      displayName: player.display_name,
      avatar: {
        emoji: player.avatar_emoji,
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
