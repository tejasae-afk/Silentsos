import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import AlertSummary from '../components/AlertSummary';
import { useEmergency } from '../context/EmergencyContext';

export default function AlertSentScreen() {
  const params = useLocalSearchParams<{
    summary: string;
    contactsNotified: string;
    emergencyType: string;
    severity: string;
    timestamp: string;
  }>();

  const { reset } = useEmergency();

  const contactsNotified: string[] = params.contactsNotified
    ? JSON.parse(params.contactsNotified)
    : [];

  function handleDone() {
    reset();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.container}>
      <AlertSummary
        summary={params.summary ?? ''}
        contactsNotified={contactsNotified}
        emergencyType={params.emergencyType ?? 'unknown'}
        severity={params.severity ?? 'high'}
        timestamp={params.timestamp}
      />

      <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
        <Text style={styles.doneBtnText}>I'm Safe — Return Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  doneBtn: {
    margin: 24,
    padding: 20,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  doneBtnText: {
    color: '#D1D5DB',
    fontSize: 18,
    fontWeight: '700',
  },
});
