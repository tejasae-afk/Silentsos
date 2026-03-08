/**
 * Gemini Live API client for SilentSOS.
 * Primary: Live session for real-time multimodal streaming:
 *   - Camera frames (visual scene understanding)
 *   - Microphone audio (ambient sound detection — fire alarms, distress sounds)
 * Fallback: One-shot Gemini Flash for static scene analysis.
 */

import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeminiLiveResponse {
  question: string;
  emergencyType: 'medical' | 'fire' | 'crime' | 'accident' | 'unknown';
  severity: 'critical' | 'high' | 'medium';
  observations: string[];
  isComplete: boolean;
}

export interface GeminiSceneAnalysis {
  emergencyType: 'medical' | 'fire' | 'crime' | 'accident' | 'unknown';
  severity: 'critical' | 'high' | 'medium';
  observations: string[];
  symbolCardsDetected: string[];
  writtenNotesText: string;
  suggestedQuestions: string[];
  initialSummary: string;
}

export interface LiveSessionHandle {
  sessionId: string;
  /** Send a camera frame and await the AI's next question */
  sendFrame: (base64Image: string) => Promise<GeminiLiveResponse>;
  /** Send an ambient audio chunk — fire-and-forget, no response expected */
  sendAudio: (base64Audio: string, mimeType: string) => void;
  close: () => void;
}

export class GeminiLiveError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GeminiLiveError';
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildLiveSystemPrompt(conditions: string[], medications: string[]): string {
  return `You are a real-time emergency triage agent for SilentSOS.
The user CANNOT speak or type — they communicate through camera only.

YOUR BEHAVIOR:
- Analyze the live camera stream
- Ask ONLY yes/no questions, maximum 10 words each
- Start with the most critical assessment first
- Each response must be valid JSON only, no extra text, no markdown

RESPONSE FORMAT (always return exactly this JSON):
{
  "question": "Are you having trouble breathing?",
  "emergencyType": "medical|fire|crime|accident|unknown",
  "severity": "critical|high|medium",
  "observations": ["person appears distressed", "holding chest"],
  "isComplete": false
}

Set isComplete to true only after 5 questions or when emergency type is certain.
You receive BOTH live camera frames AND ambient microphone audio. Use both together.
If you hear a fire alarm, smoke detector, breaking glass, or distress sounds in the audio,
immediately factor that into emergencyType and severity.
Watch AND listen for: AAC symbol boards, written notes, facial expressions, injuries,
fire alarms, smoke detectors, glass breaking, crying, or any distress sounds.
User medical conditions: ${conditions.join(', ') || 'none listed'}
User medications: ${medications.join(', ') || 'none listed'}`;
}

// ─── Live Session ─────────────────────────────────────────────────────────────

export async function startLiveSession(
  userConditions: string[],
  userMedications: string[]
): Promise<LiveSessionHandle> {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';
  const genAI = new GoogleGenAI({ apiKey });

  const systemPrompt = buildLiveSystemPrompt(userConditions, userMedications);

  // Pending response queue: stores resolver for the current awaited response
  let pendingResolver: ((r: GeminiLiveResponse) => void) | null = null;
  let pendingRejector: ((e: Error) => void) | null = null;
  let textBuffer = '';

  let resolveConnect!: (s: LiveSessionHandle) => void;
  let rejectConnect!: (e: Error) => void;
  const connectPromise = new Promise<LiveSessionHandle>((res, rej) => {
    resolveConnect = res;
    rejectConnect = rej;
  });

  const session = await genAI.live.connect({
    model: 'gemini-2.0-flash-live-001',
    config: {
      systemInstruction: systemPrompt,
      responseModalities: [Modality.TEXT],
    },
    callbacks: {
      onopen: () => {
        resolveConnect(handle);
      },
      onmessage: (msg: LiveServerMessage) => {
        const part = msg.serverContent?.modelTurn?.parts?.[0];
        if (part && 'text' in part && part.text) {
          textBuffer += part.text;
        }

        // turnComplete signals end of model turn — try to parse now
        if (msg.serverContent?.turnComplete && pendingResolver) {
          try {
            const cleaned = textBuffer.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned) as GeminiLiveResponse;
            textBuffer = '';
            const resolve = pendingResolver;
            pendingResolver = null;
            pendingRejector = null;
            resolve(parsed);
          } catch (e) {
            textBuffer = '';
            const reject = pendingRejector;
            pendingResolver = null;
            pendingRejector = null;
            reject?.(new GeminiLiveError('JSON parse failed: ' + textBuffer, 'PARSE_ERROR'));
          }
        }
      },
      onerror: (e: ErrorEvent) => {
        const err = new GeminiLiveError(`Live session error: ${e.message}`, 'SESSION_ERROR');
        rejectConnect(err);
        pendingRejector?.(err);
      },
      onclose: () => {
        pendingRejector?.(new GeminiLiveError('Session closed unexpectedly', 'SESSION_CLOSED'));
      },
    },
  });

  const handle: LiveSessionHandle = {
    sessionId: `sos_${Date.now()}`,

    sendFrame: (base64Image: string) => {
      return new Promise<GeminiLiveResponse>((resolve, reject) => {
        pendingResolver = resolve;
        pendingRejector = reject;
        textBuffer = '';

        // Send image as a video frame (real-time input)
        session.sendRealtimeInput({
          video: { mimeType: 'image/jpeg', data: base64Image },
        });

        // Also send a text nudge to trigger response
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: 'Analyze and respond with JSON.' }] }],
          turnComplete: true,
        });

        // 8-second timeout
        setTimeout(() => {
          if (pendingResolver) {
            pendingResolver = null;
            pendingRejector = null;
            reject(new GeminiLiveError('Response timeout', 'TIMEOUT'));
          }
        }, 8000);
      });
    },

    sendAudio: (base64Audio: string, mimeType: string) => {
      // Fire-and-forget: send audio chunk to the live session.
      // Gemini processes it alongside the camera stream — no response expected.
      try {
        session.sendRealtimeInput({
          audio: { mimeType, data: base64Audio },
        });
      } catch {
        // Non-fatal: audio chunk dropped, session continues
      }
    },

    close: () => {
      try {
        session.close();
      } catch {
        // already closed
      }
    },
  };

  return connectPromise;
}

export function closeLiveSession(handle: LiveSessionHandle): void {
  handle.close();
}

// ─── One-Shot Fallback (Gemini Flash) ────────────────────────────────────────

export async function analyzeSceneWithGemini(
  imageBase64: string,
  userConditions: string[]
): Promise<GeminiSceneAnalysis> {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are an emergency triage AI. The person CANNOT speak or type.
Analyze this emergency scene image and return ONLY valid JSON, no markdown:
{
  "emergencyType": "medical|fire|crime|accident|unknown",
  "severity": "critical|high|medium",
  "observations": [],
  "symbolCardsDetected": [],
  "writtenNotesText": "",
  "suggestedQuestions": ["", "", "", "", ""],
  "initialSummary": ""
}
User conditions: ${userConditions.join(', ') || 'none'}
Generate exactly 5 yes/no questions, most critical first.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
  ]);

  const text = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(text) as GeminiSceneAnalysis;
}
