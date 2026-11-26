/**
 * useVoiceRecorder.ts
 * ---------------------------------------------------------------------------
 * Wraps expo-audio's recorder behind a tiny, easy-to-read API:
 *
 *   const { isRecording, start, stop } = useVoiceRecorder();
 *
 * - `start()`  asks for microphone permission (first time only), then records.
 * - `stop()`   stops and resolves with the recording file URI (or null).
 *
 * The HIGH_QUALITY preset produces an .m4a file - exactly what the
 * Whisper API wants.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { MAX_RECORDING_SECONDS } from "@/constants/config";

export function useVoiceRecorder() {
  // Metering on: lets us see the microphone level (silence = about -160 dB).
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef<number>(0);

  // Configure the audio session once (allows recording + playback).
  useEffect(() => {
    (async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch {
        // Non-fatal: recording may still work on most devices.
      }
    })();
    return () => {
      if (maxTimer.current) clearTimeout(maxTimer.current);
    };
  }, []);

  /** Ask permission (first time) and begin recording. Returns success. */
  const start = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) return false;

      // Re-enable recording right before each take. Playing a reply resets
      // the audio session, which otherwise leaves the mic silent (empty file).
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setIsRecording(true);
      levelTimer.current = setInterval(() => {
        const st = recorder.getStatus();
        console.log("[mic] level dB:", st.metering ?? "n/a", "t:", Date.now() - startedAt.current);
      }, 1000);

      // Safety: stop automatically after MAX_RECORDING_SECONDS.
      maxTimer.current = setTimeout(() => {
        void stop();
      }, MAX_RECORDING_SECONDS * 1000);

      return true;
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder]);

  /** Stop recording. Resolves with the file URI, or null on failure. */
  const stop = useCallback(async (): Promise<string | null> => {
    if (maxTimer.current) {
      clearTimeout(maxTimer.current);
      maxTimer.current = null;
    }
    if (levelTimer.current) {
      clearInterval(levelTimer.current);
      levelTimer.current = null;
    }
    if (!isRecording) return null;

    try {
      await recorder.stop();
      console.log(
        "[rec] stopped after ms:",
        Date.now() - startedAt.current,
        "uri:",
        recorder.uri ?? "none"
      );
      return recorder.uri ?? null;
    } catch {
      return null;
    } finally {
      setIsRecording(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder, isRecording]);

  return { isRecording, start, stop };
}
