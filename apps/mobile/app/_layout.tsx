import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { tokenCache } from '@/lib/auth';
import { useApi } from '@/lib/api';
import { buildPendingPath, clearPendingLink, peekPendingLink, savePendingLink } from '@/lib/pending-link';
import { registerForPushNotifications } from '@/lib/push';
import { API_BASE } from '@/lib/config';
import { useAppFonts } from '@/lib/fonts';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

const PUSH_TOKEN_KEY = 'expo_push_token';

async function savePushToken(token: string, jwt: string) {
  await fetch(`${API_BASE}/api/player/expo-push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ expo_push_token: token, platform: Platform.OS }),
  });
}

function AuthGuard() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const api = useApi();
  const resolving = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    if (!isSignedIn && !inAuthGroup) {
      // Park a kiosk QR / event / referral link so it survives sign-in and onboarding
      const target = buildPendingPath(pathname, params as Record<string, string | string[] | undefined>);
      const go = () => router.replace('/(auth)/sign-in');
      if (target) void savePendingLink(target).then(go); else go();
    }
  }, [isLoaded, isSignedIn, segments]);

  // Signed in: replay a parked link (after linking, if the player still has to onboard), else leave the auth screens
  useEffect(() => {
    if (!isLoaded || !isSignedIn || resolving.current) return;
    const seg = segments[0];
    if (seg !== '(auth)' && seg !== '(tabs)') return;
    resolving.current = true;
    (async () => {
      const pending = await peekPendingLink();
      if (!pending) {
        if (seg === '(auth)') router.replace('/(tabs)');
        return;
      }
      let linked: boolean | null = null;
      try { linked = !!(await api.get<{ linked?: boolean }>('/api/player/by-clerk')).linked; } catch { linked = null; }
      if (linked === false) {
        // Unlinked: onboarding first (pending stays parked until linking finishes)
        router.replace((pending.startsWith('/onboarding') ? pending : '/onboarding') as never);
        return;
      }
      // Lookup failed: keep the parked link and try again next time rather than dropping it
      if (linked === null) { if (seg === '(auth)') router.replace('/(tabs)'); return; }
      await clearPendingLink();
      router.replace('/(tabs)');
      if (!pending.startsWith('/onboarding')) router.push(pending as never);
    })().catch(() => { if (seg === '(auth)') router.replace('/(tabs)'); })
      .finally(() => { resolving.current = false; });
  }, [isLoaded, isSignedIn, segments]);

  // Signed in but not linked to a player yet, and a deep link (event, kiosk QR) opened: park it and finish onboarding first
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const seg = segments[0];
    if (seg !== 'event' && seg !== 'checkin') return;
    const target = buildPendingPath(pathname, params as Record<string, string | string[] | undefined>);
    if (!target) return;
    let cancelled = false;
    api.get<{ linked?: boolean }>('/api/player/by-clerk').then(async r => {
      if (cancelled || r.linked !== false) return;
      await savePendingLink(target);
      router.replace('/onboarding' as never);
    }).catch(() => { /* leave the screen as is */ });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, segments]);

  useEffect(() => {
    if (!isSignedIn) {
      responseListener.current?.remove();
      return;
    }

    // On sign-in: register push token; skip if same token already registered
    registerForPushNotifications().then(async token => {
      if (!token) return;
      try {
        const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
        const jwt = await getToken();
        if (!jwt) return;
        // Only call the API if the token changed (avoids hammering on every launch)
        if (token !== stored) {
          await savePushToken(token, jwt);
          await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
        }
      } catch { /* non-critical */ }
    });

    // Deep link: tap notification → navigate to event (validate event_id to prevent path traversal)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.event_id && /^[a-zA-Z0-9-]{1,64}$/.test(data.event_id)) {
        router.push(`/event/${data.event_id}`);
      } else if (data?.kind === 'morning') {
        // The 11am "events today" nudge has no single event, so it opens the Events tab
        router.push('/(tabs)/events');
      } else {
        // Everything else (spin, weekly recap, friend request, store news) lands on the notifications list
        router.push('/(tabs)/notifications');
      }
    });

    return () => { responseListener.current?.remove(); };
  }, [isSignedIn]);

  return <Slot />;
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const fontsReady = useAppFonts();
  // Keep the splash screen up until the fonts are in, so text never flashes in the wrong face
  if (!fontsReady) return null;
  return (
    <ThemeProvider>
      <ThemedStatusBar />
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <AuthGuard />
      </ClerkProvider>
    </ThemeProvider>
  );
}
