import { useEffect, useRef, useState } from 'react';
import { ImageBackground, Linking, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/kit';
import { useTheme } from '@/lib/theme-context';
import { openAppLink } from '@/lib/home-links';

export type HomeBanner = {
  id: string; title: string; subtitle: string; icon: string; colorFrom: string; colorTo: string; badge: string;
  linkUrl: string | null; eventId: string | null; backgroundImage: string | null; bgSize: string | null; textColor: string | null;
  twitchUrl?: string | null; youtubeUrl?: string | null;
};

// Full-width banners that auto-advance every 4s (pausing while the player drags) and open their link or event on tap.
export function HomeBannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const itemW = width - 32;
  const ref = useRef<ScrollView>(null);
  const idx = useRef(0);
  const paused = useRef(false);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    idx.current = 0; setDot(0);
    if (banners.length < 2) return;
    const t = setInterval(() => {
      if (paused.current) return;
      idx.current = (idx.current + 1) % banners.length;
      ref.current?.scrollTo({ x: idx.current * (itemW + 12), animated: true });
      setDot(idx.current);
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length, itemW]);

  if (banners.length === 0) return null;
  return (
    <View>
      <ScrollView
        ref={ref} horizontal showsHorizontalScrollIndicator={false} snapToInterval={itemW + 12} decelerationRate="fast"
        contentContainerStyle={{ gap: 12 }}
        onScrollBeginDrag={() => { paused.current = true; }}
        onMomentumScrollEnd={e => {
          paused.current = false;
          idx.current = Math.round(e.nativeEvent.contentOffset.x / (itemW + 12));
          setDot(idx.current);
        }}
      >
        {banners.map(b => {
          const textColor = b.textColor || '#ffffff';
          const linked = !!(b.eventId || b.linkUrl);
          const inner = (
            <View style={{ padding: 16, flex: 1, justifyContent: 'flex-end' }}>
              {!!b.badge && <AppText variant="eyebrow" style={{ color: textColor, opacity: 0.8 }}>{b.badge}</AppText>}
              <AppText variant="title" numberOfLines={2} style={{ color: textColor }}>{b.icon} {b.title}</AppText>
              {!!b.subtitle && <AppText variant="caption" numberOfLines={2} style={{ color: textColor, opacity: 0.8 }}>{b.subtitle}</AppText>}
              {(b.twitchUrl || b.youtubeUrl) && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {b.twitchUrl ? <Pressable onPress={() => Linking.openURL(b.twitchUrl!).catch(() => {})} style={{ backgroundColor: '#9333ea', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}><AppText variant="caption" style={{ color: '#fff', fontWeight: '800' }}>Twitch</AppText></Pressable> : null}
                  {b.youtubeUrl ? <Pressable onPress={() => Linking.openURL(b.youtubeUrl!).catch(() => {})} style={{ backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}><AppText variant="caption" style={{ color: '#fff', fontWeight: '800' }}>YouTube</AppText></Pressable> : null}
                </View>
              )}
            </View>
          );
          const box = { width: itemW, height: 130, borderRadius: 24, overflow: 'hidden' as const, backgroundColor: b.colorFrom || colors.bgSurface };
          const onPress = () => {
            if (b.eventId) router.push({ pathname: '/(tabs)/events', params: { event: b.eventId } } as never);
            else if (b.linkUrl) openAppLink(router, b.linkUrl);
          };
          return (
            <Pressable key={b.id} disabled={!linked} onPress={onPress} accessibilityRole={linked ? 'link' : undefined}>
              {b.backgroundImage
                ? <ImageBackground source={{ uri: b.backgroundImage }} style={box} imageStyle={{ resizeMode: b.bgSize === 'contain' ? 'contain' : 'cover', opacity: 0.75 }}>{inner}</ImageBackground>
                : <View style={box}>{inner}</View>}
            </Pressable>
          );
        })}
      </ScrollView>
      {banners.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {banners.map((b, i) => <View key={b.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === dot ? colors.accent : colors.border }} />)}
        </View>
      )}
    </View>
  );
}
