/**
 * text-to-speech.ts
 * ---------------------------------------------------------------------------
 * Makes the agent TALK. Two engines:
 *
 *   1. "openai" - natural, human-like voices from the OpenAI TTS API.
 *                 The reply is downloaded as an audio file and played
 *                 with expo-audio. Needs internet + API credit.
 *   2. "device" - free offline device voice via expo-speech.
 *                 Lower quality but zero cost, works without internet.
 *
 * The user picks the voice on the Settings screen (see VOICES below).
 */

import * as FileSystem from "expo-file-system/legacy";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import { OPENAI_BASE_URL, TTS_MODEL } from "@/constants/config";
import { getApiKey, AgentError } from "@/services/ai";
import { isArabic } from "@/utils/sanitize";

// ---------------------------------------------------------------------------
// Voice catalogue (shown on the Settings screen)
// ---------------------------------------------------------------------------

export type TtsEngine = "openai" | "device";

export type VoiceOption = {
  id: string; // value stored in settings
  label: string; // what the user sees
  engine: TtsEngine;
  /** Only used by the OpenAI engine. */
  openaiVoice?: string;
  /** Optional tone instruction for OpenAI voices. */
  style?: string;
  /** 0.5 - 2.0 speaking rate for the device engine. */
  deviceRate?: number;
  /** 0.5 - 2.0 pitch for the device engine. */
  devicePitch?: number;
};

export const VOICES: VoiceOption[] = [
  // --- Natural OpenAI voices (online, uses API credit) ---
  {
    id: "openai-coral",
    label: "Coral · natural",
    engine: "openai",
    openaiVoice: "coral",
    style: "Speak in a warm, friendly, upbeat tone.",
  },
  {
    id: "openai-alloy",
    label: "Alloy · natural",
    engine: "openai",
    openaiVoice: "alloy",
    style: "Speak in a neutral, clear tone.",
  },
  {
    id: "openai-sage",
    label: "Sage · natural",
    engine: "openai",
    openaiVoice: "sage",
    style: "Speak in a calm, thoughtful tone.",
  },
  {
    id: "openai-verse",
    label: "Verse · natural",
    engine: "openai",
    openaiVoice: "verse",
    style: "Speak in a expressive, lively tone.",
  },
  // --- Free offline device voices ---
  {
    id: "device-female",
    label: "Device · female (offline)",
    engine: "device",
    deviceRate: 1.0,
    devicePitch: 1.15,
  },
  {
    id: "device-male",
    label: "Device · male (offline)",
    engine: "device",
    deviceRate: 1.0,
    devicePitch: 0.85,
  },
];

/** Look up a voice by id, with a safe fallback. */
export function getVoiceById(id: string): VoiceOption {
  return VOICES.find((v) => v.id === id) ?? VOICES[0]!;
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/** Speak `text` with the chosen voice. Resolves when playback finishes. */
export async function speak(
  text: string,
  voiceId: string,
  language: "en" | "ar"
): Promise<void> {
  if (!text.trim()) return;
  const voice = getVoiceById(voiceId);

  if (voice.engine === "device") {
    await speakWithDevice(text, language, voice);
  } else {
    await speakWithOpenAI(text, language, voice);
  }
}

/** Stop any speech (both engines) immediately. */
export async function stopSpeaking(): Promise<void> {
  try {
    Speech.stop();
  } catch {
    // ignore - stopping is best-effort
  }
  stopOpenAI();
}

// ---------------------------------------------------------------------------
// Engine 1: device voice (offline, free)
// ---------------------------------------------------------------------------

async function speakWithDevice(
  text: string,
  language: "en" | "ar",
  voice: VoiceOption
): Promise<void> {
  await Speech.stop();
  Speech.speak(text, {
    language: language === "ar" ? "ar" : "en-US",
    pitch: voice.devicePitch ?? 1.0,
    rate: voice.deviceRate ?? 1.0,
    // Note: onDone fires when the sentence finishes; we don't need it here.
  });
}

// ---------------------------------------------------------------------------
// Engine 2: OpenAI natural voices (online)
// ---------------------------------------------------------------------------

/** Singleton player so repeated replies never overlap or leak memory. */
let openaiPlayer: ReturnType<typeof createAudioPlayer> | null = null;

function stopOpenAI(): void {
  if (openaiPlayer) {
    try {
      openaiPlayer.release();
    } catch {
      // ignore
    }
    openaiPlayer = null;
  }
}

async function speakWithOpenAI(
  text: string,
  language: "en" | "ar",
  voice: VoiceOption
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AgentError("Missing API key");

  stopOpenAI(); // never overlap two replies

  const body = {
    model: TTS_MODEL,
    voice: voice.openaiVoice ?? "coral",
    input: text,
    instructions:
      voice.style ??
      (language === "ar"
        ? "Speak in Arabic with a clear, warm tone."
        : "Speak in a friendly, clear tone."),
    // "aac" plays natively on both Android and iOS via expo-audio.
    response_format: "aac",
  };

  let response: Response;
  try {
    response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AgentError("Network request failed");
  }

  if (!response.ok) {
    throw new AgentError(`API error ${response.status}`);
  }

  // The API returns raw audio bytes -> encode base64 -> save to a cache file.
  const arrayBuffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const CHUNK = 8192; // avoid stack overflow on big files
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const base64 = globalThis.btoa(binary);

  // Cache directory: the OS may delete these files when storage is low. Good.
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new AgentError("No cache directory");
  const fileUri = `${dir}tts-${Date.now()}.aac`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Configure audio: keep playing even if the device ringer is on silent.
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // ignore - non-fatal
  }

  // Play! Resolve when the audio finishes (or after a generous timeout).
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    openaiPlayer = createAudioPlayer({ uri: fileUri });
    openaiPlayer.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) finish();
    });

    // Safety timeout: never leave the UI "speaking" forever.
    const estimatedMs = Math.max(4000, text.length * 120);
    const timer = setTimeout(finish, estimatedMs + 30000);

    openaiPlayer.play();
    void timer; // timer cleared implicitly when player is released
  });

  stopOpenAI(); // release the player after playback
}
