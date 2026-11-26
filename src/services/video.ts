/**
 * video.ts
 * ---------------------------------------------------------------------------
 * Creates a short video from a text description with Gemini Omni Flash.
 *
 * The request goes through the proxy (server/proxy.mjs), which adds the
 * Gemini key on the server. The app never holds that key.
 *
 * The video comes back as base64 MP4 data and is saved to the app cache.
 */

import * as FileSystem from "expo-file-system/legacy";
import { VIDEO_MODEL, proxyHeaders } from "@/constants/config";
import { AgentError } from "@/services/ai";

type VideoPart = { type?: string; data?: string };
type InteractionResponse = {
  output_video?: { data?: string };
  steps?: { type?: string; content?: VideoPart[] }[];
};

/** Find the base64 video bytes in the response, whichever shape it uses. */
function findVideoBase64(response: InteractionResponse): string | null {
  if (response.output_video?.data) return response.output_video.data;
  for (const step of response.steps ?? []) {
    for (const part of step.content ?? []) {
      if (part.type === "video" && part.data) return part.data;
    }
  }
  return null;
}

/** Generate a video for `prompt`. Resolves with a local file URI (MP4). */
export async function generateVideo(prompt: string): Promise<string> {
  const proxy = process.env.EXPO_PUBLIC_API_PROXY_URL?.replace(/\/$/, "");
  // Without the proxy the app would need the Gemini key itself, so refuse.
  if (!proxy) throw new AgentError("Missing API key");

  let response: Response;
  try {
    response = await fetch(`${proxy}/v1beta/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...proxyHeaders() },
      body: JSON.stringify({
        model: VIDEO_MODEL,
        input: prompt,
        response_format: { type: "video", aspect_ratio: "16:9", resolution: "720p" },
        store: false,
        background: false,
        stream: false,
      }),
    });
  } catch (err) {
    console.warn("[video] network error:", String(err));
    throw new AgentError("Network request failed");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[video] HTTP", response.status, detail.slice(0, 500));
    throw new AgentError(`API error ${response.status}`);
  }

  const data = (await response.json()) as InteractionResponse;
  const base64 = findVideoBase64(data);
  if (!base64) {
    console.warn("[video] no video in response:", JSON.stringify(data).slice(0, 500));
    throw new AgentError("No video returned");
  }

  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new AgentError("No cache directory");
  const fileUri = `${dir}video-${Date.now()}.mp4`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}
