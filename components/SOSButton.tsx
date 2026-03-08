import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onPress: () => void;
  disabled?: boolean;
};

export default function SOSButton({ onPress, disabled = false }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.outerRing, { transform: [{ scale: pulse }] }]} />
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityLabel="Emergency SOS button"
        accessibilityRole="button"
      >
        <Text style={styles.label}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const DIAMETER = 220;

const styles = StyleSheet.create({
  wrapper: {
    width: DIAMETER,
    height: DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: DIAMETER / 2,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  button: {
    width: DIAMETER - 20,
    height: DIAMETER - 20,
    borderRadius: (DIAMETER - 20) / 2,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 4,
  },
});
