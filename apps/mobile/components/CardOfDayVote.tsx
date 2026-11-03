import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { useApi, errorMessage } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { useTheme } from '@/lib/theme-context';
import { AppText, Card, Skeleton } from '@/components/kit';

type CardData = {
  name: string; game: string; gameDisplay: string; set: string; rarity: string; number?: string;
  price: number | null; priceChange7d: number | null; priceChange30d: number | null;
  tcgplayerId?: string; tcgplayerUrl?: string | null; source?: string;
};
type PoolCard = { id: string; name: string; number?: string; game: string; cardData?: { price?: number; printing?: string }; votes: number; percentage: number };
type Voting = { votingActive: boolean; pool: PoolCard[]; totalVotes: number; playerVote: { cardId: string } | null; hasVoted: boolean; voteDate?: string };

const GAME_ICONS: Record<string, string> = {
  'One Piece': '🏴‍☠️', 'Pokémon': '⚡', 'Magic: The Gathering': '🔮', 'Disney Lorcana': '✨', 'Digimon': '🦖',
  'Dragon Ball Super': '🐉', 'Dragon Ball Fusion World': '💥', 'Gundam': '🤖', 'Hololive': '🎤', 'Yu-Gi-Oh!': '🃏',
  'Union Arena': '🏟️', 'Star Wars Unlimited': '⭐',
};
const UP = '#22c55e';
const DOWN = '#ef4444';

function pct(v: number | null) {
  if (v === null || v === undefined) return null;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}

// Same logic as web useCardImage: One Piece official art by number, otherwise TCGplayer by product id.
function imageFor(card: CardData) {
  const game = card.gameDisplay;
  const isOnePiece = !!game && game.toLowerCase().includes('one piece');
  if (!game || !((isOnePiece && card.number) || card.tcgplayerId)) return null;
  return `${API_BASE}/api/card-image?game=${encodeURIComponent(game)}${card.number ? `&cardNumber=${encodeURIComponent(card.number)}` : ''}${card.tcgplayerId ? `&tcgplayerId=${encodeURIComponent(card.tcgplayerId)}` : ''}`;
}

function Change({ value, label }: { value: number | null; label: string }) {
  const text = pct(value);
  if (!text) return null;
  const up = (value ?? 0) >= 0;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: up ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
      <AppText variant="caption" style={{ color: up ? UP : DOWN, fontWeight: '700' }}>{text} <AppText variant="caption" style={{ color: up ? UP : DOWN, opacity: 0.7 }}>{label}</AppText></AppText>
    </View>
  );
}

