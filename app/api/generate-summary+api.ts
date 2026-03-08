/**
 * POST /api/generate-summary
 * Accepts: { sceneAnalysis: SceneAnalysis, answers: boolean[] }
 * Returns: { summary: string }
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SceneAnalysis } from './analyze-scene+api';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request): Promise<Response> {
  try {
    const { sceneAnalysis, answers }: { sceneAnalysis: SceneAnalysis; answers: boolean[] } = await request.json();

    const qaLines = sceneAnalysis.suggestedQuestions
      .map((q, i) => `Q: ${q}\nA: ${answers[i] ? 'YES' : 'NO'}`)
      .join('\n');

    const prompt = `You are an AI emergency dispatcher assistant. Generate a concise, professional 3-sentence emergency summary for first responders.

Scene Analysis:
- Emergency type: ${sceneAnalysis.emergencyType}
- Severity: ${sceneAnalysis.severity}
- Observations: ${sceneAnalysis.observations.join(', ')}
- Symbol cards detected: ${sceneAnalysis.symbolCardsDetected.join(', ') || 'none'}
- Written notes: ${sceneAnalysis.writtenNotesText || 'none'}
- Initial assessment: ${sceneAnalysis.initialSummary}

Patient responses to clarifying questions:
${qaLines}

Write ONLY the 3-sentence summary. Use plain language, no markdown. Include the emergency type, key observations, and patient-confirmed details. Format for emergency dispatchers.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = message.content[0];
    const summary = block.type === 'text' ? block.text.trim() : 'Emergency alert dispatched via SilentSOS.';

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[generate-summary] Error:', err);
    return new Response(JSON.stringify({ error: 'Summary generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
