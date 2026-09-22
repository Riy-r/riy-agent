/**
 * (tabs)/settings.tsx  -  SETTINGS SCREEN
 * ---------------------------------------------------------------------------
 * Everything the user can customize:
 *   - Language (English / العربية) - applies instantly, RTL flips live
 *   - Agent voice (natural online voices or offline device voices)
 *   - Speak replies on/off
 *   - Memory on/off
 *   - Danger zone: clear chat, forget everything
 *   - API key status (read-only, with instructions if missing)
 */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { useSettings } from "@/hooks/useSettings";
import { translations } from "@/i18n/translations";
import { VOICES, speak } from "@/services/text-to-speech";
import { getApiKey } from "@/services/ai";
import { clearAllMemory, clearHistory } from "@/services/memory";

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const t = translations[settings.language];
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [voiceModal, setVoiceModal] = useState(false);

  // Clears the chat messages via the memory service (the Settings screen
  // manages storage directly instead of going through the chat hook).
  const resetChat = useCallback(async () => {
    await clearHistory();
  }, []);

  // getApiKey reads process.env, which is inlined at build time. Re-check
  // whenever this screen opens.
  useEffect(() => {
    setHasApiKey(Boolean(getApiKey()));
  }, []);

  const rtl = settings.language === "ar";

  /** Bilingual confirm dialog helper. */
  const confirm = (message: string, onConfirm: () => void) =>
    Alert.alert(t.settingsTitle, message, [
      { text: t.cancel, style: "cancel" },
      { text: t.clear, style: "destructive", onPress: onConfirm },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ---------- Title ---------- */}
        <Text style={styles.pageTitle}>{t.settingsTitle}</Text>

        {/* ---------- Language ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.language}</Text>
          <View style={styles.rowPair}>
            <TouchableOpacity
              style={[
                styles.choice,
                settings.language === "en" && styles.choiceActive,
              ]}
              onPress={() => update({ language: "en" })}
            >
              <Text
                style={[
                  styles.choiceText,
                  settings.language === "en" && styles.choiceTextActive,
                ]}
              >
                {t.languageEn}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.choice,
                settings.language === "ar" && styles.choiceActive,
              ]}
              onPress={() => update({ language: "ar" })}
            >
              <Text
                style={[
                  styles.choiceText,
                  settings.language === "ar" && styles.choiceTextActive,
                ]}
              >
                {t.languageAr}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ---------- Voice ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.voice}</Text>
          <TouchableOpacity
            style={styles.rowCard}
            onPress={() => setVoiceModal(true)}
          >
            <Text style={styles.rowText}>
              {VOICES.find((v) => v.id === settings.voiceId)?.label ??
                VOICES[0]!.label}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
          </TouchableOpacity>

          <View style={styles.rowCard}>
            <Text style={styles.rowText}>{t.speakReplies}</Text>
            <Switch
              value={settings.speakReplies}
              onValueChange={(v) => update({ speakReplies: v })}
              trackColor={{ true: theme.primary, false: theme.border }}
              thumbColor={theme.text}
            />
          </View>

          {/* Instant voice test: speaks a sample sentence with the
              currently selected voice (no chat / API brain needed). */}
          <TouchableOpacity
            style={styles.rowCard}
            onPress={() =>
              void speak(t.voiceSample, settings.voiceId, settings.language)
            }
          >
            <Ionicons
              name="play-circle"
              size={20}
              color={theme.accent}
              style={{ marginRight: theme.sm }}
            />
            <Text style={[styles.rowText, { color: theme.accent }]}>
              {t.testVoice}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------- Memory ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.memory}</Text>
          <View style={styles.rowCard}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowText}>{t.memory}</Text>
              <Text style={styles.rowHint}>
                {settings.memoryEnabled ? t.memoryOn : t.memoryOff}
              </Text>
            </View>
            <Switch
              value={settings.memoryEnabled}
              onValueChange={(v) => update({ memoryEnabled: v })}
              trackColor={{ true: theme.primary, false: theme.border }}
              thumbColor={theme.text}
            />
          </View>

          <TouchableOpacity
            style={styles.rowCard}
            onPress={() => confirm(t.confirmClearChat, () => void resetChat())}
          >
            <Text style={[styles.rowText, styles.dangerText]}>
              {t.clearChat}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowCard}
            onPress={() =>
              confirm(t.confirmClearMemory, () => void clearAllMemory())
            }
          >
            <Text style={[styles.rowText, styles.dangerText]}>
              {t.clearMemory}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------- API key status ---------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.api}</Text>
          <View style={styles.rowCard}>
            <Ionicons
              name={hasApiKey ? "checkmark-circle" : "warning"}
              size={20}
              color={hasApiKey ? theme.accent : theme.warning}
              style={{ marginRight: theme.sm }}
            />
            <Text style={styles.rowHint}>
              {hasApiKey ? t.apiFound : t.apiMissing}
            </Text>
          </View>
        </View>

        <Text style={styles.footerNote}>{t.savedAutomatically}</Text>
      </ScrollView>

      {/* ---------- Voice picker modal ---------- */}
      <Modal visible={voiceModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t.voice}</Text>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.modalRow,
                  settings.voiceId === v.id && styles.modalRowActive,
                ]}
                onPress={() => {
                  update({ voiceId: v.id });
                  setVoiceModal(false);
                }}
              >
                <Text style={styles.rowText}>{v.label}</Text>
                {settings.voiceId === v.id && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setVoiceModal(false)}
            >
              <Text style={styles.modalCloseText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: theme.md, paddingBottom: 48 },

  pageTitle: {
    color: theme.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: theme.lg,
  },

  section: { marginBottom: theme.lg },
  sectionTitle: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: theme.sm,
  },

  rowPair: { flexDirection: "row", gap: theme.sm },
  choice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: "center",
  },
  choiceActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  choiceText: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
  choiceTextActive: { color: theme.text },

  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: theme.md,
    paddingVertical: 14,
    marginBottom: theme.sm,
  },
  rowTextWrap: { flex: 1, paddingRight: theme.sm },
  rowText: { flex: 1, color: theme.text, fontSize: 15 },
  rowHint: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  dangerText: { color: theme.danger },

  footerNote: {
    color: theme.textDim,
    fontSize: 12,
    textAlign: "center",
    marginTop: theme.sm,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: theme.radius * 1.5,
    borderTopRightRadius: theme.radius * 1.5,
    padding: theme.lg,
    gap: theme.xs,
  },
  modalTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: theme.sm,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: theme.sm,
    borderRadius: theme.radius,
  },
  modalRowActive: { backgroundColor: theme.primarySoft },
  modalClose: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: theme.sm,
  },
  modalCloseText: { color: theme.primary, fontSize: 15, fontWeight: "600" },
});
