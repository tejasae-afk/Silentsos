/**
 * Head gesture detection using expo-sensors Accelerometer (fallback implementation).
 * Tilt phone forward/back = YES (nod), tilt left/right = NO (shake).
 *
 * NOTE: Replace with MediaPipe Face Mesh frame processor for production-grade
 * gesture detection using nose tip Y landmark tracking.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';

type Gesture = 'nod' | 'shake' | null;

type HeadGestureState = {
  gesture: Gesture;
  confidence: number;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
};

const THRESHOLD = 0.3;      // g-force change required (lower = more sensitive)
const DEBOUNCE_MS = 500;    // prevent double-detection

export function useHeadGesture(onGesture?: (gesture: 'nod' | 'shake') => void): HeadGestureState {
  const [gesture, setGesture] = useState<Gesture>(null);
  const [confidence, setConfidence] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const baselineRef = useRef<{ x: number; y: number } | null>(null);
  const lastGestureTime = useRef(0);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  const startListening = useCallback(() => {
    // Remove existing subscription before creating a new one — prevents leaked
    // listeners when startListening is called multiple times (e.g. after each answer)
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;

    baselineRef.current = null;
    setGesture(null);
    setConfidence(0);
    setIsListening(true);

    Accelerometer.setUpdateInterval(50); // poll every 50ms for faster gesture response
    subscriptionRef.current = Accelerometer.addListener(({ x, y }) => {
      if (!baselineRef.current) {
        baselineRef.current = { x, y };
        return;
      }

      const now = Date.now();
      if (now - lastGestureTime.current < DEBOUNCE_MS) return;

      const deltaY = y - baselineRef.current.y;
      const deltaX = x - baselineRef.current.x;
      const absY = Math.abs(deltaY);
      const absX = Math.abs(deltaX);

      if (absY > THRESHOLD && absY > absX) {
        // Vertical tilt = NOD (yes)
        lastGestureTime.current = now;
        setGesture('nod');
        setConfidence(Math.min(absY / THRESHOLD, 1));
        onGesture?.('nod');
        setTimeout(() => setGesture(null), 1500);
      } else if (absX > THRESHOLD && absX > absY) {
        // Horizontal tilt = SHAKE (no)
        lastGestureTime.current = now;
        setGesture('shake');
        setConfidence(Math.min(absX / THRESHOLD, 1));
        onGesture?.('shake');
        setTimeout(() => setGesture(null), 1500);
      }

      // Update rolling baseline slowly
      baselineRef.current = {
        x: baselineRef.current.x * 0.9 + x * 0.1,
        y: baselineRef.current.y * 0.9 + y * 0.1,
      };
    });
  }, [onGesture]);

  const stopListening = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsListening(false);
    setGesture(null);
  }, []);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.remove();
    };
  }, []);

  return { gesture, confidence, isListening, startListening, stopListening };
}
