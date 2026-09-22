/**
 * useChat.ts
 * ---------------------------------------------------------------------------
 * The ORCHESTRATOR of the whole app. One hook owns the conversation:
 *
 *   1. Loads saved history + memory on startup.
 *   2. `send(text)` -> sanitize -> save -> call AI -> save reply -> speak.
 *   3. `sendVoice(uri)` -> Whisper transcription -> same pipeline.
 *   4. Saves new facts to long-term memory in the background.
 *
 * Screens only talk to this hook; they never call the APIs directly.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  type ChatMessage,
  appendMessage,
  addFact,
  getFacts,
  getProfile,
  loadHistory,
  clearHistory,
} from "@/services/memory";
import {
  AgentError,
  buildSystemPrompt,
  extractFacts,
  localRefusal,
  sendChat,
} from "@/services/ai";
import { transcribeAudio } from "@/services/speech-to-text";
import { speak } from "@/services/text-to-speech";
import { sanitizeTranscript, sanitizeUserInput } from "@/utils/sanitize";
import type { AppLanguage, Translations } from "@/i18n/translations";
import type { Settings } from "@/hooks/useSettings";

/** What the chat screen needs to render. */
export type ChatState = {
  messages: ChatMessage[];
  isThinking: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
};

export function useChat(settings: Settings, t: Translations) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  // ---- Load history + memory once on startup ----
  useEffect(() => {
    (async () => {
      const [history] = await Promise.all([loadHistory()]);
      setMessages(history);
    })();
  }, []);

  // ---- Speak an agent reply (if enabled) ----
  const speakReply = useCallback(
    async (text: string, language: AppLanguage) => {
      if (!settings.speakReplies || !text) return;
      speakingRef.current = true;
      setIsSpeaking(true);
      try {
        await speak(text, settings.voiceId, language);
      } catch {
        // Speaking is a bonus feature - never crash the chat over it.
      } finally {
        speakingRef.current = false;
        setIsSpeaking(false);
      }
    },
    [settings.speakReplies, settings.voiceId]
  );

  // ---- Core pipeline shared by typed and voice messages ----
  const runAgentTurn = useCallback(
    async (userText: string, language: AppLanguage) => {
      // 0. Local safety check (instant, works offline).
      const refusal = localRefusal(userText);
      if (refusal) {
        const refusalMsg = await appendMessage("assistant", refusal);
        setMessages(refusalMsg);
        void speakReply(refusal, language);
        return;
      }

      // 1. Show the "thinking" state and call the AI.
      setIsThinking(true);
      try {
        const [profile, facts, currentHistory] = await Promise.all([
          getProfile(),
          getFacts(),
          loadHistory(),
        ]);

        const systemPrompt = buildSystemPrompt(
          profile,
          facts,
          language,
          settings.memoryEnabled
        );

        const reply = await sendChat(currentHistory, systemPrompt);

        // 2. Save + show the reply.
        const updated = await appendMessage("assistant", reply);
        setMessages(updated);

        // 3. Extract memories in the background (never blocks the UI).
        if (settings.memoryEnabled) {
          extractFacts(currentHistory, language)
            .then((newFacts) =>
              Promise.all(newFacts.map((f) => addFact(f)))
            )
            .catch(() => undefined);
        }

        // 4. Speak the reply aloud (if enabled).
        void speakReply(reply, language);
      } catch (error) {
        const message =
          error instanceof AgentError && error.message.includes("API key")
            ? t.apiMissing
            : t.networkError;
        Alert.alert(t.chatTitle, message);
      } finally {
        setIsThinking(false);
      }
    },
    [settings.memoryEnabled, speakReply, t]
  );

  // ---- Public: send a typed message ----
  const send = useCallback(
    async (rawText: string) => {
      const text = sanitizeUserInput(rawText);
      if (!text) return; // nothing left after sanitizing

      const language = settings.language;

      // Save + show the user's message immediately (feels instant).
      const updated = await appendMessage("user", text);
      setMessages(updated);

      await runAgentTurn(text, language);
    },
    [settings.language, runAgentTurn]
  );

  // ---- Public: send a voice recording ----
  const sendVoice = useCallback(
    async (fileUri: string) => {
      setIsTranscribing(true);
      try {
        const transcript = await transcribeAudio(
          fileUri,
          settings.language
        );
        const clean = sanitizeTranscript(transcript);
        if (!clean) {
          Alert.alert(t.chatTitle, t.transcribeError);
          return;
        }

        // Show what the user said as their message.
        const updated = await appendMessage("user", clean);
        setMessages(updated);

        await runAgentTurn(clean, settings.language);
      } catch {
        Alert.alert(t.chatTitle, t.transcribeError);
      } finally {
        setIsTranscribing(false);
      }
    },
    [settings.language, runAgentTurn, t]
  );

  // ---- Public: clear the visible chat (memory stays) ----
  const resetChat = useCallback(async () => {
    await clearHistory();
    setMessages([]);
  }, []);

  // ---- Public: stop the agent from speaking ----
  const stopSpeakingNow = useCallback(async () => {
    const { stopSpeaking } = await import("@/services/text-to-speech");
    await stopSpeaking();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    messages,
    isThinking,
    isTranscribing,
    isSpeaking,
    send,
    sendVoice,
    resetChat,
    stopSpeakingNow,
  };
}
