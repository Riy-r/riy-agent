# API proxy (keeps your OpenAI key off the phone)

Without this proxy, your OpenAI key is bundled inside the app, and anyone
who unpacks the APK can read it. With the proxy, the app talks to your
server, and only the server knows the key.

## What it does

- Accepts only the three endpoints the app uses:
  `POST /v1/chat/completions`, `POST /v1/audio/transcriptions`, and
  `POST /v1/audio/speech`. Anything else returns 404.
- Adds your real key from its own environment.
- Drops any authorization header the app sends.
- Refuses request bodies over 25 MB.

It has no dependencies. It needs Node.js 18 or newer.

## Run it locally

```bash
OPENAI_API_KEY=sk-...your-key... node server/proxy.mjs
```

Then point the app at it. In your `.env` file:

```
EXPO_PUBLIC_API_PROXY_URL=http://192.168.1.20:8787
```

Use your computer's LAN address, not `localhost`, because the phone is a
different device. Restart `npm start` after changing `.env`.

## Before you publish it

This proxy has no user authentication. Anyone who learns its URL can use
your key and your billing. Before deploying it publicly, do at least one of
these:

1. Set `PROXY_TOKEN` on the server. Clients must then send the header
   `x-proxy-token`. Note that any token placed in the app is visible inside
   the APK, so this is a speed bump, not real security.
2. Add per-user auth, for example a sign-in with a session check.
3. Add rate limiting at the hosting platform.
4. Set a monthly usage limit in the OpenAI dashboard as a backstop.

Deploy it on any host that runs Node.js (Render, Railway, Fly.io, or your
own machine). Set `OPENAI_API_KEY` in that host's secret settings, never in
the code.
