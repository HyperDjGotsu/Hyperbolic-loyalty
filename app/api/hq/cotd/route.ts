import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import dns from 'dns';

// Force IPv4 for Windows compatibility
dns.setDefaultResultOrder('ipv4first');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// DNS RESOLVER - Manual IPv4 lookup for Windows Node.js v24 compatibility
// =============================================================================

async function resolveHostname(hostname: string): Promise<string> {
  return new Promise((resolve) => {
    dns.lookup(hostname, { family: 4 }, (err, address) => {
      if (err) {
        console.log(`[DNS] Failed to resolve ${hostname}, using hostname directly`);
        resolve(hostname);
      } else {
        console.log(`[DNS] Resolved ${hostname} to ${address}`);
        resolve(address);
      }
    });
  });
}

// =============================================================================
// HTTPS HELPER
// =============================================================================

async function httpsGet(url: string, apiKey?: string): Promise<{ status: number; data: string }> {
  const parsedUrl = new URL(url);
  
  // Resolve hostname to IPv4 address
  const ipAddress = await resolveHostname(parsedUrl.hostname);

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Host': parsedUrl.hostname,
      'Accept': 'application/json',
      'User-Agent': 'HyperbolicLoyalty/1.0',
    };
    
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const options: https.RequestOptions = {
      hostname: ipAddress,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers,
      servername: parsedUrl.hostname,
      family: 4,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, data });
      });
    });

    req.on('error', (err) => {
      console.error('[HTTPS] Request error:', err.message);
      reject(err);
    });
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// =============================================================================
// GAME DISPLAY NAMES
// =============================================================================

const GAME_DISPLAY_NAMES: Record<string, string> = {
  'one-piece-card-game': 'One Piece',
  'pokemon': 'Pokémon',
  'magic-the-gathering': 'Magic: The Gathering',
  'disney-lorcana': 'Disney Lorcana',
  'digimon-card-game': 'Digimon',
  'dragon-ball-super-fusion-world': 'Dragon Ball Super',
  'union-arena': 'Union Arena',
  'hololive-official-card-game': 'Hololive',
  'yugioh': 'Yu-Gi-Oh!',
  'gundam-card-game': 'Gundam',
  'star-wars-unlimited': 'Star Wars Unlimited',
};

