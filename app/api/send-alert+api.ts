/**
 * POST /api/send-alert
 * Accepts: { userId, summary, emergencyType, severity, gpsLat, gpsLng }
 * Returns: { success, contactsNotified, timestamp }
 */

import { createClient } from '@supabase/supabase-js';

const TWILIO_CONFIGURED =
  !!process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' &&
  !!process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_AUTH_TOKEN !== 'your_auth_token_here';

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? '';

const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
);

type AlertRequest = {
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

async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!TWILIO_CONFIGURED) {
    console.log('[send-alert] Twilio not configured — skipping SMS to', to);
    return false;
  }
  // Lazy-load twilio only when credentials are present
  const twilio = (await import('twilio')).default;
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    await twilioClient.messages.create({ from: FROM_NUMBER, to, body });
    return true;
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      await twilioClient.messages.create({ from: FROM_NUMBER, to, body });
      return true;
    } catch {
      return false;
    }
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { userId, summary, emergencyType, severity, gpsLat, gpsLng, questions, answers, observations }: AlertRequest = await request.json();

    // 1. Fetch user profile
    const { data: user } = await supabase
      .from('users')
      .select('name, conditions, medications')
      .eq('id', userId)
      .single();

    // 2. Fetch emergency contacts
    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('name, phone')
      .eq('user_id', userId);

    const contactList = contacts ?? [];
    const mapsLink = `https://maps.google.com/?q=${gpsLat},${gpsLng}`;
    const userName = user?.name ?? 'SilentSOS User';
    const conditions = (user?.conditions ?? []).join(', ') || 'none listed';
    const medications = (user?.medications ?? []).join(', ') || 'none listed';

    // Build confirmed Q&A lines (only answered questions)
    const qaLines = (questions ?? [])
      .map((q, i) => `  • ${q.replace(/\?$/, '')}: ${answers?.[i] ? 'YES ✓' : 'NO ✗'}`)
      .join('\n');

    // Top 2 scene observations (keep SMS concise)
    const sceneLines = (observations ?? []).slice(0, 2).join('. ');

    const severityLabel = severity === 'critical' ? '🔴 CRITICAL' : severity === 'high' ? '🟡 HIGH' : '🔵 MEDIUM';

    const messageBody = [
      `🆘 SilentSOS EMERGENCY ALERT`,
      `👤 ${userName} needs help NOW`,
      ``,
      `🚨 ${emergencyType.toUpperCase()} — ${severityLabel}`,
      ``,
      qaLines ? `✅ CONFIRMED BY PATIENT:\n${qaLines}` : '',
      sceneLines ? `\n👁 SCENE: ${sceneLines}` : '',
      ``,
      `📍 LOCATION (tap to navigate):\n${mapsLink}`,
      ``,
      `💊 CONDITIONS: ${conditions}`,
      `    MEDS: ${medications}`,
      ``,
      `📋 SUMMARY: ${summary}`,
      ``,
      `⚡ This person CANNOT SPEAK — call 911 immediately`,
      `Sent by SilentSOS app`,
    ].filter(Boolean).join('\n');

    // 3. Send SMS in parallel to all contacts (never throw)
    const results = await Promise.all(
      contactList.map(async (contact) => {
        const success = await sendSMS(contact.phone, messageBody);
        return { name: contact.name, phone: contact.phone, success };
      })
    );

    const contactsNotified = results
      .filter((r) => r.success)
      .map((r) => `${r.name} (${r.phone})`);

    const timestamp = new Date().toISOString();

    // 4. Log alert to Supabase
    await supabase.from('alert_logs').insert({
      user_id: userId,
      scene_description: summary,
      summary,
      gps_lat: gpsLat,
      gps_lng: gpsLng,
      timestamp,
      contacts_notified: contactsNotified,
      emergency_type: emergencyType,
      severity,
    });

    return new Response(
      JSON.stringify({ success: true, contactsNotified, timestamp }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-alert] Error:', err);
    return new Response(
      JSON.stringify({ success: false, contactsNotified: [], timestamp: new Date().toISOString(), error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
