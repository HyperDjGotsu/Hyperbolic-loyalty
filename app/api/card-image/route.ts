import { NextResponse } from 'next/server';

// Force dynamic rendering (not static)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const game = searchParams.get('game');
    const cardNumber = searchParams.get('cardNumber');
    const cardName = searchParams.get('cardName');

    if (!game) {
      return NextResponse.json({ error: 'Game parameter required' }, { status: 400 });
    }

    // Check if it's One Piece (handle both ID and display name)
    const isOnePiece = game === 'one-piece-card-game' || 
                       game === 'One Piece' || 
                       game.toLowerCase().includes('one piece');

    // For One Piece cards, try to get image from en.onepiece-cardgame.com
    if (isOnePiece && cardNumber) {
      // The official One Piece site hosts card images
      // Format: OP04-112 -> https://en.onepiece-cardgame.com/images/cardlist/card/OP04-112.png
      const imageUrl = `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}.png`;
      
      // Verify the image exists
      try {
        const res = await fetch(imageUrl, { method: 'HEAD' });
        if (res.ok) {
          return NextResponse.json({ imageUrl, source: 'official', cached: false });
        }
      } catch (error) {
        console.error('[Card Image] Official site check failed:', error);
      }

      // Try alternate URL format (some cards use _p suffix for parallel/alt art)
      const altFormats = [
        `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber}_p1.png`,
        `https://en.onepiece-cardgame.com/images/cardlist/card/${cardNumber.toUpperCase()}.png`,
      ];

      for (const altUrl of altFormats) {
        try {
          const res = await fetch(altUrl, { method: 'HEAD' });
          if (res.ok) {
            return NextResponse.json({ imageUrl: altUrl, source: 'official-alt', cached: false });
          }
        } catch {
          // Continue to next format
        }
      }
    }

    // Fallback: no image found
    return NextResponse.json({ imageUrl: null, source: null, cached: false });

  } catch (error) {
    console.error('[Card Image] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card image' },
      { status: 500 }
    );
  }
}
