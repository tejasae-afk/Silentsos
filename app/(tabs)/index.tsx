import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SOSButton from '../../components/SOSButton';
import { useEmergency } from '../../context/EmergencyContext';
import { SilentSOSAgent } from '../../lib/adk-agent';

export default function HomeScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const {
    userProfile,
    loadingStatus,
    setLoadingStatus,
    setCurrentQuestion,
    setAlertResult,
    setPendingAnswer,
    setAgentAbort,
    reset,
  } = useEmergency();

  async function handleSOS() {
    if (loading) return;

    // Ensure camera permission
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera needed',
          'SilentSOS uses the camera to analyze your emergency. Please allow camera access in Settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLoading(true);
    reset();

    const agent = new SilentSOSAgent(
      userProfile.id || 'anonymous',
      userProfile.conditions,
      userProfile.medications
    );

    // Store abort function in context so dialogue.tsx can cancel
    setAgentAbort(() => () => {
      agent.abort();
      setLoading(false);
      reset();
    });

    const result = await agent.runEmergencyFlow({
      captureFrame: async () => {
        if (!cameraRef.current) return '';
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.6,
            base64: true,
          });
          return photo?.base64 ?? '';
        } catch {
          return '';
        }
      },

      getGPS: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return { lat: 0, lng: 0 };
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      },

      onQuestion: (question, index) => {
        setCurrentQuestion({ text: question, index });
        // Navigate to dialogue on the first question
        if (index === 0) {
          router.push('/dialogue');
        }
      },

      onAnswer: () =>
        new Promise<boolean>((resolve) => {
          setPendingAnswer(resolve);
        }),

      onStatusUpdate: (status) => {
        setLoadingStatus(status);
      },
    });

    setLoading(false);
    setAlertResult(result);
    setAgentAbort(null);

    if (result.success) {
      router.replace({
        pathname: '/alert-sent',
        params: {
          summary: result.summary,
          contactsNotified: JSON.stringify(result.contactsNotified),
          emergencyType: result.emergencyType,
          severity: result.severity,
          timestamp: result.alertTimestamp,
        },
      });
    } else if (result.error !== 'Cancelled by user') {
      Alert.alert(
        'Alert failed',
        'Could not send alert automatically. Please call 911 directly.',
        [{ text: 'OK' }]
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden camera for frame capture */}
      <View style={styles.hiddenCamera}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>{loadingStatus || 'Activating emergency mode...'}</Text>
          <Text style={styles.loadingSubtext}>Do not close this app</Text>
        </View>
      ) : (
        <>
          <View style={styles.topSection}>
            <Text style={styles.appName}>SilentSOS</Text>
            <Text style={styles.tagline}>Emergency help without speaking</Text>
          </View>

          <View style={styles.buttonSection}>
            <SOSButton onPress={handleSOS} />
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.hint}>Tap the button to get help</Text>
            <Text style={styles.subHint}>No speaking or typing needed</Text>
            {userProfile.name ? (
              <Text style={styles.profileName}>Ready for {userProfile.name}</Text>
            ) : (
              <Text style={styles.profileMissing}>Set up your profile in Contacts tab</Text>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#4B5563',
    fontSize: 16,
    textAlign: 'center',
  },
  topSection: { alignItems: 'center', gap: 8 },
  appName: {
    color: '#DC2626',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
  },
  tagline: {
    color: '#6B7280',
    fontSize: 18,
    textAlign: 'center',
  },
  buttonSection: { alignItems: 'center', justifyContent: 'center' },
  bottomSection: { alignItems: 'center', gap: 6 },
  hint: {
    color: '#D1D5DB',
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  subHint: { color: '#4B5563', fontSize: 16, textAlign: 'center' },
  profileName: { color: '#16A34A', fontSize: 15, marginTop: 8 },
  profileMissing: { color: '#6B7280', fontSize: 14, marginTop: 8, fontStyle: 'italic' },
});
