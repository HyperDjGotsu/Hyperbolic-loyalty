import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '@/lib/theme';

// Public pages on the website; the stores and Google ask for the same two links.
export const PRIVACY_URL = 'https://playerpass.gg/privacy';
export const TERMS_URL = 'https://playerpass.gg/terms';

export default function LegalLinks({ prefix, style }: { prefix?: string; style?: object }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.text}>
        {prefix ? `${prefix} ` : ''}
        <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} accessibilityRole="link">Terms</Text>
        {' · '}
        <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} accessibilityRole="link">Privacy</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', marginTop: 20 },
  text: { color: C.textTertiary, fontSize: 12, textAlign: 'center' },
  link: { color: C.textSecondary, textDecorationLine: 'underline' },
});
