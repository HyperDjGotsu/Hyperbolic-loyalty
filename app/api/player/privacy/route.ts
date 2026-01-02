import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch current privacy settings
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get player by clerk_user_id
    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select(`
        privacy_profile_visibility,
        privacy_show_on_leaderboard,
        privacy_show_as_anonymous,
        privacy_allow_friend_requests,
        privacy_hide_from_search,
        privacy_show_activity,
        privacy_show_games,
        privacy_show_real_name
      `)
      .eq('clerk_user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching privacy settings:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Return privacy settings with defaults
    return NextResponse.json({
      privacy: {
        profile_visibility: player.privacy_profile_visibility || 'public',
        show_on_leaderboard: player.privacy_show_on_leaderboard ?? true,
        show_as_anonymous: player.privacy_show_as_anonymous ?? false,
        allow_friend_requests: player.privacy_allow_friend_requests ?? true,
        hide_from_search: player.privacy_hide_from_search ?? false,
        show_activity: player.privacy_show_activity ?? true,
        show_games: player.privacy_show_games ?? true,
        show_real_name: player.privacy_show_real_name ?? false,
      }
    });

  } catch (error) {
    console.error('Error in privacy GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update privacy settings
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Validate profile visibility
    const validVisibilities = ['public', 'friends', 'private'];
    if (body.profileVisibility && !validVisibilities.includes(body.profileVisibility)) {
      return NextResponse.json({ error: 'Invalid profile visibility' }, { status: 400 });
    }

    // Build update object (only include fields that are provided)
    const updateData: Record<string, any> = {};
    
    if (body.profileVisibility !== undefined) {
      updateData.privacy_profile_visibility = body.profileVisibility;
    }
    if (body.showOnLeaderboard !== undefined) {
      updateData.privacy_show_on_leaderboard = body.showOnLeaderboard;
    }
    if (body.showAsAnonymous !== undefined) {
      updateData.privacy_show_as_anonymous = body.showAsAnonymous;
    }
    if (body.allowFriendRequests !== undefined) {
      updateData.privacy_allow_friend_requests = body.allowFriendRequests;
    }
    if (body.hideFromSearch !== undefined) {
      updateData.privacy_hide_from_search = body.hideFromSearch;
    }
    if (body.showActivity !== undefined) {
      updateData.privacy_show_activity = body.showActivity;
    }
    if (body.showGames !== undefined) {
      updateData.privacy_show_games = body.showGames;
    }
    if (body.showRealName !== undefined) {
      updateData.privacy_show_real_name = body.showRealName;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
    }

    // Update player privacy settings
    const { error } = await supabaseAdmin
      .from('players')
      .update(updateData)
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('Error updating privacy settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Privacy settings updated' });

  } catch (error) {
    console.error('Error in privacy POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
