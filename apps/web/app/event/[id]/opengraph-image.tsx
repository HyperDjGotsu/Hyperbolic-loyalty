import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';
import { getPublicEventBasics, formatEventWhen } from '@/lib/public-event';
import { gameArtCandidates, getGame } from '@/lib/games';

export const runtime = 'nodejs';
export const alt = 'Player Pass event';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// rel is always '/games/...' or 'brand/...'; the leading '.' keeps both relative to /public.
async function dataUri(rel: string, mime: string): Promise<string | null> {
  try {
    const root = path.join(process.cwd(), 'public');
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep)) return null; // never read outside /public
    const buf = await readFile(file);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { id: string } }) {
  const ev = await getPublicEventBasics(params.id).catch(() => null);
  let art: string | null = null;
  // Only known game ids reach the file system; anything else uses the 'general' art.
  const gameId = ev?.gameId && getGame(ev.gameId) ? ev.gameId : null;
  for (const url of gameArtCandidates(gameId, ev?.storeId)) {
    art = await dataUri(url, 'image/jpeg');
    if (art) break;
  }
  const mark = await dataUri('/brand/pp-mark.png', 'image/png');
  const color = (ev?.gameId && getGame(ev.gameId)?.color) || '#3ddc6a';
  const game = ev?.gameId ? getGame(ev.gameId)?.name : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', position: 'relative',
          backgroundImage: `linear-gradient(135deg, ${color}, #1f1e1b)`, fontFamily: 'sans-serif',
        }}
      >
        {art && <img src={art} width={1200} height={630} style={{ position: 'absolute', inset: 0, objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.35))' }} />
        <div style={{ position: 'absolute', left: 56, top: 44, display: 'flex', alignItems: 'center' }}>
          {mark && <img src={mark} height={56} style={{ marginRight: 14 }} />}
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>Player Pass</div>
        </div>
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 48, display: 'flex', flexDirection: 'column' }}>
          {game && <div style={{ fontSize: 32, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{game}</div>}
          <div style={{ fontSize: 76, fontWeight: 800, color: '#fff', lineHeight: 1.05, marginTop: 6 }}>{ev?.name ?? 'Player Pass Event'}</div>
          {ev && (
            <div style={{ fontSize: 34, color: '#3ddc6a', fontWeight: 700, marginTop: 16 }}>
              {`${formatEventWhen(ev.scheduledAt)}${ev.storeName ? `  ·  ${ev.storeName}` : ''}`}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
