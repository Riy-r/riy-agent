/**
 * (tabs)/memories.tsx  -  "WHAT I REMEMBER" SCREEN
 * ---------------------------------------------------------------------------
 * A read-only view of everything the agent has stored locally:
 *   - Your profile (name + preferences)
 *   - Facts it picked up from conversations
 *   - A button to wipe everything
 *
 * No network calls here - this is pure AsyncStorage, so it works offline
 * and can't fail on a bad API key.
 *
 * RTL note: the app already mirrors the whole UI at the OS level when the
 * language is Arabic (see useDirection / I18nManager.forceRTL), so this
 * screen needs no manual row-reverse/text-align tricks - layout mirrors
 * itself automatically, just like the Chat and Settings screens.
 */

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getProfile,
  getFacts,
  deleteFact,
  clearAllMemory,
  type MemoryProfile,
  type MemoryFact,
} from "@/services/memory";
import { useSettings } from "@/hooks/useSettings";
import { translations } from "@/i18n/translations";
import { theme } from "@/constants/theme";

export default function MemoriesScreen() {
  const { settings } = useSettings();
  const t = translations[settings.language];

  const [profile, setProfile] = useState<MemoryProfile | null>(null);
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload every time the tab comes into focus. Cheap (local reads)
  // and means the screen is never stale after a chat that added facts.
  const load = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([getProfile(), getFacts()]);
      setProfile(p);
      setFacts(f);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleDeleteFact = useCallback(async (id: string) => {
    // Optimistic: remove from the UI immediately, then persist.
    setFacts((prev) => prev.filter((f) => f.id !== id));
    await deleteFact(id);
  }, []);

  // The clear-all dialog has its own dedicated copy (clearer than
  // reusing the Settings strings).
  const handleClearAll = useCallback(() => {
    Alert.alert(t.memoriesClearTitle, t.memoriesClearBody, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.memoriesClearConfirm,
        style: "destructive",
        onPress: () => {
          void clearAllMemory();
          setProfile(null);
          setFacts([]);
        },
      },
    ]);
  }, [t]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  const hasAnything =
    !!profile?.name ||
    (profile?.preferences?.length ?? 0) > 0 ||
    facts.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t.memoriesTitle}</Text>

        {!hasAnything && (
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={40} color={theme.textDim} />
            <Text style={styles.emptyText}>{t.memoriesEmpty}</Text>
          </View>
        )}

        {!!profile?.name && (
          <Section title={t.memoriesName}>
            <Text style={styles.value}>{profile.name}</Text>
          </Section>
        )}

        {(profile?.preferences?.length ?? 0) > 0 && (
          <Section title={t.memoriesPreferences}>
            {profile!.preferences.map((pref, i) => (
              <Text key={i} style={styles.value}>
                • {pref}
              </Text>
            ))}
          </Section>
        )}

        {facts.length > 0 && (
          <Section title={t.memoriesFacts}>
            {facts.map((fact) => (
              <View key={fact.id} style={styles.factRow}>
                <Text style={[styles.value, styles.factText]}>{fact.text}</Text>
                <Pressable
                  onPress={() => void handleDeleteFact(fact.id)}
                  hitSlop={12}
                  style={styles.deleteBtn}
                  accessibilityLabel={t.clear}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.textDim}
                  />
                </Pressable>
              </View>
            ))}
          </Section>
        )}

        {hasAnything && (
          <Pressable
            onPress={handleClearAll}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
            <Text style={styles.clearText}>{t.memoriesClearAll}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Small presentational helper - keeps the main component readable.
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
  },
  scroll: { padding: theme.md, paddingBottom: theme.xl * 2 },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.text,
    marginBottom: theme.lg,
  },

  section: { marginBottom: theme.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.sm,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: theme.md,
    gap: theme.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  value: { fontSize: 16, color: theme.text, lineHeight: 22 },

  factRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.sm,
  },
  factText: { flex: 1 },
  deleteBtn: { paddingTop: 2 },

  empty: {
    alignItems: "center",
    gap: theme.sm,
    paddingVertical: theme.xl,
  },
  emptyText: {
    fontSize: 15,
    color: theme.textDim,
    textAlign: "center",
    lineHeight: 22,
  },

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.sm,
    marginTop: theme.lg,
    paddingVertical: theme.md,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.danger,
  },
  clearText: { color: theme.danger, fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.6 },
});
