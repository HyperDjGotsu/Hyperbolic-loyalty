import { Linking } from 'react-native';

// Maps website paths (as stored in banners / store updates) to native tabs; external URLs open in the browser.
export function openAppLink(router: { push: (href: never) => void }, link: string) {
  if (/^https?:\/\//i.test(link)) { Linking.openURL(link).catch(() => {}); return; }
  const [path, query = ''] = link.split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  const map: Record<string, string> = {
    '/dashboard/events': '/(tabs)/events', '/dashboard/community': '/(tabs)/community',
    '/dashboard/prize-wall': '/(tabs)/prize-wall', '/dashboard/profile': '/(tabs)/profile',
    '/dashboard/notifications': '/(tabs)/notifications', '/dashboard': '/(tabs)',
  };
  const target = map[path.replace(/\/$/, '')];
  if (target) router.push({ pathname: target, params } as never);
}
