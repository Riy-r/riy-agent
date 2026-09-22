/**
 * +not-found.tsx
 * ---------------------------------------------------------------------------
 * Shown if someone opens a route that doesn't exist (rare in this app).
 * A friendly fallback instead of a blank screen.
 */

import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { theme } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.subtitle}>الصفحة غير موجودة</Text>
      <Link href="/" style={styles.link}>
        Go to chat / اذهب إلى المحادثة
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
    gap: theme.sm,
  },
  title: { color: theme.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: theme.textDim, fontSize: 16 },
  link: { color: theme.primary, fontSize: 15, marginTop: theme.md },
});
