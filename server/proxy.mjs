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
 *
 * Only the three endpoints the app uses are allowed. Everything else is 404.
 */

import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const UPSTREAM = (process.env.OPENAI_UPSTREAM || "https://api.openai.com").replace(/\/$/, "");
const API_KEY = process.env.OPENAI_API_KEY || "";
const PROXY_TOKEN = process.env.PROXY_TOKEN || "";

// Requests bigger than this are refused. Voice clips are the largest payload.
const MAX_BODY_BYTES = 25 * 1024 * 1024;

const ALLOWED = new Map([
  ["POST /v1/chat/completions", true],
  ["POST /v1/audio/transcriptions", true],
  ["POST /v1/audio/speech", true],
]);

if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY. Set it in the server environment and restart.");
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

  if (!ALLOWED.has(routeKey)) {
    return send(res, 404, "Not found");
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

  const headers = { Authorization: `Bearer ${API_KEY}` };
  // Forward only the content type. Never forward the client's own headers.
  if (req.headers["content-type"]) {
    headers["Content-Type"] = req.headers["content-type"];
  }

  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM}${path}`, {
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
  console.log(`Proxy listening on port ${PORT}, forwarding to ${UPSTREAM}`);
});
