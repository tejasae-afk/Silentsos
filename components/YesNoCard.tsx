import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: boolean) => void;
  gestureIndicator?: 'nod' | 'shake' | null;
};

export default function YesNoCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  gestureIndicator,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Gesture feedback overlay */}
      {gestureIndicator === 'nod' && <View style={[styles.gestureFlash, styles.nodFlash]} />}
      {gestureIndicator === 'shake' && <View style={[styles.gestureFlash, styles.shakeFlash]} />}

      <Text style={styles.progress}>
        Question {questionNumber} of {totalQuestions}
      </Text>

      <Text style={styles.question}>{question}</Text>

      <Text style={styles.hint}>Nod your head for YES · Tilt phone for NO · Or tap below</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.answerBtn, styles.yesBtn]}
          onPress={() => onAnswer(true)}
          accessibilityLabel="Yes"
          accessibilityRole="button"
        >
          <Text style={styles.btnIcon}>✓</Text>
          <Text style={styles.btnLabel}>YES</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.answerBtn, styles.noBtn]}
          onPress={() => onAnswer(false)}
          accessibilityLabel="No"
          accessibilityRole="button"
        >
          <Text style={styles.btnIcon}>✗</Text>
          <Text style={styles.btnLabel}>NO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  gestureFlash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    zIndex: -1,
    borderRadius: 12,
  },
  nodFlash: { backgroundColor: '#16A34A' },
  shakeFlash: { backgroundColor: '#DC2626' },
  progress: {
    color: '#9CA3AF',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  question: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 44,
  },
  hint: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
  },
  answerBtn: {
    flex: 1,
    height: 140,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  yesBtn: {
    backgroundColor: '#16A34A',
  },
  noBtn: {
    backgroundColor: '#DC2626',
  },
  btnIcon: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  btnLabel: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 3,
  },
});
