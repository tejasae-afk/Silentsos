import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import YesNoCard from '../components/YesNoCard';
import { useEmergency } from '../context/EmergencyContext';
import { useHeadGesture } from '../lib/mediapipe';

const TOTAL_QUESTIONS = 5;

export default function DialogueScreen() {
  const { currentQuestion, resolveAnswer, agentAbort, loadingStatus } = useEmergency();

  // Head gesture detection — calls resolveAnswer when gesture is detected
  const { gesture, startListening, stopListening } = useHeadGesture((g) => {
    if (g === 'nod') resolveAnswer(true);
    else if (g === 'shake') resolveAnswer(false);
  });

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []);

  function handleAnswer(answer: boolean) {
    stopListening();
    resolveAnswer(answer);
    // Restart listening for the next question
    setTimeout(() => startListening(), 300);
  }

  function handleCancel() {
    Alert.alert(
      'Cancel Emergency?',
      'Are you sure you want to cancel? No alert will be sent.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Cancel Alert',
          style: 'destructive',
          onPress: () => {
            stopListening();
            agentAbort?.();
            router.back();
          },
        },
      ]
    );
  }

  // Show "waiting for agent" state if no question yet
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>{loadingStatus || 'Analyzing situation...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Front camera for gesture detection feedback */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="front" />
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraLabel}>
            {gesture === 'nod'
              ? '✓ NOD DETECTED'
              : gesture === 'shake'
              ? '✗ SHAKE DETECTED'
              : 'Watching for head movements...'}
          </Text>
        </View>
        {/* Gemini Live + mic listening badges */}
        <View style={styles.badgeRow}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>⚡ Gemini Live</Text>
          </View>
          <View style={styles.micBadge}>
            <Text style={styles.micBadgeText}>🎙 Listening</Text>
          </View>
        </View>
      </View>

      {/* Question card */}
      <View style={styles.dialogueContainer}>
        <YesNoCard
          question={currentQuestion.text}
          questionNumber={currentQuestion.index + 1}
          totalQuestions={TOTAL_QUESTIONS}
          onAnswer={handleAnswer}
          gestureIndicator={gesture}
        />
      </View>

      {/* Cancel */}
      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>CANCEL</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  waitingText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    overflow: 'hidden',
  },
  badgeRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  aiBadge: {
    backgroundColor: 'rgba(37,99,235,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  micBadge: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  micBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dialogueContainer: { flex: 1.2 },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
