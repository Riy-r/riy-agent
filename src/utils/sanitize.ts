/**
 * sanitize.ts
 * ---------------------------------------------------------------------------
 * Small helpers that CLEAN user input before we store it or send it to the
 * AI. This is a basic security layer - always sanitize text that came from
 * outside your app (user typing, voice transcription, etc).
 *
 * What it removes:
 *  - invisible/control characters that could confuse the AI or UI
 *  - giant walls of text (protects your API token budget)
 *  - leading/trailing whitespace
 */

/** Hard limit for a single typed message (characters). */
export const MAX_INPUT_LENGTH = 4000;

/** Hard limit for a voice transcript (Whisper usually returns far less). */
export const MAX_TRANSCRIPT_LENGTH = 4000;

/**
 * Clean a user-typed message.
 * Returns a safe, trimmed string, or an empty string if nothing is left.
 */
export function sanitizeUserInput(raw: string): string {
  if (typeof raw !== "string") return "";

  let text = raw;

  // 1. Remove control characters (invisible chars, most formatting attacks).
  //    We do NOT touch Arabic letters - they are normal text characters.
  //    Real newlines (\n) are kept; every other control char is dropped.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "");

  // 2. Tidy whitespace inside each line, keep line breaks, collapse blanks.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");

  // 3. Trim, then collapse 3+ consecutive newlines into 2.
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // 4. Enforce the maximum length.
  if (text.length > MAX_INPUT_LENGTH) {
    text = text.slice(0, MAX_INPUT_LENGTH);
  }

  return text;
}

/**
 * Clean a voice transcript that came back from Whisper.
 * Same rules, slightly different limit.
 */
export function sanitizeTranscript(raw: string): string {
  if (typeof raw !== "string") return "";
  return sanitizeUserInput(raw.slice(0, MAX_TRANSCRIPT_LENGTH));
}

/**
 * True if the string contains Arabic letters.
 * Used to pick a matching voice + layout direction for each message.
 */
export function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F]/.test(text);
}
