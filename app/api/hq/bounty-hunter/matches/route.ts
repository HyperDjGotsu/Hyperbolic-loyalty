import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Match type point values
const MATCH_POINTS = {
  hunter_upsets_wanted: { winner: 30, loser: -25 },
  wanted_defends: { winner: 15, loser: -20 },
  hunter_vs_hunter: { winner: 15, loser: -15 },
  wanted_vs_wanted: { winner: 20, loser: -20 },
} as const;

type MatchType = keyof typeof MATCH_POINTS;

// GET - Get matches for an event
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
    }

    // Get matches for event
    const { data: matches, error } = await (supabaseAdmin as any)
      .from('bounty_hunter_matches')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching matches:', error);
      return NextResponse.json({ error: 'Failed to load matches' }, { status: 500 });
    }

    // Get player names for display
    const playerIds = new Set<string>();
    matches?.forEach((m: any) => {
      if (m.winner_id) playerIds.add(m.winner_id);
      if (m.loser_id) playerIds.add(m.loser_id);
    });

    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .in('id', Array.from(playerIds));

    const playerMap: Record<string, string> = {};
    players?.forEach(p => {
      playerMap[p.id] = p.display_name;
    });

    // Enrich matches with player names
    const enrichedMatches = matches?.map((m: any) => ({
      ...m,
      winner_name: playerMap[m.winner_id] || 'Unknown',
      loser_name: playerMap[m.loser_id] || 'Unknown',
    }));

    return NextResponse.json({ matches: enrichedMatches || [] });
  } catch (error) {
    console.error('GET matches error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Record a new match
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff and get their player ID
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('id, is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { event_id, winner_id, loser_id, match_type, round = 1 } = body;

    if (!event_id || !winner_id || !loser_id || !match_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!MATCH_POINTS[match_type as MatchType]) {
      return NextResponse.json({ error: 'Invalid match type' }, { status: 400 });
    }

    const points = MATCH_POINTS[match_type as MatchType];

    // Record the match
    const { data: match, error: matchError } = await (supabaseAdmin as any)
      .from('bounty_hunter_matches')
      .insert({
        event_id,
        winner_id,
        loser_id,
        match_type,
        winner_points: points.winner,
        loser_points: points.loser,
        round,
        recorded_by: staff.id,
      })
      .select()
      .single();

    if (matchError) {
      console.error('Error recording match:', matchError);
      return NextResponse.json({ error: 'Failed to record match' }, { status: 500 });
    }

    // Award XP to winner (One Piece game)
    const { error: winnerXpError } = await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: winner_id,
        game_id: 'one_piece',
        base_xp: points.winner,
        final_xp: points.winner,
        source: 'manual_adjustment',
        description: `Bounty Hunter Night: ${match_type.replace(/_/g, ' ')} (Win)`,
      } as any);

    if (winnerXpError) {
      console.error('Error awarding winner XP:', winnerXpError);
    }

    // Deduct XP from loser (One Piece game) - only if they have enough
    // First check their current XP
    const { data: loserXpData } = await supabaseAdmin
      .from('xp_ledger')
      .select('final_xp')
      .eq('player_id', loser_id)
      .eq('game_id', 'one_piece');

    const loserCurrentXp = loserXpData?.reduce((sum, entry) => sum + (entry.final_xp || 0), 0) || 0;
    
    // Only deduct if they have XP (don't go negative)
    const actualDeduction = Math.max(points.loser, -loserCurrentXp);
    
    if (actualDeduction < 0) {
      const { error: loserXpError } = await supabaseAdmin
        .from('xp_ledger')
        .insert({
          player_id: loser_id,
          game_id: 'one_piece',
          base_xp: actualDeduction,
          final_xp: actualDeduction,
          source: 'manual_adjustment',
          description: `Bounty Hunter Night: ${match_type.replace(/_/g, ' ')} (Loss)`,
        } as any);

      if (loserXpError) {
        console.error('Error deducting loser XP:', loserXpError);
      }
    }

    // Get player names for response
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, display_name')
      .in('id', [winner_id, loser_id]);

    const playerMap: Record<string, string> = {};
    players?.forEach(p => {
      playerMap[p.id] = p.display_name;
    });

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        winner_name: playerMap[winner_id] || 'Unknown',
        loser_name: playerMap[loser_id] || 'Unknown',
      },
      message: `Match recorded! ${playerMap[winner_id]} +${points.winner}, ${playerMap[loser_id]} ${points.loser}`,
    });
  } catch (error) {
    console.error('POST match error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Remove a match (and reverse XP)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify staff
    const { data: staff } = await supabaseAdmin
      .from('players')
      .select('is_staff')
      .eq('clerk_user_id', userId)
      .single();

    if (!staff?.is_staff) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('id');

    if (!matchId) {
      return NextResponse.json({ error: 'Missing match id' }, { status: 400 });
    }

    // Get match details first to reverse XP
    const { data: match } = await (supabaseAdmin as any)
      .from('bounty_hunter_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Reverse winner XP
    await supabaseAdmin
      .from('xp_ledger')
      .insert({
        player_id: match.winner_id,
        game_id: 'one_piece',
        base_xp: -match.winner_points,
        final_xp: -match.winner_points,
        source: 'manual_adjustment',
        description: 'Bounty Hunter Night: Match reversed',
      } as any);

    // Reverse loser XP (add back what was deducted)
    if (match.loser_points < 0) {
      await supabaseAdmin
        .from('xp_ledger')
        .insert({
          player_id: match.loser_id,
          game_id: 'one_piece',
          base_xp: -match.loser_points,
          final_xp: -match.loser_points,
          source: 'manual_adjustment',
          description: 'Bounty Hunter Night: Match reversed',
        } as any);
    }

    // Delete the match
    const { error: deleteError } = await (supabaseAdmin as any)
      .from('bounty_hunter_matches')
      .delete()
      .eq('id', matchId);

    if (deleteError) {
      console.error('Error deleting match:', deleteError);
      return NextResponse.json({ error: 'Failed to delete match' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Match deleted and XP reversed' });
  } catch (error) {
    console.error('DELETE match error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
