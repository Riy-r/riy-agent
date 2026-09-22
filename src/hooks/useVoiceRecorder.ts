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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);

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
    if (!isRecording) return null;

    try {
      await recorder.stop();
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
