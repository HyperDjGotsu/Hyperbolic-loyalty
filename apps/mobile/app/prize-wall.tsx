import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function PrizeWallScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color="#a89f90" />
      </Pressable>
      <View style={styles.content}>
        <Feather name="gift" size={56} color="#c4b5fd" />
        <Text style={styles.title}>Prize Wall</Text>
        <Text style={styles.sub}>Coming soon — redeem your Points for prizes and rewards.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111009' },
  back: { padding: 20, paddingTop: 56 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, marginTop: -80 },
  title: { fontSize: 28, fontWeight: '800', color: '#f2efe8' },
  sub: { fontSize: 15, color: '#a89f90', textAlign: 'center', lineHeight: 22 },
});
