/**
 * POST /api/transcribe
 * Proxies Google Cloud Speech-to-Text server-side so GOOGLE_API_KEY
 * never needs to be exposed in the client bundle.
 *
 * Accepts: { audioBase64: string }
 * Returns: { transcript: string }
 */

export async function POST(request: Request): Promise<Response> {
  try {
    const { audioBase64 }: { audioBase64: string } = await request.json();

    const apiKey = process.env.GOOGLE_API_KEY ?? '';
    if (!apiKey) {
      return new Response(JSON.stringify({ transcript: '' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            model: 'command_and_search',
            useEnhanced: true,
          },
          audio: { content: audioBase64 },
        }),
      }
    );

    if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
    const data = await res.json();
    const transcript: string = data.results?.[0]?.alternatives?.[0]?.transcript ?? '';

    return new Response(JSON.stringify({ transcript: transcript.trim() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[transcribe] Error:', err);
    return new Response(JSON.stringify({ transcript: '' }), {
      status: 200, // always 200 — empty transcript triggers tap-to-answer fallback
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
