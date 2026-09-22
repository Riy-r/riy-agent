/**
 * useDirection.ts
 * ---------------------------------------------------------------------------
 * Keeps the OS-level layout direction (LTR/RTL) in sync with the chosen
 * language.
 *
 * Important React Native detail: flipping RTL requires an app reload.
 * We do it automatically ONCE right after the user changes the language,
 * so the whole UI (tab bar, headers, scroll directions) mirrors correctly.
 *
 * Per-message text direction is handled separately in MessageBubble
 * (each bubble checks its own text), so mixed Arabic/English chats
 * still render correctly even before a reload.
 */

import { useEffect, useRef } from "react";
import { I18nManager } from "react-native";
import type { AppLanguage } from "@/i18n/translations";

export function useDirection(language: AppLanguage) {
  // Remember the first language we see, so we only reload when the
  // user actually CHANGES it (not on every app start).
  const initial = useRef<AppLanguage>(language);

  useEffect(() => {
    I18nManager.allowRTL(true);

    const wantRtl = language === "ar";
    if (I18nManager.isRTL !== wantRtl) {
      I18nManager.forceRTL(wantRtl);
      if (initial.current !== language) {
        // Language was changed by the user -> reload to apply mirroring.
        // (Expo's Updates API reloads the JS bundle instantly.)
        import("expo-updates")
          .then((Updates) => Updates.reloadAsync())
          .catch(() => {
            // If expo-updates is unavailable (e.g. Expo Go), a manual
            // restart applies the new direction. No crash.
          });
      }
    }
  }, [language]);
}
