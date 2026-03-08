import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 26 : 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 20 },
        tabBarStyle: {
          backgroundColor: '#0D1117',
          borderTopColor: '#1F2937',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#DC2626',
        tabBarInactiveTintColor: '#4B5563',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SilentSOS',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🆘" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Emergency Contacts',
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Contacts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Alert History',
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="History" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
