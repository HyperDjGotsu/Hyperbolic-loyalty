import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { AlertsProvider, useAlertsContext } from '@/lib/alerts-context';

const TAB_BAR_STYLE = {
  backgroundColor: '#111009',
  borderTopColor: 'rgba(242,239,232,0.08)',
  borderTopWidth: 1,
  paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  height: Platform.OS === 'ios' ? 84 : 60,
};

function TabsNav() {
  const { badgeCount } = useAlertsContext();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#111009' },
        headerTintColor: '#f2efe8',
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#c4b5fd',
        tabBarInactiveTintColor: '#7a7060',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarLabel: 'Community',
          tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="prize-wall"
        options={{
          title: 'Prizes',
          tabBarLabel: 'Prizes',
          tabBarIcon: ({ color }) => <Feather name="gift" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <Feather name="bell" size={22} color={color} />,
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <AlertsProvider>
      <TabsNav />
    </AlertsProvider>
  );
}
