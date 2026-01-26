import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Generate random HYP-ID
function generatePlayerId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'HYP-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate referral code from player ID
function generateReferralCode(playerId: string): string {
  // Use last 8 chars of UUID for uniqueness
  return `REF-${playerId.substring(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, hypId, displayName, discordUsername, phone, primaryGame, referralCode } = body;

    // Check if user already has a linked player
    const { data: existingLink } = await supabaseAdmin
      .from('players')
      .select('id, player_id')
      .eq('clerk_user_id', userId)
      .single();

    if (existingLink) {
      return NextResponse.json({ 
        error: 'Account already linked to a player',
        player_id: existingLink.player_id 
      }, { status: 400 });
    }

    if (action === 'link_existing') {
      // Link to an existing player by HYP-ID
      if (!hypId) {
        return NextResponse.json({ error: 'HYP-ID required' }, { status: 400 });
      }

      // Find the player
      const { data: player, error: findError } = await supabaseAdmin
        .from('players')
        .select('*')
        .eq('player_id', hypId.toUpperCase())
        .single();

      if (findError || !player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }

      // Check if player is already linked to another Clerk account
      if (player.clerk_user_id && player.clerk_user_id !== userId) {
        return NextResponse.json({ 
          error: 'This player is already linked to another account' 
        }, { status: 400 });
      }

      // Get Clerk user info to update missing fields
      const user = await currentUser();
      const clerkEmail = user?.emailAddresses?.[0]?.emailAddress || null;

      // Link the player to this Clerk user and update email if missing
      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({ 
          clerk_user_id: userId,
          // Only update email if it's missing in Supabase
          ...(clerkEmail && !player.email ? { email: clerkEmail } : {}),
        })
        .eq('id', player.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: 'Failed to link player' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        player_id: player.player_id,
        displayName: player.display_name 
      });

    } else if (action === 'create_new') {
      // Create a new player
      if (!displayName) {
        return NextResponse.json({ error: 'Display name required' }, { status: 400 });
      }

      // Get Clerk user info for email and real name
      const user = await currentUser();
      const clerkEmail = user?.emailAddresses?.[0]?.emailAddress || null;
      const clerkRealName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ') || null;
      
      // Generate unique player_id
      let newPlayerId = generatePlayerId();
      let attempts = 0;
      
      while (attempts < 10) {
        const { data: existing } = await supabaseAdmin
          .from('players')
          .select('id')
          .eq('player_id', newPlayerId)
          .single();
        
        if (!existing) break;
        newPlayerId = generatePlayerId();
        attempts++;
      }

      // Look up referrer if referral code provided
      let referrerId: string | null = null;
      let referrerName: string | null = null;
      
      if (referralCode) {
        const { data: referrer } = await supabaseAdmin
          .from('players')
          .select('id, display_name')
          .eq('referral_code', referralCode.toUpperCase())
          .single();
        
        if (referrer) {
          referrerId = referrer.id;
          referrerName = referrer.display_name;
        }
      }

      // Create the player with all fields
      const { data: newPlayer, error: createError } = await supabaseAdmin
        .from('players')
        .insert({
          player_id: newPlayerId,
          display_name: displayName,
          clerk_user_id: userId,
          // Auto-pulled from Clerk
          email: clerkEmail,
          real_name: clerkRealName,
          // User-provided
          discord_username: discordUsername || null,
          phone: phone || null,
          primary_game_id: primaryGame || null,
          // Referral fields
          referred_by: referrerId,
          referral_bonus_paid: false,
          // Defaults
          avatar_type: 'emoji',
          avatar_base: '😎',
          avatar_background: '#3b82f6',
          avatar_frame: 'none',
          profile_visibility: 'public',
          show_activity: true,
          show_games: true,
          show_stats: true,
          show_on_leaderboard: true,
          allow_friend_requests: true,
          allow_messages: 'friends',
          pass_tier: 'none',
          pass_status: 'inactive',
        })
        .select()
        .single();

      if (createError) {
        console.error('Create error:', createError);
        return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
      }

      // Generate and set referral code for the new player (using their UUID)
      const newReferralCode = generateReferralCode(newPlayer.id);
      await supabaseAdmin
        .from('players')
        .update({ referral_code: newReferralCode })
        .eq('id', newPlayer.id);

      // If valid referral code was used, award +30 XP to the new player
      if (referrerId) {
        await supabaseAdmin
          .from('xp_ledger')
          .insert({
            player_id: newPlayer.id,
            game_id: 'general',
            base_xp: 30,
            final_xp: 30,
            multiplier: 1,
            description: `Referral bonus - invited by ${referrerName}`,
            source: 'referral',
          });
        
        console.log(`🎁 Referral bonus: +30 XP awarded to ${displayName} (referred by ${referrerName})`);
      }

      return NextResponse.json({ 
        success: true, 
        player_id: newPlayer.player_id,
        displayName: newPlayer.display_name,
        referralBonus: referrerId ? 30 : 0,
        referredBy: referrerName,
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in link route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
