/**
 * SilentSOSAgent — ADK-pattern multi-step emergency agent.
 *
 * Orchestrates the full emergency flow:
 * 1. Start Gemini Live session (primary)
 * 2. Stream camera frames → receive yes/no questions
 * 3. Await user answers via tool callbacks
 * 4. Generate summary → dispatch Twilio alert → log to Supabase
 *
 * Falls back gracefully: Gemini Live → Gemini one-shot → Claude
 */

import {
  startLiveSession,
  closeLiveSession,
  analyzeSceneWithGemini,
  type LiveSessionHandle,
  type GeminiSceneAnalysis,
} from './gemini';
import { AudioStreamer } from './audio-stream';
import { analyzeScene, generateEmergencySummary } from './claude-fallback';
import { sendAlert, type AlertContact } from './twilio';

// ─── Agent Tool Interface ─────────────────────────────────────────────────────

export interface AgentTools {
  /** Captures a camera frame and returns it as base64 JPEG */
  captureFrame: () => Promise<string>;
  /** Returns the current GPS coordinates */
  getGPS: () => Promise<{ lat: number; lng: number }>;
  /** Called for each question — use to update the UI */
  onQuestion: (question: string, index: number) => void;
  /** Returns a Promise that resolves when the user answers YES (true) or NO (false) */
  onAnswer: () => Promise<boolean>;
  /** Called to update the loading/status text shown to the user */
  onStatusUpdate: (status: string) => void;
}

// ─── Agent Result ─────────────────────────────────────────────────────────────

export interface AgentResult {
  success: boolean;
  summary: string;
  emergencyType: string;
  severity: string;
  contactsNotified: string[];
  alertTimestamp: string;
  usedFallback: boolean;
  error?: string;
}

// ─── Fallback Questions ────────────────────────────────────────────────────────

const FALLBACK_QUESTIONS = [
  'Are you in physical pain right now?',
  'Is there fire or smoke nearby?',
  'Is someone threatening or hurting you?',
  'Do you need an ambulance?',
  'Are you currently at home?',
];

// ─── Agent Class ──────────────────────────────────────────────────────────────

export class SilentSOSAgent {
  private liveHandle: LiveSessionHandle | null = null;
  private audioStreamer: AudioStreamer | null = null;
  private aborted = false;

  constructor(
    private userId: string,
    private userName: string,
    private userConditions: string[],
    private userMedications: string[],
    private emergencyContacts: AlertContact[]
  ) {}

