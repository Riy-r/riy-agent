/**
 * config.ts
 * ---------------------------------------------------------------------------
 * Central place for model names and API settings.
 *
 * IMPORTANT - about the API key:
 * The key itself is NEVER written in this file. It is read from the
 * environment variable `EXPO_PUBLIC_OPENAI_API_KEY` (see services/api.ts).
 *
 * For a beginner:
 *   1. Copy `.env.example` to a new file named `.env`
 *   2. Paste your key after the `=` sign:
 *        EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-key...
 *   3. Restart the dev server (env vars are only read at startup).
 *
 * In Expo, only variables prefixed with EXPO_PUBLIC_ are visible to the app.
 */

// ---- The agent "brain" (fast, cheap, multilingual: English + Arabic) ----
export const CHAT_MODEL = "openai/gpt-oss-120b";

// ---- Speech-to-text model (turns your voice recording into text) ----
export const STT_MODEL = "whisper-large-v3";

// ---- Text-to-speech model (makes the agent talk back) ----
export const TTS_MODEL = "gpt-4o-mini-tts";

// ---- OpenAI API endpoints ----
// If EXPO_PUBLIC_API_PROXY_URL is set (see server/README.md), requests go to
// your own proxy, which holds the real key. The proxy URL is not a secret.
export const OPENAI_BASE_URL = process.env.EXPO_PUBLIC_API_PROXY_URL
  ? `${process.env.EXPO_PUBLIC_API_PROXY_URL.replace(/\/$/, "")}/v1`
  : "https://api.openai.com/v1";

// Must match PROXY_TOKEN on the server, if the server sets one.
const PROXY_TOKEN = process.env.EXPO_PUBLIC_API_PROXY_TOKEN || "";

/** Extra header the proxy needs when PROXY_TOKEN is set. Empty otherwise. */
export function proxyHeaders(): Record<string, string> {
  return PROXY_TOKEN ? { "x-proxy-token": PROXY_TOKEN } : {};
}

// ---- How many recent messages we send as short-term context ----
// (10 recent messages is a good balance of quality vs. token cost)
export const CONTEXT_WINDOW = 10;

// ---- Hard cap on the stored chat history (oldest messages are dropped) ----
export const MAX_HISTORY = 200;

// ---- Recording limits ----
export const MAX_RECORDING_SECONDS = 60; // OpenAI accepts up to 25 MB files
