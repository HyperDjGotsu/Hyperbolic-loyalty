import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { eventIdFromQr } from '@/lib/checkin';
import { CheckinStateView } from '@/components/CheckinStateView';

export default function QRCheckinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scanLock = useRef(false);

  // A good scan hands off to the preview screen, so every check-in is confirmed with a tap before it is submitted
  function handleBarcode({ data }: { data: string }) {
    if (scanLock.current || scanned) return;
    scanLock.current = true;
    setScanned(true);
    const eventId = eventIdFromQr(data);
    if (!eventId) { setError("That doesn't look like a Player Pass QR code."); return; }
    if (eventId !== id) { setError('This QR code is for a different event.'); return; }
    router.replace(`/checkin?event_id=${eventId}` as never);
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
        <Pressable
          style={styles.btn}
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
        >
          <Text style={styles.btnText}>
            {permission.canAskAgain ? 'Allow Camera' : 'Open Settings'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <CheckinStateView
        view={{ kind: 'error', message: error }}
        onDone={() => router.back()}
        onRetry={() => { scanLock.current = false; setScanned(false); setError(null); }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.scanHint}>Point at the event QR code</Text>
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
