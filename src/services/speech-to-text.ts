/**
 * speech-to-text.ts
 * ---------------------------------------------------------------------------
 * Turns a voice recording into text using Whisper (via the proxy or OpenAI).
 *
 * Pipeline: microphone -> .m4a file -> multipart upload -> transcript
 *
 * The file is uploaded straight from disk with expo-file-system. Reading it
 * through fetch().blob() produced an empty 14-byte body on Android.
 */

import * as FileSystem from "expo-file-system/legacy";
import { OPENAI_BASE_URL, STT_MODEL, proxyHeaders } from "@/constants/config";
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

  const info = await FileSystem.getInfoAsync(fileUri);
  console.log("[stt] file exists:", info.exists, "size:", info.exists ? info.size : 0);

  let result: FileSystem.FileSystemUploadResult;
  try {
    result = await FileSystem.uploadAsync(
      `${OPENAI_BASE_URL}/audio/transcriptions`,
      fileUri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: "audio/m4a",
        parameters: {
          model: STT_MODEL,
          language: language === "ar" ? "ar" : "en",
          prompt: "Transcribe exactly what the user said.",
        },
        headers: { ...proxyHeaders(), Authorization: `Bearer ${apiKey}` },
      }
    );
  } catch (err) {
    console.warn("[stt] network error:", String(err));
    throw new AgentError("Network request failed");
  }

  if (result.status < 200 || result.status >= 300) {
    console.warn("[stt] HTTP", result.status, result.body.slice(0, 500));
    throw new AgentError(`API error ${result.status}`);
  }

  const data = JSON.parse(result.body) as { text?: string };
  const text = (data.text ?? "").trim();
  if (!text) {
    console.warn("[stt] empty transcript:", result.body.slice(0, 300));
    throw new AgentError("Empty transcript");
  }
  return text;
}
