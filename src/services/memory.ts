/**
 * memory.ts
 * ---------------------------------------------------------------------------
 * The agent's LONG-TERM memory, stored locally on the phone with
 * AsyncStorage (a simple key-value database that survives app restarts).
 *
 * Three kinds of memory:
 *   1. Profile  - structured info: the user's name + their preferences
 *   2. Facts    - sentences the agent should remember ("user likes tea")
 *   3. History  - the chat messages themselves (short-term context)
 *
 * PUBLIC API (the parts other files are allowed to use):
 *   getProfile()      -> { name?, preferences: string[] }
 *   setName()         -> save the user's name
 *   addPreference()   -> save one preference (e.g. "likes green tea")
 *   getFacts()        -> all remembered sentences
 *   addFact()         -> remember a new sentence
 *   deleteFact(id)    -> forget one sentence
 *   clearAllMemory()  -> forget EVERYTHING (profile + facts + history)
 *   loadHistory() / appendMessage() / clearHistory()  -> the visible chat
 *
 * Everything is JSON-encoded strings under clear storage keys.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { MAX_HISTORY } from "@/constants/config";

// ---- Types ----

/** Structured info about the user (name + preferences). */
export type MemoryProfile = {
  name?: string;
  preferences: string[];
};

/** One remembered sentence. */
export type MemoryFact = {
  id: string;
  text: string;
  createdAt: number;
};

/** One chat message (what we store and what the UI renders). */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

// ---- Storage keys ----

const KEY_PROFILE = "@myaiagent/profile";
const KEY_FACTS = "@myaiagent/facts";
const KEY_HISTORY = "@myaiagent/history";

/** Unique id helper (good enough for a local app). */
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Safe JSON parse - never crash because stored data is corrupt. */
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// PROFILE (name + preferences)
// ---------------------------------------------------------------------------

/**
 * Accept whatever is in storage and guarantee the MemoryProfile shape.
 * Older versions of the app stored a flat key/value record
 * (`{ name: "Sara", city: "Cairo" }`) - those entries are migrated:
 * `name` stays the name, every other key becomes a preference string.
 */
function normalizeProfile(raw: unknown): MemoryProfile {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { preferences: [] };
  }

  const obj = raw as Record<string, unknown>;

  // Already the new format -> just clean it up.
  if (Array.isArray(obj.preferences)) {
    return {
      name: typeof obj.name === "string" && obj.name ? obj.name : undefined,
      preferences: obj.preferences.filter(
        (p): p is string => typeof p === "string" && p.length > 0
      ),
    };
  }

  // Old format (Record<string, string>) -> migrate.
  const preferences: string[] = [];
  let name: string | undefined;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string" || !value) continue;
    if (key === "name") {
      name = value;
    } else {
      preferences.push(`${key}: ${value}`);
    }
  }
  return { name, preferences };
}

export async function getProfile(): Promise<MemoryProfile> {
  const raw = await AsyncStorage.getItem(KEY_PROFILE);
  return normalizeProfile(safeParse<unknown>(raw, {}));
}

async function saveProfile(profile: MemoryProfile): Promise<void> {
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
}

/** Save (or overwrite) the user's name. */
export async function setName(name: string): Promise<MemoryProfile> {
  const profile = await getProfile();
  const clean = name.trim();
  const next: MemoryProfile = { ...profile, preferences: profile.preferences };
  if (clean) next.name = clean;
  else delete next.name;
  await saveProfile(next);
  return next;
}

/** Add one preference (skips duplicates), e.g. "likes green tea". */
export async function addPreference(preference: string): Promise<MemoryProfile> {
  const profile = await getProfile();
  const clean = preference.trim();
  if (clean && !profile.preferences.includes(clean)) {
    profile.preferences = [...profile.preferences, clean];
    await saveProfile(profile);
  }
  return profile;
}

// ---------------------------------------------------------------------------
// FACTS (long-term memory sentences)
// ---------------------------------------------------------------------------

export async function getFacts(): Promise<MemoryFact[]> {
  const raw = await AsyncStorage.getItem(KEY_FACTS);
  return safeParse<MemoryFact[]>(raw, []);
}

/** Remember a new sentence. Skips exact duplicates. Returns updated list. */
export async function addFact(text: string): Promise<MemoryFact[]> {
  const facts = await getFacts();
  const clean = text.trim();
  if (!clean || facts.some((f) => f.text === clean)) return facts;

  const fact: MemoryFact = { id: newId(), text: clean, createdAt: Date.now() };
  const updated = [...facts, fact];
  await AsyncStorage.setItem(KEY_FACTS, JSON.stringify(updated));
  return updated;
}

/** Forget one remembered sentence by id. */
export async function deleteFact(id: string): Promise<void> {
  const facts = await getFacts();
  const updated = facts.filter((f) => f.id !== id);
  await AsyncStorage.setItem(KEY_FACTS, JSON.stringify(updated));
}

// ---------------------------------------------------------------------------
// HISTORY (the visible chat)
// ---------------------------------------------------------------------------

export async function loadHistory(): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(KEY_HISTORY);
  return safeParse<ChatMessage[]>(raw, []);
}

/** Append one message and keep the list capped at MAX_HISTORY entries. */
export async function appendMessage(
  role: ChatMessage["role"],
  content: string
): Promise<ChatMessage[]> {
  const history = await loadHistory();
  const message: ChatMessage = {
    id: newId(),
    role,
    content,
    createdAt: Date.now(),
  };
  const updated = [...history, message].slice(-MAX_HISTORY);
  await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(updated));
  return updated;
}

// ---------------------------------------------------------------------------
// DANGER ZONE (used by the Settings screen)
// ---------------------------------------------------------------------------

/** Delete the chat messages only. */
export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY_HISTORY);
}

/** Delete profile + facts + history (the "forget everything" button). */
export async function clearAllMemory(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_PROFILE, KEY_FACTS, KEY_HISTORY]);
}