// Card of the Day with image, price, 7d/30d change, TCGplayer link and inline voting for tomorrow's card.
export function CardOfTheDay() {
  const api = useApi();
  const { colors } = useTheme();
  const [card, setCard] = useState<CardData | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [voting, setVoting] = useState<Voting | null>(null);
  const [votingLoading, setVotingLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const loadVoting = () =>
    api.get<Voting>('/api/cotd/vote')
      .then(d => setVoting(d.votingActive && d.pool?.length > 0 ? d : null))
      .catch(() => setVoting(null))
      .finally(() => setVotingLoading(false));

  useEffect(() => {
    api.get<CardData>('/api/card-of-the-day').then(d => setCard(d?.name ? d : null)).catch(() => setCard(null)).finally(() => setCardLoading(false));
    void loadVoting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function vote(id: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/cotd/vote', { poolCardId: id });
      await loadVoting();
    } catch (e) {
      setError(errorMessage(e, 'Could not vote. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (cardLoading || votingLoading) {
    return (
      <View>
        <AppText variant="title" style={{ marginBottom: 12 }}>Card of the day</AppText>
        <Skeleton height={140} radius={16} />
      </View>
    );
  }
  if (!card && !voting) return null;

  const icon = GAME_ICONS[card?.gameDisplay ?? ''] ?? '🎴';
  const imageUrl = card && !imageFailed ? imageFor(card) : null;
  const pool = voting ? (expanded || voting.hasVoted ? voting.pool : voting.pool.slice(0, 3)) : [];
  const maxVotes = voting ? Math.max(...voting.pool.map(c => c.votes)) : 0;

  return (
    <View style={{ gap: 12 }}>
      {card && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <AppText variant="title">{icon} Card of the day</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {card.source === 'staff_pick' && <AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>👤 Staff Pick</AppText>}
              {card.source === 'community' && <AppText variant="caption" style={{ color: UP, fontWeight: '700' }}>🗳️ Community</AppText>}
              <AppText variant="caption" tone="secondary">{card.gameDisplay}</AppText>
            </View>
          </View>
          <Card>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ width: 100, height: 140, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
                {imageUrl
                  ? <Image source={{ uri: imageUrl }} style={{ width: 100, height: 140 }} resizeMode="cover" onError={() => setImageFailed(true)} />
                  : <AppText variant="display" style={{ fontSize: 40 }}>{icon}</AppText>}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title" numberOfLines={2}>{card.name}</AppText>
                <AppText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>{[card.set, card.rarity].filter(Boolean).join(' • ')}</AppText>
                <AppText variant="eyebrow" tone="tertiary" style={{ marginTop: 10 }}>Market price</AppText>
                <AppText variant="numeral" style={{ fontSize: 26 }}>{card.price ? `$${card.price.toFixed(2)}` : 'N/A'}</AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <Change value={card.priceChange7d} label="7d" />
                  <Change value={card.priceChange30d} label="30d" />
                </View>
              </View>
            </View>
            {card.tcgplayerUrl ? (
              <Pressable onPress={() => Linking.openURL(card.tcgplayerUrl!).catch(() => {})} accessibilityRole="link" style={{ marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.bgElevated, alignItems: 'center' }}>
                <AppText variant="body" tone="accent" style={{ fontWeight: '700' }}>View on TCGplayer ↗</AppText>
              </Pressable>
            ) : null}
          </Card>
        </View>
      )}

      {voting && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <AppText variant="body" style={{ fontWeight: '700' }}>🗳️ Vote for tomorrow</AppText>
            <AppText variant="caption" tone="accent">+10 XP if you win!</AppText>
          </View>
          <View style={{ gap: 8 }}>
            {pool.map(c => {
              const mine = voting.playerVote?.cardId === c.id;
              const leading = c.votes === maxVotes && c.votes > 0;
              return (
                <Pressable key={c.id} onPress={() => vote(c.id)} disabled={busy || mine} style={{ opacity: busy ? 0.6 : 1 }}>
                  <Card style={{ padding: 12, borderColor: mine ? colors.accent : colors.border, overflow: 'hidden' }}>
                    {voting.totalVotes > 0 && (
                      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${c.percentage}%` as `${number}%`, backgroundColor: colors.accent, opacity: mine ? 0.22 : 0.12 }} />
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{c.name}</AppText>
                        <AppText variant="caption" tone="secondary" numberOfLines={1}>{c.game}{c.number ? ` • #${c.number}` : ''}{c.cardData?.printing && c.cardData.printing !== 'Standard' ? ' ✨' : ''}</AppText>
                      </View>
                      <View style={{ alignItems: 'flex-end', minWidth: 50 }}>
                        <AppText variant="body" style={{ fontWeight: '800', color: leading ? '#facc15' : colors.textPrimary }}>{c.percentage}%</AppText>
                        <AppText variant="caption" tone="tertiary">{c.votes} vote{c.votes !== 1 ? 's' : ''}</AppText>
                      </View>
                      {mine && <AppText variant="body" tone="accent">✓</AppText>}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
          {!voting.hasVoted && voting.pool.length > 3 && (
            <Pressable onPress={() => setExpanded(e => !e)} style={{ marginTop: 8, alignItems: 'center' }}>
              <AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>{expanded ? 'Show fewer' : `+${voting.pool.length - 3} more options`}</AppText>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <AppText variant="caption" tone="tertiary">{voting.totalVotes} total votes</AppText>
            {voting.voteDate ? <AppText variant="caption" tone="tertiary">For {new Date(voting.voteDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</AppText> : null}
          </View>
          {voting.hasVoted && <AppText variant="caption" style={{ color: UP, textAlign: 'center', marginTop: 8 }}>✓ Vote cast! Check back tomorrow for results</AppText>}
          {error ? <AppText variant="caption" style={{ color: DOWN, marginTop: 6 }}>{error}</AppText> : null}
        </View>
      )}
    </View>
  );
}
