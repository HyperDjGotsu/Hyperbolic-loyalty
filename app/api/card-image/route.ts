import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ONE_PIECE_FORMATS = (cardNumber: string) => [
  `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}.png`,
  `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}_p1.png`,
  `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber.toUpperCase()}.png`,
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game');
  const cardNumber = searchParams.get('cardNumber');

  if (!game || !cardNumber) {
    return new NextResponse(null, { status: 400 });
  }

  const isOnePiece = game === 'one-piece-card-game' ||
    game === 'One Piece' ||
    game.toLowerCase().includes('one piece');

  if (!isOnePiece) {
    return new NextResponse(null, { status: 404 });
  }

  for (const url of ONE_PIECE_FORMATS(cardNumber)) {
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
