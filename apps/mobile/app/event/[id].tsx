import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';

type EventDetail = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  time: string;
  scheduledAt: string;
  endsAt: string | null;
  game: { id: string; name: string; icon: string; color: string } | null;
  entryFee: string;
  isFree: boolean;
  maxSpots: number | null;
  interestedCount: number;
  attendanceXp: number;
  winXp: number;
  location: string;
  address: string;
};

function Row({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  useEffect(() => {
    api.get<{ event: EventDetail }>(`/api/events/${id}/public`)
      .then(data => setEvent(data.event))
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCheckin() {
    setCheckinLoading(true);
    setCheckinError('');
    try {
      await api.post(`/api/events/${id}/checkin`, {});
      setCheckinSuccess(true);
    } catch (e: unknown) {
      setCheckinError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setCheckinLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c4b5fd" size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Event not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Feather name="arrow-left" size={18} color="#a89f90" />
        <Text style={styles.backText}>Events</Text>
      </Pressable>

      <View style={styles.headerBlock}>
        <Text style={styles.title}>{event.name}</Text>
        {event.game && (
          <Text style={styles.gameLabel}>{event.game.icon} {event.game.name}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Row icon="📍" label={event.location} />
        <Row icon="🕐" label={`${event.date} · ${event.time}`} />
        {event.attendanceXp ? <Row icon="⚡" label={`+${event.attendanceXp} XP on attendance`} /> : null}
        {event.winXp ? <Row icon="🏆" label={`+${event.winXp} XP for winning`} /> : null}
        <Row icon="🎟️" label={event.entryFee} />
        {event.maxSpots ? <Row icon="👥" label={`${event.maxSpots} spots max`} /> : null}
        {event.interestedCount > 0 ? <Row icon="👀" label={`${event.interestedCount} interested`} /> : null}
      </View>

      {event.description ? (
        <View style={styles.card}>
          <Text style={styles.description}>{event.description}</Text>
        </View>
      ) : null}

      {checkinSuccess ? (
        <View style={styles.checkinSuccess}>
          <Text style={styles.checkinSuccessIcon}>✅</Text>
          <Text style={styles.checkinSuccessText}>You're checked in!</Text>
          <Text style={styles.checkinReward}>+{event.attendanceXp} XP earned</Text>
        </View>
      ) : (
        <View style={styles.checkinSection}>
          {checkinError ? <Text style={styles.checkinError}>{checkinError}</Text> : null}
          <Pressable
            style={[styles.checkinBtn, checkinLoading && styles.checkinBtnDisabled]}
            onPress={handleCheckin}
            disabled={checkinLoading}
          >
            {checkinLoading
              ? <ActivityIndicator color="#111009" />
              : <Text style={styles.checkinBtnText}>Check In</Text>
            }
          </Pressable>
          <Pressable
            style={styles.qrBtn}
            onPress={() => router.push(`/checkin/${id}` as never)}
          >
            <Feather name="camera" size={16} color="#c4b5fd" />
            <Text style={styles.qrBtnText}>Scan QR Code</Text>
          </Pressable>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111009' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111009', gap: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  backText: { color: '#a89f90', fontSize: 14 },
  headerBlock: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#f2efe8', marginBottom: 4 },
  gameLabel: { fontSize: 14, color: '#a89f90' },
  card: {
    backgroundColor: '#1a1810',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  rowIcon: { fontSize: 16, width: 22 },
  rowLabel: { color: '#a89f90', fontSize: 14, flex: 1 },
  description: { color: '#a89f90', fontSize: 14, lineHeight: 22 },
  checkinSection: { marginHorizontal: 16, marginTop: 24, gap: 10 },
  checkinBtn: {
    backgroundColor: '#c4b5fd',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  checkinBtnDisabled: { opacity: 0.6 },
  checkinBtnText: { color: '#111009', fontSize: 17, fontWeight: '800' },
  qrBtn: {
    backgroundColor: '#1a1810',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  qrBtnText: { color: '#c4b5fd', fontWeight: '600', fontSize: 14 },
  checkinError: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  checkinSuccess: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  checkinSuccessIcon: { fontSize: 40 },
  checkinSuccessText: { color: '#22c55e', fontSize: 18, fontWeight: '700' },
  checkinReward: { color: '#c4b5fd', fontSize: 14, fontWeight: '600' },
  backBtn: { backgroundColor: '#c4b5fd', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: '#111009', fontWeight: '700' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
