/**
 * POST /api/analyze-scene
 * Primary: Gemini Flash (one-shot vision)
 * Fallback: Claude Vision
 *
 * Accepts: { imageBase64: string, userProfile: { conditions: string[], medications: string[] } }
 * Returns: SceneAnalysis JSON + { provider: 'gemini' | 'claude-fallback' }
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type SceneAnalysis = {
  emergencyType: 'medical' | 'fire' | 'crime' | 'accident' | 'unknown';
  severity: 'critical' | 'high' | 'medium';
  observations: string[];
  symbolCardsDetected: string[];
  writtenNotesText: string;
  suggestedQuestions: string[];
  initialSummary: string;
};

const JSON_FORMAT = `{
  "emergencyType": "medical|fire|crime|accident|unknown",
  "severity": "critical|high|medium",
  "observations": ["..."],
  "symbolCardsDetected": ["..."],
  "writtenNotesText": "...",
  "suggestedQuestions": ["...", "...", "...", "...", "..."],
  "initialSummary": "..."
}`;

function buildPrompt(conditions: string[], medications: string[]): string {
  return `You are an emergency triage AI. The user CANNOT speak or type.
Analyze the camera image and return ONLY valid JSON (no markdown):
${JSON_FORMAT}
Focus on: AAC symbol boards, written notes, injuries, hazards, facial expression.
Generate exactly 5 yes/no questions, most critical first.
User conditions: ${conditions.join(', ') || 'none'}
User medications: ${medications.join(', ') || 'none'}`;
}

function parseSceneAnalysis(text: string): SceneAnalysis {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as SceneAnalysis;
}

async function analyzeWithGemini(
  imageBase64: string,
  conditions: string[],
  medications: string[]
): Promise<SceneAnalysis> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent([
    buildPrompt(conditions, medications),
    { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
  ]);

  return parseSceneAnalysis(result.response.text());
}

async function analyzeWithClaude(
  imageBase64: string,
  conditions: string[],
  medications: string[]
): Promise<SceneAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const attemptClaude = async (extraInstruction = '') => {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildPrompt(conditions, medications) + extraInstruction,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: 'Analyze this emergency scene. Return ONLY the JSON object.' },
          ],
        },
      ],
    });
    const block = message.content[0];
    if (block.type !== 'text') throw new Error('Non-text response from Claude');
    return block.text;
  };

  let rawText: string;
  try {
    rawText = await attemptClaude();
  } catch {
    rawText = await attemptClaude('\n\nIMPORTANT: Return ONLY the raw JSON object, nothing else.');
  }

  try {
    return parseSceneAnalysis(rawText);
  } catch {
    rawText = await attemptClaude('\n\nIMPORTANT: Return ONLY the raw JSON object, nothing else.');
    return parseSceneAnalysis(rawText);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { imageBase64, userProfile } = await request.json();
    const conditions: string[] = userProfile?.conditions ?? [];
    const medications: string[] = userProfile?.medications ?? [];

    // Try Gemini first
    try {
      const result = await analyzeWithGemini(imageBase64, conditions, medications);
      return new Response(JSON.stringify({ ...result, provider: 'gemini' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (geminiErr) {
      console.error('[analyze-scene] Gemini failed, trying Claude:', geminiErr);
    }

    // Fallback: Claude
    const result = await analyzeWithClaude(imageBase64, conditions, medications);
    return new Response(JSON.stringify({ ...result, provider: 'claude-fallback' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[analyze-scene] All providers failed:', err);
    return new Response(JSON.stringify({ error: 'Scene analysis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
