/**
 * speech-to-text.ts
 * ---------------------------------------------------------------------------
 * Turns a voice recording into text using OpenAI's Whisper API.
 *
 * Pipeline: microphone -> .m4a file -> Whisper API -> text
 *
 * Notes:
 * - OpenAI accepts files up to 25 MB (we cap recordings at 60s in config).
 * - `language` should be "en" or "ar". Passing it improves accuracy a lot.
 */

import { OPENAI_BASE_URL, STT_MODEL } from "@/constants/config";
import { getApiKey, AgentError } from "@/services/ai";

/**
 * Transcribe a recording file.
 * @param fileUri  local file URI from the recorder, e.g. file:///cache/rec.m4a
 * @param language "en" or "ar" (the app language is a good hint)
 */
export async function transcribeAudio(
  fileUri: string,
  language: "en" | "ar"
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AgentError("Missing API key");

  // --- 1. Read the recorded file as bytes (works on Android, iOS, web) ---
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  // --- 2. Build the multipart form that Whisper expects ---
  const form = new FormData();
  form.append("file", {
    uri: fileUri,
    name: "recording.m4a",
    type: blob.type || "audio/mp4",
  } as unknown as Blob);
  form.append("model", STT_MODEL);
  // Language hint: big accuracy boost for Arabic and English.
  form.append("language", language === "ar" ? "ar" : "en");
  form.append("prompt", "Transcribe exactly what the user said.");

  // --- 3. Send it to the API ---
  let response: Response;
  try {
    response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    throw new AgentError("Network request failed");
  }

  if (!response.ok) {
    throw new AgentError(`API error ${response.status}`);
  }

  const data = (await response.json()) as { text?: string };
  const text = (data.text ?? "").trim();
  if (!text) throw new AgentError("Empty transcript");
  return text;
}
