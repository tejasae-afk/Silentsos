import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { EmergencyProvider } from '../context/EmergencyContext';

export default function RootLayout() {
  return (
    <EmergencyProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#000000' },
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="dialogue"
          options={{
            title: 'Emergency Dialogue',
            headerStyle: { backgroundColor: '#0D1117' },
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="alert-sent"
          options={{
            title: 'Alert Sent',
            headerStyle: { backgroundColor: '#0D1117' },
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
      </Stack>
    </EmergencyProvider>
  );
}
