import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { tokenCache } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://hyperbolic-loyalty.vercel.app';

async function savePushToken(token: string, jwt: string) {
  await fetch(`${API_BASE}/api/player/expo-push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ expo_push_token: token, platform: Platform.OS }),
  });
}

async function removePushToken(token: string, jwt: string) {
  await fetch(`${API_BASE}/api/player/expo-push-token`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ expo_push_token: token }),
  });
}

function AuthGuard() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pushToken = useRef<string | null>(null);
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
      // On sign-out: deregister token then clear
      if (pushToken.current) {
        getToken().then(jwt => {
          if (jwt && pushToken.current) {
            removePushToken(pushToken.current, jwt).catch(() => {});
          }
          pushToken.current = null;
        });
      }
      responseListener.current?.remove();
      return;
    }

    // On sign-in: register push token (contextual, not at first launch)
    registerForPushNotifications().then(async token => {
      if (!token) return;
      pushToken.current = token;
      try {
        const jwt = await getToken();
        if (jwt) await savePushToken(token, jwt);
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
