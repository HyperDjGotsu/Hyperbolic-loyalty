import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

const TAB_BAR_STYLE = {
  backgroundColor: '#0f0f1a',
  borderTopColor: '#1e1e2e',
  borderTopWidth: 1,
  paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  height: Platform.OS === 'ios' ? 84 : 60,
};

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', color: '#fff' },
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#4b5563',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔔" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
