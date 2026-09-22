/**
 * useSettings.tsx
 * ---------------------------------------------------------------------------
 * Loads and saves the user's preferences (language, voice, memory on/off,
 * speak-replies on/off).
 *
 * HOW IT WORKS (beginner-friendly design):
 *   - <SettingsProvider> sits ONCE at the app root and owns the state.
 *   - Every screen calls useSettings() and gets the SAME shared values.
 *     Change the language on the Settings screen -> the whole app updates.
 *   - Any change is saved to AsyncStorage immediately, so settings
 *     survive app restarts.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppLanguage } from "@/i18n/translations";

// ---------------------------------------------------------------------------
// Types & defaults
// ---------------------------------------------------------------------------

export type Settings = {
  language: AppLanguage;
  voiceId: string;
  memoryEnabled: boolean;
  speakReplies: boolean;
};

/** Defaults for a fresh install. */
const DEFAULT_SETTINGS: Settings = {
  language: "en",
  voiceId: "openai-coral",
  memoryEnabled: true,
  speakReplies: true,
};

const STORAGE_KEY = "@myaiagent/settings";

// ---------------------------------------------------------------------------
// The shared context
// ---------------------------------------------------------------------------

type SettingsContextValue = {
  settings: Settings;
  /** Update one or more settings and persist them immediately. */
  update: (patch: Partial<Settings>) => void;
  /** True once the saved settings have been loaded from storage. */
  ready: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider (used once, in app/_layout.tsx)
// ---------------------------------------------------------------------------

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  // ---- Load saved settings once on app start ----
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<Settings>;
          // Merge over defaults so new options always have a value.
          setSettings((prev) => ({ ...prev, ...saved }));
        }
      } catch {
        // Corrupt settings: fall back to defaults silently.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ---- Update one or more keys and persist immediately ----
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
        // Saving failed (very rare) - the app still works this session.
      });
      return next;
    });
  }, []);

  // Memoize so screens only re-render when settings actually change.
  const value = useMemo(
    () => ({ settings, update, ready }),
    [settings, update, ready]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook (used by every screen)
// ---------------------------------------------------------------------------

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      "useSettings must be used inside <SettingsProvider> (see app/_layout.tsx)"
    );
  }
  return context;
}