  async runEmergencyFlow(tools: AgentTools): Promise<AgentResult> {
    let usedFallback = false;

    try {
      // ── Step 0: Parallel GPS + first frame capture ────────────────────────
      tools.onStatusUpdate('Getting your location...');
      const [gps, initialFrame] = await Promise.all([
        tools.getGPS().catch(() => ({ lat: 0, lng: 0 })),
        tools.captureFrame().catch(() => ''),
      ]);

      // ── Step 1: Start Gemini Live session ─────────────────────────────────
      tools.onStatusUpdate('Analyzing situation...');
      let questions: string[] = [];
      let sceneData: GeminiSceneAnalysis | null = null;

      try {
        this.liveHandle = await startLiveSession(this.userConditions, this.userMedications);

        // ── Start ambient audio stream ────────────────────────────────────────
        // AudioStreamer captures mic in 1.5s chunks and sends each chunk to
        // the Gemini Live session alongside the camera frames. This lets Gemini
        // hear fire alarms, distress sounds, etc. while it sees the scene.
        this.audioStreamer = new AudioStreamer((chunk) => {
          this.liveHandle?.sendAudio(chunk.base64, chunk.mimeType);
        });
        // Non-blocking — runs in background; failure just means no audio stream
        this.audioStreamer.start().catch((err) => {
          console.warn('[SilentSOSAgent] Audio stream failed to start:', err);
        });

        const firstResponse = await this.liveHandle.sendFrame(initialFrame);
        sceneData = {
          emergencyType: firstResponse.emergencyType,
          severity: firstResponse.severity,
          observations: firstResponse.observations,
          symbolCardsDetected: [],
          writtenNotesText: '',
          suggestedQuestions: [firstResponse.question],
          initialSummary: firstResponse.observations.join('. '),
        };
        questions.push(firstResponse.question);
      } catch (liveError) {
        console.warn('[SilentSOSAgent] Gemini Live failed, trying one-shot:', liveError);
        usedFallback = true;
        this.liveHandle = null;

        // Fallback A: Gemini one-shot (skip if quota is exceeded)
        if (initialFrame) {
          try {
            tools.onStatusUpdate('Connecting to backup system...');
            sceneData = await analyzeSceneWithGemini(initialFrame, this.userConditions);
            questions = sceneData.suggestedQuestions;
          } catch (geminiError) {
            const msg = String(geminiError);
            const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
            console.warn(
              isQuota
                ? '[SilentSOSAgent] Gemini quota exceeded, skipping to Claude'
                : '[SilentSOSAgent] Gemini one-shot failed, using Claude:',
              isQuota ? '' : geminiError
            );
          }
        }

        // Fallback B: Claude via API route
        if (!sceneData) {
          const claudeResult = await analyzeScene(initialFrame, {
            conditions: this.userConditions,
            medications: this.userMedications,
          });
          sceneData = {
            ...claudeResult,
            symbolCardsDetected: claudeResult.symbolCardsDetected ?? [],
            writtenNotesText: claudeResult.writtenNotesText ?? '',
          };
          questions = claudeResult.suggestedQuestions;
        }
      }

      if (this.aborted) return this.abortResult();

      // ── Step 2: Yes/No dialogue loop ──────────────────────────────────────
      const answers: boolean[] = [];
      const MAX_QUESTIONS = 5;

      for (let i = 0; i < MAX_QUESTIONS; i++) {
        if (this.aborted) return this.abortResult();

        const question = questions[i] ?? FALLBACK_QUESTIONS[i] ?? 'Do you need immediate help?';
        tools.onQuestion(question, i);

        const answer = await tools.onAnswer();
        answers.push(answer);

        // If Live session is active: send next frame → get next question
        if (this.liveHandle && i < MAX_QUESTIONS - 1) {
          try {
            const nextFrame = await tools.captureFrame().catch(() => '');
            const nextResponse = await this.liveHandle.sendFrame(nextFrame);
            questions.push(nextResponse.question);

            // Update sceneData with latest observations from the live model
            if (sceneData) {
              sceneData.emergencyType = nextResponse.emergencyType;
              sceneData.severity = nextResponse.severity;
              sceneData.observations = [
                ...new Set([...sceneData.observations, ...nextResponse.observations]),
              ];
            }

            if (nextResponse.isComplete) break;
          } catch {
            // Live session degraded mid-dialogue — continue with pre-loaded questions
          }
        }
      }

      if (this.aborted) return this.abortResult();

      // ── Step 3: Generate structured summary ───────────────────────────────
      tools.onStatusUpdate('Preparing alert...');
      let summary: string;

      try {
        summary = await generateEmergencySummary(
          {
            emergencyType: sceneData?.emergencyType ?? 'unknown',
            severity: sceneData?.severity ?? 'high',
            observations: sceneData?.observations ?? [],
            symbolCardsDetected: sceneData?.symbolCardsDetected ?? [],
            writtenNotesText: sceneData?.writtenNotesText ?? '',
            suggestedQuestions: questions,
            initialSummary: sceneData?.initialSummary ?? '',
          },
          answers
        );
      } catch {
        // Compose a plain-text summary if both AI services fail
        const yesAnswers = questions.filter((_, i) => answers[i]).join('; ');
        summary =
          `Emergency via SilentSOS. Type: ${sceneData?.emergencyType ?? 'unknown'}. ` +
          `Severity: ${sceneData?.severity ?? 'unknown'}. ` +
          `Observations: ${(sceneData?.observations ?? []).join(', ')}. ` +
          (yesAnswers ? `Patient confirmed: ${yesAnswers}.` : 'Requires immediate assistance.');
      }

      // ── Step 4: Dispatch Twilio alert + log to Supabase ──────────────────
      tools.onStatusUpdate('Sending alert to your contacts...');
      const alertResult = await sendAlert({
        userId: this.userId || 'anonymous',
        userName: this.userName || 'SilentSOS User',
        contacts: this.emergencyContacts,
        userConditions: this.userConditions,
        userMedications: this.userMedications,
        summary,
        emergencyType: sceneData?.emergencyType ?? 'unknown',
        severity: sceneData?.severity ?? 'high',
        gpsLat: gps.lat,
        gpsLng: gps.lng,
        questions,
        answers,
        observations: sceneData?.observations ?? [],
      });

      return {
        success: true,
        summary,
        emergencyType: sceneData?.emergencyType ?? 'unknown',
        severity: sceneData?.severity ?? 'high',
        contactsNotified: alertResult.contactsNotified,
        alertTimestamp: alertResult.timestamp,
        usedFallback,
      };
    } catch (err) {
      console.error('[SilentSOSAgent] Fatal error:', err);
      return {
        success: false,
        summary: '',
        emergencyType: 'unknown',
        severity: 'unknown',
        contactsNotified: [],
        alertTimestamp: new Date().toISOString(),
        usedFallback,
        error: String(err),
      };
    } finally {
      this.audioStreamer?.stop();
      this.audioStreamer = null;
      if (this.liveHandle) {
        closeLiveSession(this.liveHandle);
        this.liveHandle = null;
      }
    }
  }

  /** Abort the agent mid-flow (e.g., user presses Cancel) */
  abort(): void {
    this.aborted = true;
    this.audioStreamer?.stop();
    this.audioStreamer = null;
    if (this.liveHandle) {
      closeLiveSession(this.liveHandle);
      this.liveHandle = null;
    }
  }

  private abortResult(): AgentResult {
    return {
      success: false,
      summary: '',
      emergencyType: 'unknown',
      severity: 'unknown',
      contactsNotified: [],
      alertTimestamp: new Date().toISOString(),
      usedFallback: false,
      error: 'Cancelled by user',
    };
  }
}
