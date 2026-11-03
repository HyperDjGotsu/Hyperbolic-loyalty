import { useState, type ReactNode } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { API_BASE } from '@/lib/config';
import { resolveGameId } from '@/lib/games';

// Same art the website serves from /public/games, with the same store-specific override.
const STORE_ART_FOLDERS: Record<string, string> = {
  '70f71af5-26f1-46ec-b97a-8c8776318d3d': 'ggob',
};

function candidates(src?: string | null, gameId?: string | null, storeId?: string | null): string[] {
  const game = gameId ? resolveGameId(gameId) : 'general';
  const folder = storeId ? STORE_ART_FOLDERS[storeId] : undefined;
  const art = folder ? [`${API_BASE}/games/${folder}/${game}.jpg`, `${API_BASE}/games/${game}.jpg`] : [`${API_BASE}/games/${game}.jpg`];
  return src ? [src.startsWith('http') ? src : `${API_BASE}${src}`, ...art] : art;
}

// Picture-led top for event cards. Tries the event's own image, then the game art, then a plain color block.
export function EventCover({ src, gameId, storeId, color = '#475569', style, children }: {
  src?: string | null; gameId?: string | null; storeId?: string | null; color?: string;
  style?: StyleProp<ViewStyle>; children?: ReactNode;
}) {
  const urls = candidates(src, gameId, storeId);
  const key = urls.join('|');
  const [state, setState] = useState({ key, idx: 0 });
  const idx = state.key === key ? state.idx : 0;
  return (
    <View style={[{ backgroundColor: color, overflow: 'hidden' }, style]}>
      {idx < urls.length && (
        <Image
          key={urls[idx]}
          source={{ uri: urls[idx] }}
          resizeMode="cover"
          onError={() => setState({ key, idx: idx + 1 })}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      )}
      {/* Darkens the art so white text stays readable */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)' }} />
      {children}
    </View>
  );
}
