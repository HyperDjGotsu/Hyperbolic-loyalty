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

    // For One Piece cards, try to get image from OPTCG API
    if (game === 'one-piece-card-game' && cardNumber) {
      // Format: OP01-001 -> search for it
      const optcgUrl = `https://optcg-api.com/api/cards?number=${encodeURIComponent(cardNumber)}`;
      
      try {
        const res = await fetch(optcgUrl, {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 86400 }, // Cache for 24 hours
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && data[0].imageUrl) {
            return NextResponse.json({ imageUrl: data[0].imageUrl });
          }
        }
      } catch (error) {
        console.error('[Card Image] OPTCG API error:', error);
      }
    }

    // Fallback: no image found
    return NextResponse.json({ imageUrl: null });

  } catch (error) {
    console.error('[Card Image] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card image' },
      { status: 500 }
    );
  }
}
