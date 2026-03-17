require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const NOTE_PATH = path.join(__dirname, "note.txt");

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

let supabase;
function getSupabase() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return Promise.resolve(false);

  const body = new URLSearchParams({ chat_id: chatId, text }).toString();
  const options = {
    method: "POST",
    hostname: "api.telegram.org",
    path: `/bot${token}/sendMessage`,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "content-length": Buffer.byteLength(body)
    },
    timeout: 5000
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
      resolve(false);
    });
    req.on("error", () => resolve(false));
    req.end(body);
  });
}

function formatLoginTelegramMessage(safe) {
  const lines = [
    "Login event",
    `result=${safe.result || "unknown"}`,
    `page=${safe.page || "unknown"}`,
    `email=${safe.email || "unknown"}`,
    `demoUserId=${safe.demoUserId || "unknown"}`,
    `ip=${safe.ip || "unknown"}`,
    `ua=${safe.userAgent || "unknown"}`,
    `ts=${safe.ts}`
  ];
  return lines.join("\n").slice(0, 3800);
}

function toSingleLine(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function normalizeEmail(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v.length > 254) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "";
  return v;
}

app.post("/api/log", (req, res) => {
  const event = req.body || {};

  // Intentionally do NOT accept or store passwords.
  // Only store non-sensitive demo telemetry (and optionally an email-like identifier).
  const safe = {
    ts: new Date().toISOString(),
    page: toSingleLine(event.page),
    action: toSingleLine(event.action),
    result: toSingleLine(event.result),
    demoUserId: toSingleLine(event.demoUserId),
    email: normalizeEmail(event.email),
    userAgent: toSingleLine(req.get("user-agent")),
    ip: toSingleLine(req.ip)
  };

  const line = JSON.stringify(safe) + "\n";
  fs.appendFile(NOTE_PATH, line, (err) => {
    if (err) return res.status(500).json({ ok: false });
    if (safe.action === "login") {
      sendTelegramMessage(formatLoginTelegramMessage(safe));
    }

    const shouldStoreInSupabase =
      (safe.action === "login" && safe.result === "success") ||
      (safe.action === "signup" && (safe.result === "success" || safe.result === "attempt"));

    const sb = getSupabase();
    if (shouldStoreInSupabase && sb && safe.email) {
      sb.from("login_emails")
        .insert([
          {
            email: safe.email,
            page: safe.page || null,
            demo_user_id: safe.demoUserId || null,
            user_agent: safe.userAgent || null,
            ip: safe.ip || null,
            occurred_at: safe.ts
          }
        ])
        .then(() => {})
        .catch(() => {});
    }
    return res.json({ ok: true });
  });
});

app.get("/healthz", (_req, res) => res.type("text").send("ok"));

app.listen(PORT, () => {
  console.log(`Demo pages running on http://localhost:${PORT}`);
});
