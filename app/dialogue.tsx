import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import YesNoCard from '../components/YesNoCard';
import { useEmergency } from '../context/EmergencyContext';
import { useHeadGesture } from '../lib/mediapipe';
import { parseYesNo, recordAndTranscribe, speakText } from '../lib/vertex-speech';

type VoiceState = 'idle' | 'speaking' | 'listening' | 'processing';

const TOTAL_QUESTIONS = 5;
const LISTEN_DURATION_MS = 5000;

export default function DialogueScreen() {
  const { currentQuestion, resolveAnswer, agentAbort, loadingStatus } = useEmergency();

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [countdown, setCountdown] = useState(0);
  const [lastTranscript, setLastTranscript] = useState('');

  const answeredRef = useRef(false);
  const questionKeyRef = useRef('');
  const stopMicRef = useRef<(() => void) | null>(null); // stops recording early on button tap
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { gesture, startListening: startGesture, stopListening: stopGesture } =
    useHeadGesture((g) => { handleAnswer(g === 'nod'); });

  useEffect(() => {
    startGesture();
    return () => stopGesture();
  }, []);

  // Pulse animation while mic is active
  useEffect(() => {
    if (voiceState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [voiceState]);

  // Start voice flow when a new question arrives
  useEffect(() => {
    if (!currentQuestion) return;
    const key = `q${currentQuestion.index}`;
    if (questionKeyRef.current === key) return;
    questionKeyRef.current = key;
    answeredRef.current = false;
    setLastTranscript('');
    runVoiceFlow(currentQuestion.text);
  }, [currentQuestion]);

  async function runVoiceFlow(question: string) {
    // 1. Speak the question via Google Cloud TTS
    setVoiceState('speaking');
    await speakText(question);
    if (answeredRef.current) return;

    // 2. Record user response via microphone
    setVoiceState('listening');
    const { promise, stop } = recordAndTranscribe(LISTEN_DURATION_MS, (rem) => setCountdown(rem));
    stopMicRef.current = stop;
    const transcript = await promise;
    stopMicRef.current = null;
    if (answeredRef.current) return;

    // 3. Interpret response with NLP parser
    setVoiceState('processing');
    setLastTranscript(transcript);

    const parsed = parseYesNo(transcript);
    if (parsed !== null) {
      // Clear confident answer — resolve automatically
      answeredRef.current = true;
      resolveAnswer(parsed);
    } else if (transcript) {
      // Heard something but ambiguous — one re-prompt then fall back to buttons
      await speakText("I didn't catch that clearly. Please say yes or no, or tap the buttons below.");
      setVoiceState('idle');
    } else {
      // Nothing heard — guide to buttons
      await speakText('Please tap Yes or No below to answer.');
      setVoiceState('idle');
    }
  }

  function handleAnswer(answer: boolean) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    stopMicRef.current?.(); // cut mic immediately — no need to wait for countdown
    stopGesture();
    speakText(answer ? 'Got it — yes.' : 'Got it — no.'); // audio confirm for blind users
    resolveAnswer(answer);
    setTimeout(() => { answeredRef.current = false; startGesture(); }, 300);
  }

  function handleCancel() {
    Alert.alert('Cancel Emergency?', 'Are you sure? No alert will be sent.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Cancel Alert', style: 'destructive',
        onPress: () => { stopGesture(); agentAbort?.(); router.back(); },
      },
    ]);
  }

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>{loadingStatus || 'Analyzing situation...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isListening = voiceState === 'listening';
  const voiceLabel =
    voiceState === 'speaking'    ? '🔊 Speaking...'            :
    voiceState === 'listening'   ? `🎙 Listening  ${countdown}s` :
    voiceState === 'processing'  ? '⚙️ Processing...'           :
    '🎙 Say your answer or tap below';

  return (
    <SafeAreaView style={styles.container}>

      {/* Camera + voice overlay */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="front" />

        {/* Top badges */}
        <View style={styles.badgeRow}>
          <View style={styles.geminiBadge}>
            <Text style={styles.badgeText}>⚡ Gemini Live</Text>
          </View>
          <View style={[styles.voiceBadge, isListening && styles.voiceBadgeActive]}>
            <Text style={styles.badgeText}>{voiceLabel}</Text>
          </View>
        </View>

        {/* Pulsing mic visual while listening */}
        {isListening && (
          <View style={styles.micWrapper}>
            <Animated.View style={[styles.micPulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.micCore}>
              <Text style={styles.micIcon}>🎙</Text>
            </View>
          </View>
        )}

        {/* Transcript feedback */}
        {lastTranscript ? (
          <View style={styles.transcriptBadge}>
            <Text style={styles.transcriptLabel}>I heard:</Text>
            <Text style={styles.transcriptText}>"{lastTranscript}"</Text>
          </View>
        ) : null}

        {/* Gesture hint */}
        <View style={styles.gestureLabelWrap}>
          <Text style={styles.gestureLabel}>
            {gesture === 'nod'   ? '✓ NOD — YES' :
             gesture === 'shake' ? '✗ SHAKE — NO' :
             'Nod = YES  •  Shake = NO'}
          </Text>
        </View>
      </View>

      {/* Question card + YES/NO buttons (always visible as fallback) */}
      <View style={styles.dialogueContainer}>
        <YesNoCard
          question={currentQuestion.text}
          questionNumber={currentQuestion.index + 1}
          totalQuestions={TOTAL_QUESTIONS}
          onAnswer={handleAnswer}
          gestureIndicator={gesture}
        />
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>CANCEL</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117' },
  waitingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  waitingText: { color: '#FFFFFF', fontSize: 24, fontWeight: '600', textAlign: 'center' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  badgeRow: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
  },
  geminiBadge: {
    backgroundColor: 'rgba(37,99,235,0.9)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
  },
  voiceBadge: {
    backgroundColor: 'rgba(75,85,99,0.9)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100,
  },
  voiceBadgeActive: { backgroundColor: 'rgba(220,38,38,0.9)' },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  micWrapper: {
    position: 'absolute', alignSelf: 'center', top: '30%',
    alignItems: 'center', justifyContent: 'center',
  },
  micPulse: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(220,38,38,0.3)',
  },
  micCore: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
  },
  micIcon: { fontSize: 34 },
  transcriptBadge: {
    position: 'absolute', bottom: 48, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: 12, gap: 3,
  },
  transcriptLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  transcriptText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', fontStyle: 'italic' },
  gestureLabelWrap: {
    position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center',
  },
  gestureLabel: {
    backgroundColor: 'rgba(0,0,0,0.7)', color: '#D1D5DB',
    fontSize: 13, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 100, overflow: 'hidden',
  },
  dialogueContainer: { flex: 1.2 },
  cancelBtn: {
    paddingVertical: 14, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#1F2937',
  },
  cancelText: { color: '#6B7280', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
});
