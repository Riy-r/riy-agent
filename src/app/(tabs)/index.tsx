/**
 * (tabs)/index.tsx  -  THE CHAT SCREEN
 * ---------------------------------------------------------------------------
 * The heart of the app. Layout top to bottom:
 *
 *   [ header: agent name + memory/speaker status icons ]
 *   [ message list (auto-scrolls to the newest)          ]
 *   [ typing / transcribing indicator                    ]
 *   [ text input  +  BIG microphone button               ]
 *
 * Data flow: this screen renders what `useChat` gives it and forwards
 * user actions back into the hook. All AI logic lives in the hook/services.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";
import { useChat } from "@/hooks/useChat";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { translations } from "@/i18n/translations";
import { MessageBubble } from "@/components/MessageBubble";
import { MicButton } from "@/components/MicButton";

export default function ChatScreen() {
  const { settings, update } = useSettings();
  const t = translations[settings.language];

  // Inlined at build time; null = user hasn't added a key yet.
  const hasApiKey = Boolean(process.env.EXPO_PUBLIC_OPENAI_API_KEY);

  const {
    messages,
    isThinking,
    isTranscribing,
    isSpeaking,
    send,
    sendVoice,
    stopSpeakingNow,
  } = useChat(settings, t);

  const { isRecording, start, stop } = useVoiceRecorder();

  const [draft, setDraft] = useState("");
  const listRef = useRef<ScrollView>(null);

  // Auto-scroll to the newest message whenever the list grows.
  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isThinking, isTranscribing]);

  /** Mic button pressed: start recording, or stop + send the recording. */
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      const uri = await stop();
      if (uri) void sendVoice(uri);
    } else {
      const ok = await start();
      if (!ok) Alert.alert(t.micPermissionTitle, t.micPermissionBody);
    }
  }, [isRecording, start, stop, sendVoice, t]);

  /** Send button pressed: ship the typed text. */
  const handleSendText = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await send(text);
  }, [draft, send]);

  const isEmpty = useMemo(
    () => messages.length === 0 && !isThinking && !isTranscribing,
    [messages.length, isThinking, isTranscribing]
  );

  const busy = isThinking || isTranscribing;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* ---------- Header ---------- */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={20} color={theme.text} />
            </View>
            <View>
              <Text style={styles.title}>{t.chatTitle}</Text>
              <Text style={styles.subtitle}>
                {isRecording
                  ? t.listening
                  : busy
                    ? isTranscribing
                      ? t.transcribing
                      : t.thinking
                    : t.holdToTalk}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Speaker icon: tap to mute/stop current speech */}
            <TouchableOpacity
              onPress={stopSpeakingNow}
              style={styles.iconButton}
              accessibilityLabel={t.stop}
            >
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-mute"}
                size={20}
                color={isSpeaking ? theme.accent : theme.textDim}
              />
            </TouchableOpacity>
            {/* Gear icon: jump to Settings */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/settings")}
              style={styles.iconButton}
              accessibilityLabel={t.settingsTab}
            >
              <Ionicons name="settings-outline" size={20} color={theme.textDim} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ---------- Messages ---------- */}
        <ScrollView
          ref={listRef}
          style={styles.flex}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {isEmpty ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t.emptyChatTitle}</Text>
              <Text style={styles.emptyBody}>{t.emptyChatBody}</Text>
            </View>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}

          {isThinking && (
            <View style={styles.thinking}>
              <TypingDots />
            </View>
          )}
        </ScrollView>

        {/* ---------- API key banner (hidden once a key exists) ---------- */}
        {!hasApiKey && (
          <Pressable
            style={({ pressed }) => [
              styles.banner,
              pressed && styles.bannerPressed,
            ]}
            onPress={() => Alert.alert(t.chatTitle, t.apiBanner)}
          >
            <Ionicons name="key" size={16} color={theme.warning} />
            <Text style={styles.bannerText}>{t.apiBanner}</Text>
          </Pressable>
        )}

        {/* ---------- Composer ---------- */}
        <View style={styles.composer}>
          <TextInput
            style={[
              styles.input,
              settings.language === "ar" ? styles.inputRtl : styles.inputLtr,
            ]}
            placeholder={t.inputPlaceholder}
            placeholderTextColor={theme.textDim}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!busy}
            maxLength={4000}
          />

          {/* Talk-back toggle: tap to mute/unmute spoken replies */}
          <TouchableOpacity
            onPress={() =>
              update({ speakReplies: !settings.speakReplies })
            }
            style={[
              styles.sendButton,
              styles.muteButton,
              !settings.speakReplies && styles.muteButtonOff,
            ]}
            accessibilityLabel={t.speakReplies}
          >
            <Ionicons
              name={settings.speakReplies ? "volume-high" : "volume-mute"}
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendText}
            disabled={!draft.trim() || busy}
            style={[
              styles.sendButton,
              (!draft.trim() || busy) && styles.sendDisabled,
            ]}
            accessibilityLabel={t.send}
          >
            <Ionicons name="arrow-up" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* ---------- Big microphone ---------- */}
        <View style={styles.micArea}>
          <MicButton
            recording={isRecording}
            busy={busy}
            onPress={handleMicPress}
          />
          <Text style={styles.micHint}>
            {isRecording ? t.stop : t.holdToTalk}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Three bouncing dots for the "thinking" state. */
function TypingDots() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 3), 350);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.dot, frame === i && styles.dotActive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.md,
    paddingVertical: theme.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: theme.sm },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: theme.text, fontSize: 16, fontWeight: "700" },
  subtitle: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: theme.xs },
  iconButton: { padding: theme.sm },

  // Messages
  list: { paddingVertical: theme.md, paddingHorizontal: theme.xs },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: theme.lg },
  emptyTitle: { color: theme.text, fontSize: 24, fontWeight: "700" },
  emptyBody: {
    color: theme.textDim,
    fontSize: 14,
    textAlign: "center",
    marginTop: theme.sm,
    lineHeight: 21,
  },
  thinking: {
    alignSelf: "flex-start",
    marginLeft: theme.sm,
    marginBottom: theme.sm,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: theme.bubbleAgent,
    paddingHorizontal: theme.md,
    paddingVertical: theme.sm + 4,
    borderRadius: theme.radius,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.textDim,
    opacity: 0.35,
  },
  dotActive: { backgroundColor: theme.primary, opacity: 1 },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.sm,
    paddingHorizontal: theme.md,
    paddingTop: theme.sm,
    backgroundColor: theme.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    paddingHorizontal: theme.md,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputRtl: { writingDirection: "rtl", textAlign: "right" },
  inputLtr: { writingDirection: "ltr", textAlign: "left" },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radiusFull,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.4 },
  muteButton: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, width: 44, height: 44 },
  muteButtonOff: { opacity: 0.45 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.sm,
    marginHorizontal: theme.md,
    marginTop: theme.sm,
    padding: theme.sm,
    borderRadius: theme.radius,
    backgroundColor: "rgba(255,176,32,0.12)",
    borderWidth: 1,
    borderColor: theme.warning,
  },
  bannerPressed: { opacity: 0.7 },
  bannerText: { flex: 1, color: theme.text, fontSize: 12, lineHeight: 17 },

  // Mic area
  micArea: {
    alignItems: "center",
    paddingTop: theme.sm,
    paddingBottom: theme.md + 2,
    backgroundColor: theme.bg,
  },
  micHint: {
    color: theme.textDim,
    fontSize: 11,
    marginTop: 6,
  },
});
