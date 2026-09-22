/**
 * translations.ts
 * ---------------------------------------------------------------------------
 * Every word the user sees lives here, in English AND Arabic.
 * To add a new language: add a new key under `translations` and extend
 * `AppLanguage`. That's it - all screens update automatically.
 */

export type AppLanguage = "en" | "ar";

export const translations = {
  en: {
    // Tabs
    chatTab: "Chat",
    settingsTab: "Settings",

    // Chat screen
    chatTitle: "My AI Agent",
    inputPlaceholder: "Type a message…",
    send: "Send",
    thinking: "Thinking…",
    listening: "Listening…",
    transcribing: "Transcribing your voice…",
    stop: "Tap to stop",
    holdToTalk: "Tap the mic and speak",
    micPermissionTitle: "Microphone permission",
    micPermissionBody:
      "My AI Agent needs microphone access so you can talk to your agent.",
    recordError: "Sorry, I could not record audio. Please check permissions.",
    transcribeError: "Sorry, I could not understand the audio.",
    networkError:
      "I could not reach the AI service. Check your connection and API key.",
    emptyChatTitle: "Hello! 👋",
    emptyChatBody:
      "Ask me anything, or tap the microphone and just talk. I can speak English and Arabic.",

    // Settings screen
    settingsTitle: "Settings",
    language: "Language",
    languageEn: "English",
    languageAr: "العربية",
    voice: "Agent voice",
    testVoice: "Hear a sample",
    voiceSample: "Hello! I am your AI agent. This is how my voice sounds.",
    apiBanner:
      "Voice and AI replies are off — add your OpenAI API key first. Tap for steps.",
    speakReplies: "Speak replies aloud",
    memory: "Memory",
    memoryOn: "The agent remembers you between sessions",
    memoryOff: "Memory is off - the agent forgets each session",
    clearChat: "Clear chat history",
    clearMemory: "Forget everything about me",
    confirmClearChat: "Delete all messages in this chat?",
    confirmClearMemory:
      "Delete your profile and all memories? This cannot be undone.",
    cancel: "Cancel",
    clear: "Clear",
    savedAutomatically: "Settings are saved automatically.",
    api: "API key",
    apiMissing:
      "No OpenAI API key found. Add EXPO_PUBLIC_OPENAI_API_KEY to your .env file, then restart the app.",
    apiFound: "An API key is configured. You are good to go!",

    // Memories screen ("What I remember")
    memoriesTab: "Memory",
    memoriesTitle: "What I remember",
    memoriesEmpty:
      "I haven't learned anything about you yet. Chat with me and I'll remember what matters.",
    memoriesName: "Your name",
    memoriesPreferences: "Preferences",
    memoriesFacts: "Facts",
    memoriesClearAll: "Forget everything",
    memoriesClearTitle: "Forget everything?",
    memoriesClearBody:
      "This permanently deletes your name, preferences, and every fact I've saved. This can't be undone.",
    memoriesClearConfirm: "Delete all",
  },

  ar: {
    // Tabs
    chatTab: "المحادثة",
    settingsTab: "الإعدادات",

    // Chat screen
    chatTitle: "وكيلي الذكي",
    inputPlaceholder: "اكتب رسالة…",
    send: "إرسال",
    thinking: "جارٍ التفكير…",
    listening: "جارٍ الاستماع…",
    transcribing: "جارٍ تحويل الصوت إلى نص…",
    stop: "اضغط للإيقاف",
    holdToTalk: "اضغط على المايك وتحدث",
    micPermissionTitle: "إذن الميكروفون",
    micPermissionBody:
      "يحتاج وكيلك الذكي إلى الميكروفون حتى تستطيع التحدث معه.",
    recordError: "عذراً، لم أتمكن من تسجيل الصوت. تحقق من الأذونات.",
    transcribeError: "عذراً، لم أفهم الصوت.",
    networkError: "تعذر الاتصال بالذكاء الاصطناعي. تحقق من الاتصال والمفتاح.",
    emptyChatTitle: "مرحباً! 👋",
    emptyChatBody:
      "اسألني عن أي شيء، أو اضغط على المايك وتحدث. أتحدث العربية والإنجليزية.",

    // Settings screen
    settingsTitle: "الإعدادات",
    language: "اللغة",
    languageEn: "English",
    languageAr: "العربية",
    voice: "صوت الوكيل",
    testVoice: "جرّب الصوت",
    voiceSample: "مرحباً! أنا وكيلك الذكي. هكذا يبدو صوتي.",
    apiBanner:
      "الصوت والردود معطّلة — أضف مفتاح OpenAI أولاً. اضغط لخطوات الإعداد.",
    speakReplies: "قراءة الردود بصوت عالٍ",
    memory: "الذاكرة",
    memoryOn: "يتذكر الوكيل معلوماتك بين الجلسات",
    memoryOff: "الذاكرة مغلقة - ينسى الوكيل كل جلسة",
    clearChat: "مسح سجل المحادثة",
    clearMemory: "انسَ كل شيء عني",
    confirmClearChat: "هل تريد حذف كل الرسائل؟",
    confirmClearMemory: "سيتم حذف ملفك وكل الذكريات. لا يمكن التراجع.",
    cancel: "إلغاء",
    clear: "مسح",
    savedAutomatically: "تُحفظ الإعدادات تلقائياً.",
    api: "مفتاح API",
    apiMissing:
      "لم يتم العثور على مفتاح OpenAI. أضف EXPO_PUBLIC_OPENAI_API_KEY إلى ملف ‎.env ثم أعد تشغيل التطبيق.",
    apiFound:      "تم إعداد المفتاح. كل شيء جاهز!",

    // Memories screen ("What I remember")
    memoriesTab: "الذاكرة",
    memoriesTitle: "ما أتذكره",
    memoriesEmpty:
      "لم أتعلم أي شيء عنك بعد. تحدث معي وسأتذكر ما يهم.",
    memoriesName: "اسمك",
    memoriesPreferences: "التفضيلات",
    memoriesFacts: "حقائق",
    memoriesClearAll: "انسَ كل شيء",
    memoriesClearTitle: "هل تنسى كل شيء؟",
    memoriesClearBody:
      "سيؤدي هذا إلى حذف اسمك وتفضيلاتك وكل حقيقة حفظتها نهائيًا. لا يمكن التراجع عن هذا.",
    memoriesClearConfirm: "حذف الكل",
  },
};

/**
 * A translation dictionary with all values widened to plain `string`
 * (so the English and Arabic dictionaries share one type).
 */
export type Translations = Record<keyof typeof translations.en, string>;

/** Look up the dictionary for a language. */
export function getTranslations(language: AppLanguage): Translations {
  return translations[language];
}
