/**
 * _layout.tsx  -  ROOT LAYOUT
 * ---------------------------------------------------------------------------
 * Wraps the whole app. Responsibilities:
 *   1. Load settings from storage BEFORE showing any screen.
 *   2. Apply RTL layout direction when the language is Arabic.
 *      Changing direction at runtime requires a reload - handled in
 *      useDirection.ts with a friendly one-time reload.
 */

import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { SettingsProvider, useSettings } from "@/hooks/useSettings";
import { useDirection } from "@/hooks/useDirection";

/**
 * RootLayout: wraps the app in the shared SettingsProvider, then renders
 * the navigation stack once settings are loaded.
 */
export default function RootLayout() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

function AppShell() {
  const { settings, ready } = useSettings();
  useDirection(settings.language);

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
  },
});
