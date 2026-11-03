import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { AppText } from '@/components/kit';

export type SpecialEvent = {
  id: string; name: string; scheduledAt: string;
  game?: { id: string; name: string; icon: string; color: string } | null;
  entryFee?: string; isFree?: boolean; maxSpots?: number | null; prizing?: string[] | null;
};

const TZ = 'America/Los_Angeles';

function when(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const countdown = days > 60 ? `in ${Math.round(days / 30)} months` : days > 14 ? `in ${Math.round(days / 7)} weeks` : days > 1 ? `in ${days} days` : days === 1 ? 'tomorrow' : null;
  return { date, time, countdown };
}

export function HomeSpecialEvents({ events }: { events: SpecialEvent[] }) {
  const router = useRouter();
  const { colors } = useTheme();
  if (events.length === 0) return null;
  return (
    <View>
      <AppText variant="title" style={{ marginBottom: 12 }}>Special events</AppText>
      <View style={{ gap: 8 }}>
        {events.map(ev => {
          const { date, time, countdown } = when(ev.scheduledAt);
          const facts: string[] = [];
          if (ev.isFree) facts.push('Free'); else if (ev.entryFee) facts.push(ev.entryFee);
          if (ev.maxSpots) facts.push(`${ev.maxSpots} spots`);
          if (ev.prizing?.length) facts.push(ev.prizing.join(', '));
          return (
            <Pressable key={ev.id} onPress={() => router.push({ pathname: '/(tabs)/events', params: { event: ev.id } } as never)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.bgElevated }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${ev.game?.color || '#3b82f6'}33` }}>
                <AppText variant="title">{ev.game?.icon || '⭐'}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="eyebrow" tone="accent">Special{ev.game ? ` · ${ev.game.name}` : ''}</AppText>
                <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{ev.name}</AppText>
                <AppText variant="caption" tone="secondary">{date} · {time}{countdown ? ` · ${countdown}` : ''}</AppText>
                {facts.length > 0 && <AppText variant="caption" tone="tertiary" numberOfLines={1}>{facts.join(' · ')}</AppText>}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
