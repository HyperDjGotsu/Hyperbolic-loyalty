import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import dns from 'dns';
import { lookup } from 'dns/promises';

// Force Node to use IPv4 (fixes many Windows DNS issues)
dns.setDefaultResultOrder('ipv4first');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Game schedule - which game to feature each day (fallback if no staff pick)
const GAME_SCHEDULE: Record<number, string> = {
  0: 'disney-lorcana',           // Sunday
  1: 'one-piece-card-game',      // Monday (OP day!)
  2: 'pokemon',                  // Tuesday
  3: 'magic-the-gathering',      // Wednesday
  4: 'digimon-card-game',        // Thursday
  5: 'dragon-ball-super-fusion-world', // Friday
  6: 'one-piece-card-game',      // Saturday (OP again!)
};

// Display names for games
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

// Simple in-memory cache
let cachedCard: {
  data: CardOfTheDay | null;
  date: string;
} = {
  data: null,
  date: '',
};

interface JustTCGVariant {
  id: string;
  condition: string;
  printing: string;
  price: number;
  lastUpdated: number;
  priceChange24hr?: number | null;
  priceChange7d?: number | null;
  priceChange30d?: number | null;
}

interface JustTCGCard {
  id: string;
  name: string;
  game: string;
  set: string;
  set_name: string;
  number: string;
  tcgplayerId: string;
  rarity: string;
  details: string | null;
  variants: JustTCGVariant[];
}

interface CardOfTheDay {
  name: string;
  game: string;
  gameDisplay: string;
  set: string;
  rarity: string;
  number: string;
  price: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  tcgplayerId: string;
  tcgplayerUrl: string;
  imageUrl: string | null;
  fetchedAt: string;
  source?: string;
}

// Generate a deterministic search query based on date
function getDailySearchQuery(dateStr: string, game: string): string {
  const searchTerms: Record<string, string[]> = {
    'one-piece-card-game': [
      'Luffy', 'Zoro', 'Nami', 'Shanks', 'Kaido', 'Boa', 'Ace', 'Sanji',
      'Yamato', 'Law', 'Kid', 'Crocodile', 'Doflamingo', 'Katakuri', 'Marco'
    ],
    'pokemon': [
      'Charizard', 'Pikachu', 'Mewtwo', 'Gengar', 'Umbreon', 'Rayquaza',
      'Giratina', 'Arceus', 'Mew', 'Eevee', 'Dragonite', 'Lugia', 'Ho-Oh'
    ],
    'magic-the-gathering': [
      'Dragon', 'Angel', 'Demon', 'Vampire', 'Zombie',
      'Artifact', 'Legendary', 'Goblin', 'Elf', 'Merfolk', 'Knight'
    ],
    'disney-lorcana': [
      'Elsa', 'Mickey', 'Stitch', 'Maleficent', 'Ursula', 'Beast',
      'Belle', 'Ariel', 'Simba', 'Aladdin', 'Mulan', 'Rapunzel'
    ],
    'digimon-card-game': [
      'Agumon', 'Gabumon', 'Omnimon', 'WarGreymon', 'MetalGarurumon',
      'Alphamon', 'Imperialdramon', 'Gallantmon', 'Beelzemon'
    ],
    'dragon-ball-super-fusion-world': [
      'Goku', 'Vegeta', 'Gohan', 'Frieza', 'Cell', 'Broly',
      'Beerus', 'Trunks', 'Piccolo', 'Android'
    ],
  };

  const terms = searchTerms[game] || ['rare'];
  const dateHash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const termIndex = dateHash % terms.length;
  
  return terms[termIndex];
}

// Resolve hostname to IP address manually (workaround for Windows DNS issues)
async function resolveHostname(hostname: string): Promise<string> {
  try {
    const result = await lookup(hostname, { family: 4 });
    console.log(`[DNS] Resolved ${hostname} to ${result.address}`);
    return result.address;
  } catch (error) {
    console.error(`[DNS] Failed to resolve ${hostname}:`, (error as Error).message);
    throw error;
  }
}

// Custom fetch using Node's https module with explicit IP resolution
async function httpsGet(url: string, apiKey: string): Promise<{ status: number; data: string }> {
  const parsedUrl = new URL(url);
  
  let ipAddress: string;
  try {
    ipAddress = await resolveHostname(parsedUrl.hostname);
  } catch {
    ipAddress = parsedUrl.hostname;
  }

  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: ipAddress,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Host': parsedUrl.hostname,
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'HyperbolicLoyalty/1.0',
      },
      servername: parsedUrl.hostname,
      family: 4,
    };

    console.log(`[Card of the Day] Making HTTPS request to ${parsedUrl.hostname} (${ipAddress})`);

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('[Card of the Day] Response received, status:', res.statusCode);
        resolve({
          status: res.statusCode || 500,
          data: data,
        });
      });
    });

    req.on('error', (error) => {
      console.error('[Card of the Day] HTTPS request error:', error.message);
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout after 15 seconds'));
    });

    req.end();
  });
}

