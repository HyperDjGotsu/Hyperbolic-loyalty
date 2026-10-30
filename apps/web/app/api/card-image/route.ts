import { NextResponse } from 'next/server';
import { enforceRateLimitPermissive, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ONE_PIECE_FORMATS = (cardNumber: string) => [
  `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}.png`,
  `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}_p1.png`,
  `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber.toUpperCase()}.png`,
];

export async function GET(request: Request) {
  // 30 proxied image requests per minute per IP
  const rl = await enforceRateLimitPermissive(`card-img:${getClientIp(request)}`, 60, 30);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game');
  const cardNumber = searchParams.get('cardNumber');
  // Digits only, so the value can't change where the request goes.
  const tcgplayerId = /^\d{1,10}$/.test(searchParams.get('tcgplayerId') ?? '') ? searchParams.get('tcgplayerId') : null;

  if (!game || (!cardNumber && !tcgplayerId)) {
    return new NextResponse(null, { status: 400 });
  }

  const isOnePiece = game === 'one-piece-card-game' ||
    game === 'One Piece' ||
    game.toLowerCase().includes('one piece');

  // One Piece: official art first. Every game: TCGplayer's image for the product as the fallback.
  const candidates = [
    ...(isOnePiece && cardNumber ? ONE_PIECE_FORMATS(cardNumber) : []),
    ...(tcgplayerId ? [`https://product-images.tcgplayer.com/fit-in/437x437/${tcgplayerId}.jpg`] : []),
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HyperbolicLoyalty/1.0' },
      });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    } catch {
      continue;
    }
  }

  return new NextResponse(null, { status: 404 });
}
