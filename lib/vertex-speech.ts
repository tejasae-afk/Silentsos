/**
 * Voice services for SilentSOS emergency dialogue
 *
 * speakText()           — expo-speech (device TTS, works offline, no API key needed)
 * recordAndTranscribe() — Google Cloud Speech-to-Text via Vertex AI
 * parseYesNo()          — NLP parser for natural-language yes/no responses
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { readAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';


// ─── Text-to-Speech ──────────────────────────────────────────────────────────

/**
 * Speak text aloud using the device's built-in TTS engine.
 * Resolves when speech finishes (or immediately on error).
 */
export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.85,
      onDone: () => resolve(),
      onError: () => resolve(), // always resolve so the flow continues
    });
  });
}

// ─── Speech-to-Text ──────────────────────────────────────────────────────────

// Module-level guard: only one recording can exist at a time in expo-av
let _activeRecording: Audio.Recording | null = null;

async function _safeStopActive() {
  if (_activeRecording) {
    try { await _activeRecording.stopAndUnloadAsync(); } catch {}
    _activeRecording = null;
  }
}

/**
 * Record microphone for `durationMs` milliseconds, then send to
 * Google Cloud Speech-to-Text for transcription.
 *
 * Returns { promise, stop } — call stop() to end recording early
 * (e.g. when user taps YES/NO button before countdown ends).
 */
export function recordAndTranscribe(
  durationMs = 5000,
  onTick?: (secondsRemaining: number) => void
): { promise: Promise<string>; stop: () => void } {
  let stopEarly: () => void = () => {};

  const promise = _record(durationMs, onTick, (fn) => {
    stopEarly = fn;
  });

  return { promise, stop: () => stopEarly() };
}

async function _record(
  durationMs: number,
  onTick: ((rem: number) => void) | undefined,
  onStopReady: (stopFn: () => void) => void
): Promise<string> {
  try {
    // Ensure any previous recording is fully unloaded first
    await _safeStopActive();

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return '';

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync({
      android: {
        extension: '.wav',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.MIN,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
    });

    // Track active recording so next call can clean it up
    _activeRecording = recording;

    // Expose early-stop to caller
    let stopped = false;
    onStopReady(() => {
      stopped = true;
      recording.stopAndUnloadAsync().catch(() => {});
      _activeRecording = null;
    });

    // Countdown — checks stopped each second
    const seconds = Math.ceil(durationMs / 1000);
    for (let i = seconds; i > 0; i--) {
      if (stopped) break;
      onTick?.(i);
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!stopped) {
      await recording.stopAndUnloadAsync();
      _activeRecording = null;
    }

    const uri = recording.getURI();
    if (!uri) return '';

    return await _transcribe(uri);
  } catch (err) {
    _activeRecording = null;
    console.warn('[STT] Recording error:', err);
    return '';
  }
}

async function _transcribe(uri: string): Promise<string> {
  try {
    const base64Audio = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    await deleteAsync(uri, { idempotent: true });

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64Audio }),
    });

    if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
    const data = await res.json();
    return (data.transcript as string) ?? '';
  } catch (err) {
    console.warn('[STT] Transcription error:', err);
    return '';
  }
}

// ─── Response Parser ─────────────────────────────────────────────────────────

/**
 * Parse a natural-language response into yes / no / unclear.
 *
 * Returns true  (yes)    e.g. "yes I'm hurt", "yeah help me", "I need help"
 *         false (no)     e.g. "no", "I'm fine", "I don't think so"
 *         null  (unclear) e.g. "maybe", "um", silence
 */
export function parseYesNo(transcript: string): boolean | null {
  const t = transcript.toLowerCase().trim();
  if (!t) return null;

  const YES = [
    /\byes\b/, /\byeah\b/, /\byep\b/, /\bsure\b/, /\baffirmative\b/,
    /\bcorrect\b/, /\bright\b/, /\bplease\b/, /\bhelp\b/,
    /\bi (am|do|need|have|can|will)\b/,
    /\bhurt\b/, /\bpain\b/, /\bfire\b/, /\bsmoke\b/,
    /\bbleeding\b/, /\bcan'?t breathe\b/, /\bstuck\b/, /\btrapped\b/,
  ];

  const NO = [
    /\bno\b/, /\bnope\b/, /\bnegative\b/,
    /\bi'?m (fine|okay|ok|good|alright|safe)\b/,
    /\bnot\b/, /\bdon'?t\b/, /\bdo not\b/,
    /\bi haven'?t\b/, /\bi don'?t (need|have|think)\b/,
  ];

  if (YES.some((p) => p.test(t))) return true;
  if (NO.some((p) => p.test(t))) return false;
  return null;
}