// =============================================================================
// GET: Search cards or get current/upcoming COTD
// =============================================================================

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // Get current Card of the Day
    if (action === 'current') {
      const today = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'America/Los_Angeles' 
      });

      const { data, error } = await supabase
        .from('card_of_the_day_history')
        .select('*')
        .eq('featured_date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return NextResponse.json({ card: data || null, date: today });
    }

    // Get upcoming scheduled cards
    if (action === 'upcoming') {
      const today = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'America/Los_Angeles' 
      });

      const { data, error } = await supabase
        .from('card_of_the_day_history')
        .select('*')
        .gte('featured_date', today)
        .order('featured_date', { ascending: true })
        .limit(14);

      if (error) throw error;

      return NextResponse.json({ cards: data || [] });
    }

    // Get voting pool for a date
    if (action === 'pool') {
      const date = searchParams.get('date');
      
      if (!date) {
        return NextResponse.json({ error: 'Date required' }, { status: 400 });
      }
      
      const { data, error } = await supabase
        .from('card_of_the_day_pool')
        .select('*')
        .eq('status', 'voting')
        .eq('vote_date', date)
        .order('votes_count', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ pool: data || [] });
    }

    // Get all voting pools (for HQ management)
    if (action === 'all_pools') {
      const { data, error } = await supabase
        .from('card_of_the_day_pool')
        .select('*')
        .in('status', ['voting', 'approved'])
        .order('vote_date', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by vote_date
      const pools: Record<string, any[]> = {};
      for (const card of data || []) {
        const date = card.vote_date || 'unscheduled';
        if (!pools[date]) pools[date] = [];
        pools[date].push(card);
      }

      return NextResponse.json({ pools });
    }

    // Search JustTCG for cards
    if (action === 'search') {
      const query = searchParams.get('q');
      const number = searchParams.get('number'); // Optional card number filter
      const game = searchParams.get('game') || 'one-piece-card-game';

      if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 });
      }

      const apiKey = process.env.JUSTTCG_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
      }

      try {
        // Build search query - if number provided, format as "name (number)"
        let searchQuery = query;
        if (number) {
          // Format number with parentheses - JustTCG expects "(012)" format
          const formattedNumber = number.replace(/[()]/g, '').trim(); // Remove any existing parens
          searchQuery = `${query} (${formattedNumber})`;
        }

        const params = new URLSearchParams({
          game,
          q: searchQuery,
          limit: '20',
          include_price_history: 'false',
          include_statistics: '7d,30d',
        });

        const url = `https://api.justtcg.com/v1/cards?${params.toString()}`;
        console.log('[COTD Search] Fetching:', url);
        
        const response = await httpsGet(url, apiKey);
        console.log('[COTD Search] Status:', response.status);

        if (response.status !== 200) {
          console.error('[COTD Search] API error:', response.data);
          return NextResponse.json({ error: 'JustTCG API error', details: response.data }, { status: response.status });
        }

        let data;
        try {
          data = JSON.parse(response.data);
        } catch (parseError) {
          console.error('[COTD Search] JSON parse error:', parseError);
          return NextResponse.json({ error: 'Failed to parse API response' }, { status: 500 });
        }
        
        // Expand each card into separate entries for each variant (printing)
        // This allows staff to select specific versions (alt art, foil, etc.)
        const cards: any[] = [];
        
        for (const card of data.data || []) {
          const variants = card.variants || [];
          
          if (variants.length === 0) {
            // No variants, add card with base info
            cards.push({
              id: card.id,
              variantId: null,
              name: card.name,
              game: card.game,
              gameId: game,
              gameDisplay: GAME_DISPLAY_NAMES[game] || card.game,
              set: card.set_name,
              number: card.number,
              rarity: card.rarity,
              printing: null,
              condition: null,
              tcgplayerId: card.tcgplayerId,
              price: null,
              priceChange7d: null,
              priceChange30d: null,
            });
          } else {
            // Group variants by printing to avoid duplicates (different conditions)
            // We only want NM (Near Mint) prices for display
            const printingMap = new Map<string, any>();
            
            for (const variant of variants) {
              const printing = variant.printing || 'Standard';
              
              // Prefer NM condition, or take first available
              if (!printingMap.has(printing) || variant.condition === 'NM') {
                printingMap.set(printing, variant);
              }
            }
            
            // Create entry for each unique printing
            for (const [printing, variant] of printingMap) {
              cards.push({
                id: card.id,
                variantId: variant.id,
                name: card.name,
                game: card.game,
                gameId: game,
                gameDisplay: GAME_DISPLAY_NAMES[game] || card.game,
                set: card.set_name,
                number: card.number,
                rarity: card.rarity,
                printing: printing,
                condition: variant.condition,
                language: variant.language || 'EN',
                tcgplayerId: card.tcgplayerId,
                price: variant.price || null,
                priceChange7d: variant.priceChange7d || null,
                priceChange30d: variant.priceChange30d || null,
              });
            }
          }
        }

        console.log('[COTD Search] Found', cards.length, 'card variants');
        return NextResponse.json({ cards, total: cards.length });
      } catch (searchError) {
        console.error('[COTD Search] Error:', searchError);
        return NextResponse.json({ 
          error: 'Search failed', 
          message: (searchError as Error).message 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[COTD Admin GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST: Set Card of the Day or add to pool
// =============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Directly set a card for a specific date (staff pick)
    if (action === 'set') {
      const { card, date } = body;

      if (!card || !date) {
        return NextResponse.json({ error: 'Card and date required' }, { status: 400 });
      }

      // Upsert into history (replace if exists for that date)
      const { data, error } = await supabase
        .from('card_of_the_day_history')
        .upsert({
          featured_date: date,
          game_id: card.gameId,
          game_display: card.gameDisplay,
          card_number: card.number,
          card_name: card.name,
          card_data: card,
          source: 'staff_pick',
        }, {
          onConflict: 'featured_date',
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, card: data });
    }

    // Add card to voting pool
    if (action === 'add_to_pool') {
      const { card, voteDate } = body;

      if (!card) {
        return NextResponse.json({ error: 'Card required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('card_of_the_day_pool')
        .insert({
          game_id: card.gameId,
          game_display: card.gameDisplay,
          card_number: card.number,
          card_name: card.name,
          card_data: card,
          nominated_by: null, // Staff pick
          status: voteDate ? 'voting' : 'approved',
          vote_date: voteDate || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, poolCard: data });
    }

    // Remove from pool
    if (action === 'remove_from_pool') {
      const { poolCardId } = body;

      const { error } = await supabase
        .from('card_of_the_day_pool')
        .delete()
        .eq('id', poolCardId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    // Finalize voting for a date - pick winner and award XP
    if (action === 'finalize_voting') {
      const { voteDate } = body;

      if (!voteDate) {
        return NextResponse.json({ error: 'Vote date required' }, { status: 400 });
      }

      // Get pool for this date, ordered by votes
      const { data: pool, error: poolError } = await supabase
        .from('card_of_the_day_pool')
        .select('*')
        .eq('status', 'voting')
        .eq('vote_date', voteDate)
        .order('votes_count', { ascending: false });

      if (poolError) throw poolError;

      if (!pool || pool.length === 0) {
        return NextResponse.json({ error: 'No voting pool for this date' }, { status: 400 });
      }

      // Winner is first (most votes)
      const winner = pool[0];
      const totalVotes = pool.reduce((sum: number, c: any) => sum + (c.votes_count || 0), 0);

      // Insert into history
      const { error: historyError } = await supabase
        .from('card_of_the_day_history')
        .upsert({
          featured_date: voteDate,
          game_id: winner.game_id,
          game_display: winner.game_display,
          card_number: winner.card_number,
          card_name: winner.card_name,
          card_data: winner.card_data,
          source: 'community_vote',
          pool_card_id: winner.id,
          winning_votes: winner.votes_count || 0,
          total_votes: totalVotes,
        }, {
          onConflict: 'featured_date',
        });

      if (historyError) throw historyError;

      // Update pool card statuses
      await supabase
        .from('card_of_the_day_pool')
        .update({ status: 'featured', featured_date: voteDate })
        .eq('id', winner.id);

      // Mark other cards as not featured
      const otherIds = pool.filter((c: any) => c.id !== winner.id).map((c: any) => c.id);
      if (otherIds.length > 0) {
        await supabase
          .from('card_of_the_day_pool')
          .update({ status: 'rejected' })
          .in('id', otherIds);
      }

      // Mark winning votes and award XP
      const { data: winningVotes, error: votesError } = await supabase
        .from('card_of_the_day_votes')
        .select('id, player_id')
        .eq('pool_card_id', winner.id)
        .eq('vote_date', voteDate);

      if (!votesError && winningVotes) {
        // Update votes as won
        await supabase
          .from('card_of_the_day_votes')
          .update({ won: true })
          .eq('pool_card_id', winner.id)
          .eq('vote_date', voteDate);

        // Award XP to winners (+10 General XP)
        for (const vote of winningVotes) {
          // Check if XP already awarded
          const { data: voteCheck } = await supabase
            .from('card_of_the_day_votes')
            .select('xp_awarded')
            .eq('id', vote.id)
            .single();

          if (voteCheck && !voteCheck.xp_awarded) {
            // Award XP
            await supabase
              .from('xp_ledger')
              .insert({
                player_id: vote.player_id,
                game_id: 'general',
                base_xp: 10,
                multiplier: 1,
                final_xp: 10,
                xp_source: 'bonus',
                description: `COTD Vote Winner: ${winner.card_name}`,
              });

            // Mark as awarded
            await supabase
              .from('card_of_the_day_votes')
              .update({ xp_awarded: true })
              .eq('id', vote.id);
          }
        }

        // Mark losing votes
        await supabase
          .from('card_of_the_day_votes')
          .update({ won: false })
          .eq('vote_date', voteDate)
          .neq('pool_card_id', winner.id);
      }

      return NextResponse.json({ 
        success: true,
        winner: {
          name: winner.card_name,
          votes: winner.votes_count || 0,
          totalVotes,
        },
        winnersAwarded: winningVotes?.length || 0,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[COTD Admin POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE: Remove a scheduled Card of the Day
// =============================================================================

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('card_of_the_day_history')
      .delete()
      .eq('featured_date', date);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[COTD Admin DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', message: (error as Error).message },
      { status: 500 }
    );
  }
}
