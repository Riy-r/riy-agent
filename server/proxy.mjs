/**
 * server/proxy.mjs
 * ---------------------------------------------------------------------------
 * A tiny proxy that keeps your OpenAI key OFF the phone.
 *
 * The app sends requests here instead of to api.openai.com. This server adds
 * the real key (from its own environment) and forwards the request upstream.
 *
 * Zero dependencies. Needs Node.js 18+.
 *
 *   OPENAI_API_KEY=sk-...        required, the real key (server-side only)
 *   PORT=8787                    optional, default 8787
 *   PROXY_TOKEN=some-secret      optional, if set, clients must send
 *                                header "x-proxy-token: <value>"
 *   OPENAI_UPSTREAM=https://...  optional, default https://api.openai.com
 *   GEMINI_API_KEY=...           optional, enables video creation (Gemini)
 *   GEMINI_UPSTREAM=https://...  optional, default https://generativelanguage.googleapis.com
 *
 * Only the endpoints the app uses are allowed. Everything else is 404.
 * At least one of OPENAI_API_KEY or GEMINI_API_KEY must be set.
 */

import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const UPSTREAM = (process.env.OPENAI_UPSTREAM || "https://api.openai.com").replace(/\/$/, "");
const API_KEY = process.env.OPENAI_API_KEY || "";
const GEMINI_UPSTREAM = (process.env.GEMINI_UPSTREAM || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const PROXY_TOKEN = process.env.PROXY_TOKEN || "";

// Requests bigger than this are refused. Voice clips are the largest payload.
const MAX_BODY_BYTES = 25 * 1024 * 1024;

// Each route says where it goes and which key it uses.
const OPENAI_ROUTE = { upstream: UPSTREAM, auth: () => ({ Authorization: `Bearer ${API_KEY}` }), enabled: () => !!API_KEY };
const GEMINI_ROUTE = { upstream: GEMINI_UPSTREAM, auth: () => ({ "x-goog-api-key": GEMINI_KEY }), enabled: () => !!GEMINI_KEY };

const ALLOWED = new Map([
  ["POST /v1/chat/completions", OPENAI_ROUTE],
  ["POST /v1/audio/transcriptions", OPENAI_ROUTE],
  ["POST /v1/audio/speech", OPENAI_ROUTE],
  ["POST /v1beta/interactions", GEMINI_ROUTE],
]);

if (!API_KEY && !GEMINI_KEY) {
  console.error("Set OPENAI_API_KEY and/or GEMINI_API_KEY in the server environment and restart.");
  process.exit(1);
}

function send(res, status, message) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: message }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const path = (req.url || "").split("?")[0];
  const routeKey = `${req.method} ${path}`;

  const route = ALLOWED.get(routeKey);
  if (!route) {
    return send(res, 404, "Not found");
  }
  if (!route.enabled()) {
    return send(res, 503, "This service is not configured on the server");
  }

  if (PROXY_TOKEN && req.headers["x-proxy-token"] !== PROXY_TOKEN) {
    return send(res, 401, "Unauthorized");
  }

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return send(res, err.status || 400, err.message);
  }

  const headers = { ...route.auth() };
  // Forward only the content type. Never forward the client's own headers.
  if (req.headers["content-type"]) {
    headers["Content-Type"] = req.headers["content-type"];
  }

  let upstream;
  try {
    upstream = await fetch(`${route.upstream}${path}`, {
      method: req.method,
      headers,
      body,
    });
  } catch {
    return send(res, 502, "Upstream request failed");
  }

  const responseHeaders = {};
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders["Content-Type"] = contentType;
  res.writeHead(upstream.status, responseHeaders);
  res.end(Buffer.from(await upstream.arrayBuffer()));
});

server.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}. OpenAI -> ${UPSTREAM}, Gemini -> ${GEMINI_UPSTREAM}`);
});
