import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { enforceRateLimitPermissive, enforceRateLimitStrict, getClientIp } from '@/lib/rate-limit';
import { findStoreByJoinCode, normalizeJoinCode } from '@/lib/store-join';
import { SELECTABLE_GAME_IDS, resolveGameId } from '@/lib/games';

const MIN_AGE = 13;
const AGE_BLOCK_COOKIE = 'pp_age_blocked';

// Whole years between a YYYY-MM-DD birthdate and today; null if the date isn't real
function ageFromBirthdate(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const dob = new Date(Date.UTC(y, m - 1, d));
  if (dob.getUTCFullYear() !== y || dob.getUTCMonth() !== m - 1 || dob.getUTCDate() !== d || y < 1900) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() < m - 1 || (now.getUTCMonth() === m - 1 && now.getUTCDate() < d)) age--;
  return age >= 0 ? age : null;
}

export const dynamic = 'force-dynamic';

// Generate random network player ID — prefix comes from the player's home store, chars exclude O/0/I/1
const PLAYER_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePlayerId(prefix: string): string {
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += PLAYER_ID_CHARS.charAt(Math.floor(Math.random() * PLAYER_ID_CHARS.length));
  }
  return `${prefix}-${suffix}`;
}

// Generate referral code from player ID
function generateReferralCode(playerId: string): string {
  // Use last 8 chars of UUID for uniqueness
  return `REF-${playerId.substring(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    // Rate limit by IP before auth — protects account creation from spam/enumeration
    const rl = await enforceRateLimitPermissive(`player-link:${getClientIp(request)}`, 3600, 10);
    if (rl) return rl;

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, playerId, displayName, discordUsername, phone, primaryGame, referralCode, staffInviteCode, homeStoreId: pickedStoreId, birthdate, joinCode } = body;
    let homeStoreId: string | null = pickedStoreId || null;
    let homeStoreVerifiedAt: string | null = null;
    // Note: managedStoreId is intentionally NOT accepted here.
    // Staff store assignments are granted through the staff invitation flow
    // (staff_store_roles table), never through account creation.

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

    // Disabled for launch: a player ID alone is not proof of ownership. Needs a one-time claim code to come back.
    if (action === 'link_existing') {
      return NextResponse.json({ error: 'Linking an existing player ID is not available. Create a new profile.' }, { status: 403 });
    }

    if (false as boolean) {
      // Link to an existing player by player ID
      if (!playerId) {
        return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
      }

      // Find the player
      const { data: player, error: findError } = await supabaseAdmin
        .from('players')
        .select('*')
        .eq('player_id', playerId.toUpperCase())
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

      // Atomic claim: the WHERE clerk_user_id IS NULL condition ensures only one
      // concurrent request wins. If two requests race, one gets 0 rows back.
      const { data: claimed, error: updateError } = await supabaseAdmin
        .from('players')
        .update({
          clerk_user_id: userId,
          // Only update email if it's missing in Supabase
          ...(clerkEmail && !player.email ? { email: clerkEmail } : {}),
        })
        .eq('id', player.id)
        .is('clerk_user_id', null)
        .select('id');

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: 'Failed to link player' }, { status: 500 });
      }

      if (!claimed || claimed.length === 0) {
        return NextResponse.json(
          { error: 'This player was already claimed by another account' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        player_id: player.player_id,
        displayName: player.display_name
      });

    } else if (action === 'create_new') {
      // Age gate (13+). The birthdate is checked here and never stored; only the confirmation time is.
      if (request.headers.get('cookie')?.includes(`${AGE_BLOCK_COOKIE}=1`)) {
        return NextResponse.json({ error: 'You must be 13 or older to use Player Pass.', code: 'underage' }, { status: 403 });
      }
      const age = ageFromBirthdate(birthdate);
      if (age === null) {
        return NextResponse.json({ error: 'Birthdate required', code: 'birthdate_required' }, { status: 400 });
      }
      if (age < MIN_AGE) {
        const res = NextResponse.json({ error: 'You must be 13 or older to use Player Pass.', code: 'underage' }, { status: 403 });
        res.cookies.set(AGE_BLOCK_COOKIE, '1', { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' });
        return res;
      }

      // Create a new player
      if (!displayName) {
        return NextResponse.json({ error: 'Display name required' }, { status: 400 });
      }

      // Optional store join code (from the store's QR sign). A valid code sets the home store and marks it verified;
      // without one the player is created unverified and can verify later (code or first check-in).
      if (typeof joinCode === 'string' && joinCode.trim()) {
        const limited = await enforceRateLimitStrict(`join-code-signup:${userId}`, 600, 8);
        if (limited) return limited;
        const code = normalizeJoinCode(joinCode);
        const codeStore = code ? await findStoreByJoinCode(code) : null;
        if (!codeStore) {
          return NextResponse.json({ error: 'That join code did not work. Check it with the store.', code: 'bad_join_code' }, { status: 400 });
        }
        homeStoreId = codeStore.id;
        homeStoreVerifiedAt = new Date().toISOString();
      }

      // Get Clerk user info for email and real name
      const user = await currentUser();
      const clerkEmail = user?.emailAddresses?.[0]?.emailAddress || null;
      const clerkRealName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ') || null;

      // Resolve prefix from the player's home store (falls back to 'GGC' network default)
      let idPrefix = 'GGC';
      if (homeStoreId) {
        const { data: storeRow } = await supabaseAdmin
          .from('stores')
          .select('player_id_prefix')
          .eq('id', homeStoreId)
          .maybeSingle();
        if (storeRow?.player_id_prefix) idPrefix = storeRow.player_id_prefix;
      }

      // Generate unique player_id
      let newPlayerId = generatePlayerId(idPrefix);
      let attempts = 0;

      while (attempts < 10) {
        const { data: existing } = await supabaseAdmin
          .from('players')
          .select('id')
          .eq('player_id', newPlayerId)
          .single();

        if (!existing) break;
        newPlayerId = generatePlayerId(idPrefix);
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

      // Resolve canonical game ID (handles legacy aliases like sw_unlimited → star_wars_unlimited)
      const canonicalPrimaryGame = primaryGame
        ? (SELECTABLE_GAME_IDS.includes(resolveGameId(primaryGame)) ? resolveGameId(primaryGame) : null)
        : null;

      // Initialize favorite_games from the player's onboarding selection.
      // If no game was selected or the ID was unrecognized, start with only
      // 'overall' — never substitute a real game silently.
      const initialFavorites = canonicalPrimaryGame
        ? ['overall', canonicalPrimaryGame]
        : ['overall'];

      // Create the player with all fields
      const { data: newPlayer, error: createError } = await supabaseAdmin
        .from('players')
        .insert({
          player_id: newPlayerId,
          display_name: displayName,
          clerk_user_id: userId,
          age_confirmed_at: new Date().toISOString(),
          // Auto-pulled from Clerk
          email: clerkEmail,
          real_name: clerkRealName,
          // User-provided
          discord_username: discordUsername || null,
          phone: phone || null,
          primary_game_id: canonicalPrimaryGame,
          favorite_games: initialFavorites,
          // Store assignment
          home_store_id: homeStoreId || null,
          home_store_verified_at: homeStoreVerifiedAt,
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
        })
        .select()
        .single();

      if (createError) {
        console.error('Create error:', createError);
        return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
      }

      const newReferralCode = generateReferralCode(newPlayer.id);
      await supabaseAdmin
        .from('players')
        .update({ referral_code: newReferralCode })
        .eq('id', newPlayer.id);

      // Welcome bonus (+30 LXP) is awarded atomically by the player_welcome_bonus
      // DB trigger — no application-level insert needed here.

      return NextResponse.json({
        success: true,
        player_id: newPlayer.player_id,
        displayName: newPlayer.display_name,
        welcomeBonus: 30,
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
