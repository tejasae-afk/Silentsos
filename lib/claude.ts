import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

export type SceneAnalysis = {
  emergencyType: 'medical' | 'fire' | 'crime' | 'accident' | 'unknown';
  severity: 'critical' | 'high' | 'medium';
  observations: string[];
  symbolCardsDetected: string[];
  writtenNotesText: string;
  suggestedQuestions: string[];
  initialSummary: string;
};

export type UserProfileInput = {
  conditions: string[];
  medications: string[];
};

const FALLBACK_QUESTIONS = [
  'Are you in physical pain right now?',
  'Is there fire or smoke nearby?',
  'Is someone threatening or hurting you?',
  'Do you need an ambulance?',
  'Are you at your home address?',
];

export async function analyzeScene(
  imageUri: string,
  userProfile: UserProfileInput
): Promise<SceneAnalysis> {
  try {
    const base64 = await readAsStringAsync(imageUri, {
      encoding: EncodingType.Base64,
    });

    const response = await fetch('/api/analyze-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, userProfile }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch {
    // Fallback: return a generic SceneAnalysis so help can still be dispatched
    return {
      emergencyType: 'unknown',
      severity: 'high',
      observations: ['Camera analysis unavailable — using fallback questions'],
      symbolCardsDetected: [],
      writtenNotesText: '',
      suggestedQuestions: FALLBACK_QUESTIONS,
      initialSummary: 'User triggered SilentSOS emergency alert. Scene analysis failed — dispatching based on manual responses.',
    };
  }
}

export async function generateEmergencySummary(
  sceneAnalysis: SceneAnalysis,
  answers: boolean[]
): Promise<string> {
  try {
    const response = await fetch('/api/generate-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneAnalysis, answers }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.summary;
  } catch {
    const yesAnswers = sceneAnalysis.suggestedQuestions
      .filter((_, i) => answers[i])
      .join(', ');
    return `Emergency alert from SilentSOS. Type: ${sceneAnalysis.emergencyType}. Severity: ${sceneAnalysis.severity}. ${sceneAnalysis.initialSummary} User confirmed: ${yesAnswers || 'no specific details'}.`;
  }
}
