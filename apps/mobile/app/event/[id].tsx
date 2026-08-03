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
import { useApi } from '@/lib/api';

type EventDetail = {
  id: string;
  title: string;
  game_id: string;
  description: string;
  starts_at: string;
  ends_at: string;
  status: string;
  store_name: string;
  store_id: string;
  xp_reward: number;
  points_reward: number;
  max_participants: number | null;
  checkin_count: number;
  user_checked_in: boolean;
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  async function load() {
    try {
      const data = await api.get<{ event: EventDetail }>(`/api/events/${id}/public`);
      setEvent(data.event);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleCheckin() {
    setCheckinLoading(true);
    setCheckinError('');
    try {
      await api.post(`/api/events/${id}/checkin`, {});
      setCheckinSuccess(true);
      setEvent(prev => prev ? { ...prev, user_checked_in: true, checkin_count: prev.checkin_count + 1 } : prev);
    } catch (e: unknown) {
      setCheckinError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setCheckinLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" size="large" />
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

  const isActive = event.status === 'active';
  const canCheckin = isActive && !event.user_checked_in && !checkinSuccess;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusUpcoming]}>
          <Text style={styles.statusText}>{event.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row icon="📍" label={event.store_name} />
        <Row icon="🕐" label={formatDate(event.starts_at)} />
        {event.xp_reward ? <Row icon="⚡" label={`+${event.xp_reward} XP on check-in`} /> : null}
        {event.points_reward ? <Row icon="💎" label={`+${event.points_reward} Points on check-in`} /> : null}
        {event.checkin_count > 0 ? <Row icon="👥" label={`${event.checkin_count} checked in`} /> : null}
      </View>

      {event.description ? (
        <View style={styles.card}>
          <Text style={styles.description}>{event.description}</Text>
        </View>
      ) : null}

      {checkinSuccess || event.user_checked_in ? (
        <View style={styles.checkinSuccess}>
          <Text style={styles.checkinSuccessIcon}>✅</Text>
          <Text style={styles.checkinSuccessText}>You're checked in!</Text>
          {event.xp_reward ? (
            <Text style={styles.checkinReward}>+{event.xp_reward} XP earned</Text>
          ) : null}
        </View>
      ) : canCheckin ? (
        <View style={styles.checkinSection}>
          {checkinError ? <Text style={styles.checkinError}>{checkinError}</Text> : null}
          <Pressable
            style={[styles.checkinBtn, checkinLoading && styles.checkinBtnDisabled]}
            onPress={handleCheckin}
            disabled={checkinLoading}
          >
            {checkinLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.checkinBtnText}>Check In Now</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.qrBtn}
            onPress={() => router.push(`/checkin/${id}`)}
          >
            <Text style={styles.qrBtnText}>📷  Scan QR Code Instead</Text>
          </Pressable>
        </View>
      ) : !isActive ? (
        <View style={styles.notActiveBox}>
          <Text style={styles.notActiveText}>Check-in opens when the event goes live</Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Row({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text style={{ color: '#d1d5db', fontSize: 14, flex: 1 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f', gap: 16 },
  header: { padding: 20, paddingBottom: 0 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 10 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusActive: { backgroundColor: '#14532d' },
  statusUpcoming: { backgroundColor: '#312e81' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#16161f',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  description: { color: '#9ca3af', fontSize: 14, lineHeight: 22 },
  checkinSection: { marginHorizontal: 16, marginTop: 24, gap: 10 },
  checkinBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  checkinBtnDisabled: { opacity: 0.6 },
  checkinBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  qrBtn: {
    backgroundColor: '#16161f',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  qrBtnText: { color: '#a78bfa', fontWeight: '600', fontSize: 14 },
  checkinError: { color: '#f87171', fontSize: 13, textAlign: 'center' },
  checkinSuccess: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#14532d',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  checkinSuccessIcon: { fontSize: 40 },
  checkinSuccessText: { color: '#86efac', fontSize: 18, fontWeight: '700' },
  checkinReward: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  notActiveBox: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#16161f',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  notActiveText: { color: '#6b7280', fontSize: 14 },
  errorText: { color: '#f87171', fontSize: 15 },
  backBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
