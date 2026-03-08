export type AlertPayload = {
  userId: string;
  summary: string;
  emergencyType: string;
  severity: string;
  gpsLat: number;
  gpsLng: number;
  questions: string[];
  answers: boolean[];
  observations: string[];
};

export type AlertResult = {
  success: boolean;
  contactsNotified: string[];
  timestamp: string;
  error?: string;
};

export async function sendAlert(payload: AlertPayload): Promise<AlertResult> {
  try {
    const response = await fetch('/api/send-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Alert API error ${response.status}: ${text}`);
    }

    return await response.json();
  } catch (err) {
    return {
      success: false,
      contactsNotified: [],
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
