import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApi, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { AppText, Card } from '@/components/kit';

type PoolCard = { id: string; name: string; game: string; cardData: { price?: number; set?: string }; votes: number; percentage: number };
type Voting = { votingActive: boolean; pool: PoolCard[]; totalVotes: number; playerVote: { cardId: string } | null; hasVoted: boolean };

// Vote for tomorrow's Card of the Day. Hidden when no voting round is open.
export function CardOfDayVote() {
  const api = useApi();
  const { colors } = useTheme();
  const [data, setData] = useState<Voting | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const load = () => api.get<Voting>('/api/cotd/vote').then(setData).catch(() => setData(null));
  useEffect(() => { void load(); }, []);

  async function vote(id: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/cotd/vote', { poolCardId: id });
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Could not vote. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (!data?.votingActive || data.pool.length === 0) return null;
  return (
    <View>
      <AppText variant="title" style={{ marginBottom: 4 }}>Vote for tomorrow's card</AppText>
      <AppText variant="caption" tone="secondary" style={{ marginBottom: 12 }}>{data.totalVotes} votes so far · +10 XP if your pick wins</AppText>
      <View style={{ gap: 8 }}>
        {(expanded || data.hasVoted ? data.pool : data.pool.slice(0, 3)).map(c => {
          const mine = data.playerVote?.cardId === c.id;
          return (
            <Pressable key={c.id} onPress={() => vote(c.id)} disabled={busy || mine}>
              <Card style={{ padding: 12, borderColor: mine ? colors.accent : colors.border, overflow: 'hidden' }}>
                {data.hasVoted && (
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${c.percentage}%` as `${number}%`, backgroundColor: colors.accent, opacity: 0.14 }} />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{c.name}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={1}>{c.game}{c.cardData?.set ? ` · ${c.cardData.set}` : ''}{c.cardData?.price ? ` · $${c.cardData.price.toFixed(2)}` : ''}</AppText>
                  </View>
                  {data.hasVoted ? <AppText variant="caption" tone={mine ? 'accent' : 'secondary'} style={{ fontWeight: '800' }}>{mine ? '✓ ' : ''}{c.percentage}%</AppText> : <AppText variant="caption" tone="accent" style={{ fontWeight: '800' }}>Vote</AppText>}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      {!data.hasVoted && data.pool.length > 3 && (
        <Pressable onPress={() => setExpanded(e => !e)} style={{ marginTop: 8, alignItems: 'center' }}>
          <AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>{expanded ? 'Show fewer' : `Show all ${data.pool.length}`}</AppText>
        </Pressable>
      )}
      {error ? <AppText variant="caption" style={{ color: '#ef4444', marginTop: 6 }}>{error}</AppText> : null}
    </View>
  );
}
