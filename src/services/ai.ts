/**
 * ai.ts
 * ---------------------------------------------------------------------------
 * The agent's BRAIN: talks to the OpenAI Chat API.
 *
 * How it works:
 *   1. Build a "system prompt" that gives the agent its personality,
 *      its safety rules, and everything it remembers about the user.
 *   2. Send that + the recent conversation to the API.
 *   3. Return the agent's reply text.
 */

import {
  CHAT_MODEL,
  OPENAI_BASE_URL,
  CONTEXT_WINDOW,
} from "@/constants/config";
import type {
  ChatMessage,
  MemoryFact,
  MemoryProfile,
} from "@/services/memory";
import { isArabic } from "@/utils/sanitize";

/** Where the API key comes from (never hardcoded!). */
export function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return key && key.trim().length > 10 ? key.trim() : null;
}

/** Thrown when the API call fails - the UI shows a friendly message. */
export class AgentError extends Error {}

// ---------------------------------------------------------------------------
// Safety: refuse obviously harmful requests BEFORE calling the API.
// (The AI model also refuses on its own - this is an extra layer that
//  works instantly and even offline.)
// ---------------------------------------------------------------------------

const HARMFUL_PATTERNS: RegExp[] = [
  /\b(how to (make|build|create)\b).*(\b(bomb|explosive|weapon|virus|malware)\b)/i,
  /\b(hack|steal|launder)\b.*\b(money|account|credit card|bank)\b/i,
  /\b(child|csam)\b.*\b(porn|sexual)\b/i,
  /\b(kill|murder)\b.*\b(how|help|plan)\b/i,
  /\b(suicide|self[- ]harm)\b/i, // handled with a caring refusal + resources
];

/** A friendly refusal in the right language. */
export function localRefusal(userText: string): string | null {
  const suicidePattern = /\b(suicide|self[- ]harm)\b/i;
  if (suicidePattern.test(userText)) {
    return isArabic(userText)
      ? "أنا آسف جداً أنك تمر بوقت صعب. أنت لست وحدك - يرجى التحدث مع شخص تثق به أو الاتصال بخدمة الدعم النفسي في بلدك فوراً. حياتك ثمينة."
      : "I'm really sorry you're feeling this way. You are not alone - please talk to someone you trust, or contact a local crisis helpline right away. Your life matters.";
  }

  if (HARMFUL_PATTERNS.some((re) => re.test(userText))) {
    return isArabic(userText)
      ? "لا أستطيع المساعدة في هذا الطلب. لكن يسعدني مساعدتك في أي شيء آخر!"
      : "I can't help with that request. But I'd be happy to help with anything else!";
  }

  return null;
}

// ---------------------------------------------------------------------------
// System prompt: the agent's personality + memory
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  profile: MemoryProfile,
  facts: MemoryFact[],
  language: "en" | "ar",
  memoryEnabled: boolean
): string {
  const lines: string[] = [
    "You are 'My AI Agent', a helpful, friendly and safe personal assistant.",
    "Rules you must always follow:",
    "- Refuse harmful, dangerous or illegal requests politely, and offer a safe alternative.",
    "- Be warm and encouraging. Ask a follow-up question when the request is unclear.",
    "- Keep answers concise (2-6 sentences) because they may be read aloud.",
    "- Use plain text only: no markdown, no bullet symbols, no emojis spam (1 emoji max).",
  ];

  // Which language to answer in.
  lines.push(
    language === "ar"
      ? "- Always answer in Arabic (Modern Standard Arabic)."
      : "- Always answer in English unless the user writes in another language."
  );

  // Long-term memory injection.
  if (memoryEnabled) {
    const known: string[] = [];
    if (profile.name) known.push(`The user's name is ${profile.name}.`);
    for (const preference of profile.preferences) {
      if (preference) known.push(`User preference: ${preference}.`);
    }
    for (const fact of facts.slice(-10)) known.push(fact.text);

    if (known.length > 0) {
      lines.push(
        "Things you remember about the user (use naturally, do not list them):",
        ...known.map((k) => `- ${k}`)
      );
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// The actual API call
// ---------------------------------------------------------------------------

/** The shape OpenAI expects for each message. */
type ApiMessage = { role: "system" | "user" | "assistant"; content: string };

export async function sendChat(
  recentMessages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new AgentError("Missing API key");
  }

  // Short-term context: only the last N messages (cheaper + faster).
  const context: ApiMessage[] = recentMessages
    .slice(-CONTEXT_WINDOW)
    .map((m) => ({ role: m.role, content: m.content }));

  const body = {
    model: CHAT_MODEL,
    messages: [{ role: "system" as const, content: systemPrompt }, ...context],
    temperature: 0.7,
    max_tokens: 800,
  };

  let response: Response;
  try {
    response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AgentError("Network request failed");
  }

  if (!response.ok) {
    // 401 = bad key, 429 = out of credit / rate limit, other = server issue.
    throw new AgentError(`API error ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new AgentError("Empty reply");

  return reply;
}

/**
 * Ask the model to save durable facts about the user as JSON.
 * We use a tiny second request so memory extraction stays reliable.
 */
export async function extractFacts(
  conversation: ChatMessage[],
  language: "en" | "ar"
): Promise<string[]> {
  const apiKey = getApiKey();
  if (!apiKey || conversation.length === 0) return [];

  const transcript = conversation
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const body = {
    model: CHAT_MODEL,
    messages: [
      {
        role: "system" as const,
        content:
          'Extract durable facts about the USER from this chat (name, preferences, plans, people, likes). Skip anything temporary. Reply ONLY with a JSON array of short sentences, e.g. ["The user\'s name is Sara","The user likes green tea"]. If there are no facts, reply []',
      },
      { role: "user" as const, content: transcript },
    ],
    temperature: 0,
    max_tokens: 200,
  };

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/); // be forgiving about extra text
    if (!match) return [];

    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.length > 3)
      .slice(0, 3)
      .map((s) => s.trim());
  } catch {
    return []; // memory extraction must never break the chat
  }
}
