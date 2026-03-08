# 🆘 SilentSOS

Emergency response app for people who cannot speak or type.
Built for the **Google Cloud + Gemini Live API Hackathon — Live Agent Track**.

---

## How It Works

1. User taps the **SOS button** — camera activates silently
2. **Gemini Live API** streams the camera in real-time and asks yes/no questions
3. User answers by **nodding their head** or tapping YES/NO buttons
4. AI generates a structured **emergency summary**
5. **Twilio** sends SMS to all emergency contacts with GPS location + medical info

Total time from tap to SMS: **under 10 seconds**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Primary AI Agent** | Gemini Live API (`gemini-2.0-flash-live-001`) |
| **Agent SDK** | Google GenAI SDK (`@google/genai`) — ADK pattern |
| **Vision Fallback** | Gemini Flash one-shot → Claude Vision |
| **Summary** | Claude (`claude-sonnet-4-20250514`) via Anthropic SDK |
| **Gesture Detection** | expo-sensors Accelerometer (MediaPipe-ready interface) |
| **Alerts** | Twilio SMS |
| **Database** | Supabase (user profiles, contacts, alert logs) |
| **App** | React Native + Expo + expo-router |

---

## Agent Architecture (ADK Pattern)

```
SOS Tap
  │
  ▼
SilentSOSAgent.runEmergencyFlow(tools)   ← lib/adk-agent.ts
  │
  ├── captureFrame() tool   → camera base64
  ├── getGPS() tool         → coordinates
  │
  ├── Gemini Live Session   → startLiveSession()  ← lib/gemini.ts
  │     │
  │     ├── sendFrame() → streaming question
  │     └── [if fails] → Gemini one-shot → Claude fallback
  │
  ├── onQuestion() tool     → updates EmergencyContext → dialogue.tsx re-renders
  ├── onAnswer() tool       → awaits Promise resolved by YES/NO tap or head nod
  │
  ├── generateEmergencySummary()  ← Claude via API route
  └── sendAlert()                 ← Twilio SMS + Supabase log
```

---

## Setup

```bash
# Install dependencies
npm install

# Copy and fill in API keys
cp .env.example .env

# Run Supabase migration
# Open supabase/migrations/001_initial_schema.sql in your Supabase SQL Editor

# Start the app
npx expo start
```

### Required API Keys

| Key | Where to get it |
|---|---|
| `GOOGLE_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `SUPABASE_URL` + keys | [supabase.com](https://supabase.com) → your project settings |
| `TWILIO_*` | [console.twilio.com](https://console.twilio.com) |

---

## Target Users

People with **autism**, **ALS**, **hearing impairments**, or any condition that prevents speaking or typing during an emergency. Serves 70M+ non-verbal individuals globally.

---

## Fallback Chain

The app **always** gets help dispatched, even if AI services fail:

```
Gemini Live  →  Gemini one-shot  →  Claude Vision  →  Static fallback questions
```

---

## Demo Script (2:30)

| Time | Action |
|---|---|
| 0:00 | "For 70M non-verbal people, emergencies are 3x slower to resolve." |
| 0:20 | Show single SOS button. Tap it. |
| 0:40 | Camera activates. Hold up symbol card. Gemini identifies it. |
| 1:10 | Yes/No questions appear. Nod head. Show gesture detection. |
| 1:40 | "Help is on the way." Show SMS that lands on demo phone. |
| 2:00 | "Gemini Live, ADK, Twilio — under 10 seconds." |
| 2:20 | "SilentSOS — because everyone deserves a voice." |
