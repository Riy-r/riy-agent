# My AI Agent 🎙️✨

A friendly **voice + text AI agent** for Android, built with **React Native + Expo**.
Talk or type, get smart replies, and hear them spoken aloud in a natural voice —
in **English and Arabic (with full RTL support)**.

The agent remembers you between sessions: your name, your preferences, and
the topics you've discussed.

---

## 📱 What's inside

| Feature | Where it lives |
| --- | --- |
| 💬 Chat screen (text + voice) | `src/app/(tabs)/index.tsx` |
| 🎙️ Big microphone button | `src/components/MicButton.tsx` |
| 🧠 Agent brain (OpenAI GPT) | `src/services/ai.ts` |
| 🗣️ Speech-to-text (Whisper) | `src/services/speech-to-text.ts` |
| 🔊 Text-to-speech (natural + offline voices) | `src/services/text-to-speech.ts` |
| 🧠 Long-term memory (AsyncStorage) | `src/services/memory.ts` |
| ⚙️ Settings screen (language, voice, memory) | `src/app/(tabs)/settings.tsx` |
| 🗂️ "What I remember" screen (view/delete memories) | `src/app/(tabs)/memories.tsx` |
| 🌍 All app translations (EN + AR) | `src/i18n/translations.ts` |
| 🛡️ Input sanitizer (security) | `src/utils/sanitize.ts` |
| 🎨 Colors & sizes (change me!) | `src/constants/theme.ts` |

```
my-ai-agent/
├── app.json                  Expo app configuration
├── package.json              Dependencies and scripts
├── assets/                   Icons and splash images
└── src/
    ├── app/                  Screens (file-based routing)
    │   ├── _layout.tsx       Root layout + RTL handling
    │   ├── +not-found.tsx    Fallback screen
    │   └── (tabs)/
    │       ├── _layout.tsx   Bottom tabs (Chat / Settings / Memories)
    │       ├── index.tsx     💬 Chat screen
    │       ├── settings.tsx  ⚙️ Settings screen
    │       └── memories.tsx  🗂️ "What I remember" screen
    ├── components/           Reusable UI (MessageBubble, MicButton)
    ├── hooks/                State logic (useChat, useSettings, ...)
    ├── services/             AI + memory + speech (the "backend")
    ├── i18n/                 Translations
    ├── constants/            Theme + API config
    └── utils/                Helpers (input sanitizer)
```

---

## 🚀 Run it on your phone (10 minutes)

### Step 0 — Install the tools (once)

1. Install **Node.js 20+**: https://nodejs.org
2. Install **Expo Go** on your Android phone: https://expo.dev/go
   (this lets you test the app without building anything)

### Step 1 — Install project dependencies

Open a terminal in this folder and run:

```bash
npm install
```

### Step 2 — Add your OpenAI API key

1. Create a key at https://platform.openai.com/api-keys
2. Create a file named **`.env`** in this folder (copy `.env.example`)
3. Put your key inside it:

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your real key...
```

> ⚠️ Never share this key or commit it to git. `.gitignore` already
> protects the `.env` file.

### Step 3 — Start the app

```bash
npm start
```

A QR code appears. **Scan it with the Expo Go app** (Android: use the
"Scan QR code" button inside Expo Go, or your camera app).

The app opens on your phone. Talk to your agent! 🎉

> Every time you change the `.env` file you must restart the dev server
> (press `Ctrl+C`, then `npm start` again).

---

## 🤖 How the agent works (the 60-second tour)

1. You type a message or tap the mic and speak.
2. Voice recordings are sent to **OpenAI Whisper** → returns text.
3. Your text + the last 10 messages + your saved memories go to
   **GPT-4o mini** → returns a reply.
4. The reply appears in the chat, and is spoken aloud with your
   chosen voice (**OpenAI natural voices** or the free **offline
   device voice**).
5. In the background, a second tiny AI call extracts facts about you
   ("user's name is Sara", "user likes green tea") and stores them in
   **AsyncStorage** so they survive app restarts.

### Where to change things

- **Different AI model** → `src/constants/config.ts` (`CHAT_MODEL`)
- **Colors and styling** → `src/constants/theme.ts`
- **Agent personality** → `buildSystemPrompt()` in `src/services/ai.ts`
- **Add a new language** → `src/i18n/translations.ts`
- **Message length, context size** → `src/constants/config.ts`

---

## 🔐 Security notes

- The API key is read from **environment variables only**
  (`EXPO_PUBLIC_OPENAI_API_KEY`) — never hardcoded in the source.
- All user input is sanitized (control characters stripped, length
  capped) before being stored or sent — see `src/utils/sanitize.ts`.
- Harmful requests get an instant local refusal (works even offline),
  and the AI model applies its own safety rules on top.
- "Forget everything about me" in Settings wipes all local data.

> 💡 For a production release, move the OpenAI calls behind a small
> backend proxy so the key never ships inside the app. This starter
> keeps everything local on purpose, to stay simple for learning.

---

## 📦 Build for Android (APK for sharing / Play Store)

You need **EAS Build** (Expo's cloud build service — free tier available).

```bash
# one-time setup
npm install -g eas-cli
eas login          # create a free account at https://expo.dev

# configure the project (once)
eas build:configure

# build a shareable APK
eas build -p android --profile preview
```

When the build finishes you get a link — open it on your phone and
install the APK.

To publish to the **Play Store**, build an app bundle instead:

```bash
eas build -p android --profile production
```

---

## 🧪 Handy scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the dev server (scan QR with Expo Go) |
| `npm run typecheck` | Check all TypeScript for errors |
| `npm run android` | Same as start (open on Android) |
| `npm run web` | Run the app in a browser (mic/TTS limited) |

---

## ❓ Troubleshooting

| Problem | Fix |
| --- | --- |
| "Missing API key" alert | Create `.env` with your key, restart `npm start` |
| Phone can't connect | Make sure phone and computer are on the same Wi-Fi |
| No sound on iOS | Turn off the silent switch (device TTS respects it) |
| Arabic layout looks odd | Change language in Settings — the app reloads once to flip RTL |
| Microphone permission denied | Allow it in Android Settings → Apps → Expo Go → Permissions |

---

Made with ❤️ — happy building!
