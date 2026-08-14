import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// =============================================================================
// GET: Get today's voting pool and player's vote status
// =============================================================================

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    // Get today's date in Pacific time
    const today = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Los_Angeles' 
    });
    
    // Get tomorrow's date (what we're voting FOR)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const voteDate = tomorrow.toLocaleDateString('en-CA', { 
      timeZone: 'America/Los_Angeles' 
    });
    
    // Get cards in voting pool for tomorrow
    const { data: pool, error: poolError } = await supabase
      .from('card_of_the_day_pool')
      .select('*')
      .eq('status', 'voting')
      .eq('vote_date', voteDate)
      .order('votes_count', { ascending: false });
    
    if (poolError) throw poolError;
    
    // If no pool, voting isn't active
    if (!pool || pool.length === 0) {
      return NextResponse.json({ 
        votingActive: false,
        pool: [],
        playerVote: null,
        voteDate,
        message: 'No voting pool for tomorrow'
      });
    }
    
    // Get player's vote if logged in
    let playerVote = null;
    let playerId = null;
    
    if (userId) {
      // Get player ID from Clerk user
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();
      
      if (player) {
        playerId = player.id;
        
        // Check if player already voted
        const { data: vote } = await supabase
          .from('card_of_the_day_votes')
          .select('pool_card_id, voted_at')
          .eq('player_id', player.id)
          .eq('vote_date', voteDate)
          .single();
        
        if (vote) {
          playerVote = vote;
        }
      }
    }
    
    // Calculate total votes
    const totalVotes = pool.reduce((sum: number, card: any) => sum + (card.votes_count || 0), 0);
    
    return NextResponse.json({
      votingActive: true,
      pool: pool.map((card: any) => ({
        id: card.id,
        name: card.card_name,
        number: card.card_number,
        game: card.game_display,
        gameId: card.game_id,
        cardData: card.card_data,
        votes: card.votes_count || 0,
        percentage: totalVotes > 0 ? Math.round((card.votes_count || 0) / totalVotes * 100) : 0,
      })),
      totalVotes,
      playerVote: playerVote ? {
        cardId: playerVote.pool_card_id,
        votedAt: playerVote.voted_at,
      } : null,
      hasVoted: !!playerVote,
      voteDate,
      votingEndsAt: `${voteDate}T00:00:00-08:00`, // Midnight Pacific
    });
    
  } catch (error) {
    console.error('[COTD Vote] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get voting pool', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Cast a vote
// =============================================================================

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Must be logged in to vote' }, { status: 401 });
    }
    
    const body = await request.json();
    const { poolCardId } = body;
    
    if (!poolCardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }
    
    // Get player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('clerk_user_id', userId)
      .single();
    
    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    
    // Get tomorrow's date (what we're voting FOR)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const voteDate = tomorrow.toLocaleDateString('en-CA', { 
      timeZone: 'America/Los_Angeles' 
    });
    
    // Verify the card is in the voting pool
    const { data: poolCard, error: cardError } = await supabase
      .from('card_of_the_day_pool')
      .select('*')
      .eq('id', poolCardId)
      .eq('status', 'voting')
      .eq('vote_date', voteDate)
      .single();
    
    if (cardError || !poolCard) {
      return NextResponse.json({ error: 'Card not in active voting pool' }, { status: 400 });
    }
    
    // Check if player already voted today
    const { data: existingVote } = await supabase
      .from('card_of_the_day_votes')
      .select('id, pool_card_id')
      .eq('player_id', player.id)
      .eq('vote_date', voteDate)
      .single();
    
    if (existingVote) {
      // If voting for the same card, just return success
      if (existingVote.pool_card_id === poolCardId) {
        return NextResponse.json({ 
          success: true, 
          message: 'Already voted for this card',
          alreadyVoted: true
        });
      }
      
      // Changing vote - remove old vote count
      await supabase
        .from('card_of_the_day_pool')
        .update({ votes_count: Math.max(0, ((await supabase
          .from('card_of_the_day_pool')
          .select('votes_count')
          .eq('id', existingVote.pool_card_id)
          .single()).data?.votes_count ?? 1) - 1)
        })
        .eq('id', existingVote.pool_card_id);
      
      // Update existing vote
      await supabase
        .from('card_of_the_day_votes')
        .update({ 
          pool_card_id: poolCardId,
          voted_at: new Date().toISOString()
        })
        .eq('id', existingVote.id);
    } else {
      // Insert new vote
      const { error: voteError } = await supabase
        .from('card_of_the_day_votes')
        .insert({
          player_id: player.id,
          pool_card_id: poolCardId,
          vote_date: voteDate,
        });
      
      if (voteError) {
        // Unique constraint violation = already voted
        if (voteError.code === '23505') {
          return NextResponse.json({ error: 'Already voted today' }, { status: 400 });
        }
        throw voteError;
      }
    }
    
    // Increment vote count on pool card
    const { error: updateError } = await supabase
      .from('card_of_the_day_pool')
      .update({ votes_count: (poolCard.votes_count || 0) + 1 })
      .eq('id', poolCardId);
    
    if (updateError) throw updateError;
    
    return NextResponse.json({ 
      success: true,
      message: `Voted for ${poolCard.card_name}!`,
      cardName: poolCard.card_name,
    });
    
  } catch (error) {
    console.error('[COTD Vote] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote', message: (error as Error).message },
      { status: 500 }
    );
  }
}
