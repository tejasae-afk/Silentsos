/**
 * AudioStreamer — captures microphone audio in rolling 1.5-second chunks
 * and calls onChunk() with each chunk's base64 data.
 *
 * Used to stream ambient audio to Gemini Live alongside camera frames,
 * enabling the AI to hear the environment (fire alarms, distress sounds, etc.)
 */

import { Audio } from 'expo-av';
import { readFileAsBase64, deleteFile } from './fs-helper';

export type AudioChunk = {
  base64: string;
  mimeType: 'audio/wav';
};

export type AudioChunkCallback = (chunk: AudioChunk) => void;

// Recording preset optimised for speech/ambient sound + Gemini Live compatibility
const RECORDING_OPTIONS: Audio.RecordingOptions = {
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
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

const CHUNK_DURATION_MS = 1500; // Capture 1.5s of audio per chunk

export class AudioStreamer {
  private active = false;
  private onChunk: AudioChunkCallback;

  constructor(onChunk: AudioChunkCallback) {
    this.onChunk = onChunk;
  }

  async start(): Promise<void> {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      console.warn('[AudioStreamer] Microphone permission denied — audio stream disabled');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    this.active = true;
    // Run the recording loop without blocking the caller
    this.recordLoop().catch((err) => {
      console.warn('[AudioStreamer] Loop error:', err);
    });
  }

  stop(): void {
    this.active = false;
  }

  private async recordLoop(): Promise<void> {
    while (this.active) {
      try {
        await this.captureChunk();
      } catch (err) {
        console.warn('[AudioStreamer] Chunk error:', err);
        // Small pause before retrying to avoid tight error loops
        await delay(500);
      }
    }
  }

  private async captureChunk(): Promise<void> {
    if (!this.active) return;

    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);

    await delay(CHUNK_DURATION_MS);

    if (!this.active) {
      // Streamer was stopped mid-chunk — discard
      await recording.stopAndUnloadAsync().catch(() => {});
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri) return;

    try {
      const base64 = await readFileAsBase64(uri);
      if (this.active) this.onChunk({ base64, mimeType: 'audio/wav' });
    } catch (err) {
      console.warn('[AudioStreamer] Failed to read chunk:', err);
    } finally {
      await deleteFile(uri);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
