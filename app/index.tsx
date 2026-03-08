import { Redirect } from 'expo-router';
import { useEmergency } from '../context/EmergencyContext';

export default function Index() {
  const { userProfile } = useEmergency();

  if (!userProfile.name) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
