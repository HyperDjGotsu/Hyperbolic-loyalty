import { NextResponse } from 'next/server';
import https from 'https';
import dns from 'dns';
import { lookup } from 'dns/promises';

// Force IPv4 for Windows compatibility
dns.setDefaultResultOrder('ipv4first');

// =============================================================================
// CACHING
// =============================================================================

interface CacheEntry {
  url: string | null;
  timestamp: number;
  source: string;
}

const imageCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_TTL_NOT_FOUND = 1 * 60 * 60 * 1000; // 1 hour for "not found"

// =============================================================================
// DNS RESOLVER - Manual resolution for Windows compatibility
// =============================================================================

async function resolveHostname(hostname: string): Promise<string> {
  try {
    const result = await lookup(hostname, { family: 4 });
    console.log(`[Card Image DNS] Resolved ${hostname} to ${result.address}`);
    return result.address;
  } catch (error) {
    console.error(`[Card Image DNS] Failed to resolve ${hostname}:`, (error as Error).message);
    throw error;
  }
}

// =============================================================================
// HTTPS HELPER - Windows-compatible with manual DNS
// =============================================================================

async function httpsGet(url: string): Promise<{ status: number; data: string }> {
  const parsedUrl = new URL(url);
  
  // Manually resolve hostname
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
        'Accept': 'application/json',
        'User-Agent': 'HyperbolicLoyalty/1.0',
      },
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

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// =============================================================================
// IMAGE SOURCE HANDLERS
// =============================================================================

async function getOnePieceImage(cardNumber: string): Promise<string | null> {
  if (!cardNumber) return null;
  
  const cleanNumber = cardNumber.toUpperCase().trim();
  
  try {
    const apiUrl = `https://optcgapi.com/api/sets/card/${cleanNumber}/`;
    console.log('[Card Image] Fetching OPTCG:', apiUrl);
    
    const response = await httpsGet(apiUrl);
    console.log('[Card Image] OPTCG status:', response.status);
    
    if (response.status === 200) {
      let data = JSON.parse(response.data);
      
      // OPTCG returns an array - get the first item
      if (Array.isArray(data)) {
        console.log('[Card Image] OPTCG returned array with', data.length, 'items');
        data = data[0];
      }
      
      if (!data) {
        console.log('[Card Image] No card data found');
        return null;
      }
      
      // Log the card data fields
      console.log('[Card Image] OPTCG card keys:', Object.keys(data));
      console.log('[Card Image] OPTCG card_image:', data.card_image);
      console.log('[Card Image] OPTCG card_image_id:', data.card_image_id);
      console.log('[Card Image] OPTCG card_name:', data.card_name);
      
      // Try to get image URL from card_image field
      if (data.card_image) {
        console.log('[Card Image] Found card_image:', data.card_image);
        return data.card_image;
      }
      
      // If no direct image URL, try to construct one from card_image_id
      if (data.card_image_id) {
        const constructedUrl = `https://optcgapi.com/static/images/cards/${data.card_image_id}.webp`;
        console.log('[Card Image] Constructed URL from card_image_id:', constructedUrl);
        return constructedUrl;
      }
      
      // Last resort: try constructing from card_id
      if (data.card_id) {
        const constructedUrl = `https://optcgapi.com/static/images/cards/${data.card_id}.webp`;
        console.log('[Card Image] Constructed URL from card_id:', constructedUrl);
        return constructedUrl;
      }
      
      console.log('[Card Image] No image field found in OPTCG response');
    }
  } catch (error) {
    console.error('[Card Image] OPTCG error:', (error as Error).message);
  }
  
  return null;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const cardNumber = searchParams.get('cardNumber');
    const cardName = searchParams.get('cardName');

    console.log('[Card Image] Request:', { game, cardNumber, cardName });

    if (!game) {
      return NextResponse.json({ error: 'game parameter required' }, { status: 400 });
    }

    if (!cardNumber && !cardName) {
      return NextResponse.json({ error: 'cardNumber or cardName required' }, { status: 400 });
    }

    // Build cache key
    const cacheKey = `${game}:${cardNumber || ''}:${cardName || ''}`.toLowerCase();

    // Check cache
    const cached = imageCache.get(cacheKey);
    if (cached) {
      const ttl = cached.url ? CACHE_TTL : CACHE_TTL_NOT_FOUND;
      if (Date.now() - cached.timestamp < ttl) {
        console.log('[Card Image] Cache hit:', cached.url);
        return NextResponse.json({
          imageUrl: cached.url,
          source: cached.source,
          cached: true,
        });
      }
    }

    // Fetch image based on game
    let imageUrl: string | null = null;
    let source = 'unknown';

    switch (game) {
      case 'One Piece':
      case 'One Piece Card Game':
        imageUrl = await getOnePieceImage(cardNumber || '');
        source = 'OPTCG';
        break;
        
      default:
        console.log('[Card Image] No source for game:', game);
        source = 'none';
        break;
    }

    // Cache the result
    imageCache.set(cacheKey, {
      url: imageUrl,
      timestamp: Date.now(),
      source,
    });

    console.log('[Card Image] Result:', { imageUrl, source });

    return NextResponse.json({
      imageUrl,
      source,
      cached: false,
    });

  } catch (error) {
    const err = error as Error;
    console.error('[Card Image] Error:', err.message);
    
    return NextResponse.json(
      { error: 'Failed to fetch card image', message: err.message },
      { status: 500 }
    );
  }
}
