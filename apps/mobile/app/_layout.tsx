import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { tokenCache } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://hyperbolic-loyalty.vercel.app';

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

  useEffect(() => {
    if (!isLoaded) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
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

    // Deep link: tap notification → navigate to event
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.event_id) router.push(`/event/${data.event_id}`);
    });

    return () => { responseListener.current?.remove(); };
  }, [isSignedIn]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthGuard />
    </ClerkProvider>
  );
}
