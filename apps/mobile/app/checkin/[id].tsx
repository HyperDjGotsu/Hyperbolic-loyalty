import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';

export default function QRCheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; xp?: number } | null>(null);
  const scanLock = useRef(false);

  async function handleBarcode({ data }: { data: string }) {
    if (scanLock.current || scanned) return;
    scanLock.current = true;
    setScanned(true);
    setProcessing(true);

    try {
      // QR codes from the web app encode the event ID directly or as a URL
      const eventId = data.includes('/') ? data.split('/').pop() : data;

      if (eventId !== id) {
        setResult({ success: false, message: 'This QR code is for a different event.' });
        return;
      }

      const res = await api.post<{ xp_awarded: number; message: string }>(`/api/events/${id}/checkin`, {
        method: 'qr',
      });
      setResult({ success: true, message: 'Checked in!', xp: res.xp_awarded });
    } catch (e: unknown) {
      setResult({
        success: false,
        message: e instanceof Error ? e.message : 'Check-in failed. Please try again.',
      });
    } finally {
      setProcessing(false);
      scanLock.current = false;
    }
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is needed to scan QR codes</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.center}>
        <Text style={styles.resultIcon}>{result.success ? '✅' : '❌'}</Text>
        <Text style={[styles.resultText, result.success ? styles.successText : styles.errorText]}>
          {result.message}
        </Text>
        {result.xp ? (
          <Text style={styles.xpText}>+{result.xp} XP earned</Text>
        ) : null}
        <Pressable style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>← Back to Event</Text>
        </Pressable>
        {!result.success && (
          <Pressable
            style={styles.retryBtn}
            onPress={() => { setScanned(false); setResult(null); }}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        {processing ? (
          <ActivityIndicator color="#a78bfa" size="large" style={{ marginTop: 32 }} />
        ) : (
          <Text style={styles.scanHint}>Point at the event QR code</Text>
        )}
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    paddingHorizontal: 32,
    gap: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#a78bfa',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanHint: { color: '#fff', fontSize: 14, marginTop: 24, opacity: 0.8 },
  cancelBtn: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelText: { color: '#fff', fontWeight: '600' },
  resultIcon: { fontSize: 64 },
  resultText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  successText: { color: '#86efac' },
  errorText: { color: '#f87171' },
  xpText: { color: '#a78bfa', fontSize: 16, fontWeight: '600' },
  permissionText: { color: '#9ca3af', fontSize: 15, textAlign: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  retryBtn: { backgroundColor: '#16161f', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: '#2d2d3d' },
  retryText: { color: '#a78bfa', fontWeight: '600', fontSize: 15 },
});