export async function GET() {
  try {
    // Get today's date in Pacific timezone
    const today = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Los_Angeles' 
    });

    // Check cache first
    if (cachedCard.date === today && cachedCard.data) {
      console.log('[Card of the Day] Returning cached card');
      return NextResponse.json({
        ...cachedCard.data,
        cached: true,
      });
    }

    // =========================================================================
    // PRIORITY 1: Check database for staff pick or community vote winner
    // =========================================================================
    console.log('[Card of the Day] Checking database for today:', today);
    
    const { data: dbCard, error: dbError } = await supabase
      .from('card_of_the_day_history')
      .select('*')
      .eq('featured_date', today)
      .single();

    if (dbCard && !dbError) {
      console.log('[Card of the Day] Found staff pick in database');
      
      const cardData = dbCard.card_data as any;
      const tcgplayerUrl = cardData.tcgplayerId 
        ? `https://www.tcgplayer.com/product/${cardData.tcgplayerId}`
        : '';

      const cardOfTheDay: CardOfTheDay = {
        name: dbCard.card_name,
        game: dbCard.game_id,
        gameDisplay: dbCard.game_display,
        set: cardData.set || '',
        rarity: cardData.rarity || '',
        number: dbCard.card_number || '',
        price: cardData.price || null,
        priceChange7d: cardData.priceChange7d || null,
        priceChange30d: cardData.priceChange30d || null,
        tcgplayerId: cardData.tcgplayerId || '',
        tcgplayerUrl,
        imageUrl: null,
        fetchedAt: new Date().toISOString(),
        source: dbCard.source,
      };

      // Cache it
      cachedCard = { data: cardOfTheDay, date: today };

      return NextResponse.json({
        ...cardOfTheDay,
        cached: false,
      });
    }

    // =========================================================================
    // PRIORITY 2: Fall back to auto-generated card from JustTCG
    // =========================================================================
    console.log('[Card of the Day] No staff pick, using auto-generation');

    const apiKey = process.env.JUSTTCG_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'JustTCG API key not configured. Add JUSTTCG_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Determine which game to feature today
    const dayOfWeek = new Date().getDay();
    const gameId = GAME_SCHEDULE[dayOfWeek];
    const searchQuery = getDailySearchQuery(today, gameId);

    // Build the URL
    const params = new URLSearchParams({
      game: gameId,
      q: searchQuery,
      limit: '10',
      condition: 'NM',
      include_price_history: 'false',
      include_statistics: '7d,30d',
    });

    const url = `https://api.justtcg.com/v1/cards?${params.toString()}`;
    console.log('[Card of the Day] Fetching:', url);

    const response = await httpsGet(url, apiKey);

    if (response.status < 200 || response.status >= 300) {
      console.error('[Card of the Day] API Error:', response.status, response.data);
      return NextResponse.json(
        { 
          error: 'JustTCG API error', 
          status: response.status,
          details: response.data 
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(response.data);
    const cards: JustTCGCard[] = data.data || [];

    console.log('[Card of the Day] Cards found:', cards.length);

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'No cards found', game: gameId, query: searchQuery },
        { status: 404 }
      );
    }

    // Pick a card deterministically based on date
    const dateHash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const cardIndex = dateHash % cards.length;
    const selectedCard = cards[cardIndex];

    // Get the Near Mint Normal variant for pricing
    const nmVariant = selectedCard.variants.find(v => 
      v.condition === 'Near Mint' && v.printing === 'Normal'
    ) || selectedCard.variants.find(v => 
      v.condition === 'Near Mint'
    ) || selectedCard.variants[0];

    const tcgplayerUrl = `https://www.tcgplayer.com/product/${selectedCard.tcgplayerId}`;

    const cardOfTheDay: CardOfTheDay = {
      name: selectedCard.name,
      game: selectedCard.game,
      gameDisplay: GAME_DISPLAY_NAMES[gameId] || selectedCard.game,
      set: selectedCard.set_name,
      rarity: selectedCard.rarity,
      number: selectedCard.number,
      price: nmVariant?.price || null,
      priceChange7d: nmVariant?.priceChange7d || null,
      priceChange30d: nmVariant?.priceChange30d || null,
      tcgplayerId: selectedCard.tcgplayerId,
      tcgplayerUrl,
      imageUrl: null,
      fetchedAt: new Date().toISOString(),
      source: 'auto',
    };

    // Cache the result
    cachedCard = {
      data: cardOfTheDay,
      date: today,
    };

    return NextResponse.json({
      ...cardOfTheDay,
      cached: false,
      apiUsage: data._metadata,
    });

  } catch (error) {
    const err = error as Error;
    console.error('[Card of the Day] Error:', err.name, err.message);
    
    if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      return NextResponse.json(
        { 
          error: 'DNS resolution failed', 
          message: err.message,
          hint: 'Try restarting your dev server or run "ipconfig /flushdns"'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: err.message,
      },
      { status: 500 }
    );
  }
}
