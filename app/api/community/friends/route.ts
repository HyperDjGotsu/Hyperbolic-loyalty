import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch user's friends list
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current player
    const { data: currentPlayer, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (playerError || !currentPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get accepted friendships where user is either requester or addressee
    const { data: friendships, error: friendshipsError } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentPlayer.id},addressee_id.eq.${currentPlayer.id}`);

    if (friendshipsError) {
      console.error('Error fetching friendships:', friendshipsError);
      return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
    }

    // Extract friend IDs (the other person in each friendship)
    const friendIds = friendships?.map(f => 
      f.requester_id === currentPlayer.id ? f.addressee_id : f.requester_id
    ) || [];

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [], total: 0 });
    }

    // Fetch friend details - including avatar_photo_url and avatar_config
    const { data: friends, error: friendsError } = await supabaseAdmin
      .from('players')
      .select('id, player_id, display_name, avatar_base, avatar_background, avatar_frame, avatar_badge, avatar_photo_url, avatar_config, privacy_profile_visibility, status_text')
      .in('id', friendIds);

    if (friendsError) {
      console.error('Error fetching friend details:', friendsError);
      return NextResponse.json({ error: 'Failed to fetch friend details' }, { status: 500 });
    }

    // Get XP for each friend
    const { data: xpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('player_id, final_xp, base_xp')
      .in('player_id', friendIds);

    const xpMap: Record<string, number> = {};
    xpData?.forEach((entry: any) => {
      const xp = entry.final_xp || entry.base_xp || 0;
      if (!xpMap[entry.player_id]) xpMap[entry.player_id] = 0;
      xpMap[entry.player_id] += xp;
    });

    // Build friends list
    const friendsList = friends?.map((friend: any) => {
      const totalXp = xpMap[friend.id] || 0;
      const level = Math.floor(totalXp / 100) + 1;
      
      // Get photo URL from avatar_config or avatar_photo_url
      const avatarConfig = friend.avatar_config || {};
      const photoUrl = avatarConfig.photo_url || avatarConfig.photoUrl || friend.avatar_photo_url || null;

      return {
        id: friend.player_id,
        odid: friend.id, // internal id for operations
        name: friend.display_name || 'Unknown',
        title: `Level ${level}`,
        level,
        totalXp,
        avatar: {
          type: photoUrl ? 'photo' : 'emoji' as const,
          base: avatarConfig.base || friend.avatar_base || '😎',
          photoUrl: photoUrl,
          photo_url: photoUrl, // Include both formats
          background: avatarConfig.background || friend.avatar_background || '#3b82f6',
          frame: avatarConfig.frame || friend.avatar_frame || 'none',
          badge: avatarConfig.badge || friend.avatar_badge || null,
        },
        privacy: {
          profileVisibility: friend.privacy_profile_visibility || 'public',
        },
        status: friend.status_text || null,
        isFriend: true,
        isOnline: null, // TODO: implement online status
      };
    }) || [];

    return NextResponse.json({ 
      friends: friendsList,
      total: friendsList.length,
    });

  } catch (error) {
    console.error('Friends list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
