const fs = require("fs");
const path = require("path");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

let put;
try {
  // Optional dependency for production on Vercel Blob (requires BLOB_READ_WRITE_TOKEN).
  ({ put } = require("@vercel/blob"));
} catch (_e) {
  put = null;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
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
  const chatId = process.env.TELEGRAM_CHAT_ID || "8394739548";
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "method_not_allowed" });

  let event;
  try {
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_e) {
    return json(res, 400, { ok: false, error: "bad_json" });
  }

  // Intentionally do NOT accept or store passwords.
  const safe = {
    ts: new Date().toISOString(),
    page: toSingleLine(event.page),
    action: toSingleLine(event.action),
    result: toSingleLine(event.result),
    demoUserId: toSingleLine(event.demoUserId),
    email: normalizeEmail(event.email),
    userAgent: toSingleLine(req.headers["user-agent"])
  };

  if (safe.action === "login" && safe.result === "success") {
    const msg =
      `Demo login success\n` +
      `page=${safe.page || "unknown"}\n` +
      `email=${safe.email || "unknown"}\n` +
      `demoUserId=${safe.demoUserId || "unknown"}\n` +
      `ts=${safe.ts}`;
    await sendTelegramMessage(msg);

    const sb = getSupabase();
    if (sb && safe.email) {
      try {
        await sb.from("login_emails").insert([
          {
            email: safe.email,
            page: safe.page || null,
            demo_user_id: safe.demoUserId || null,
            user_agent: safe.userAgent || null,
            occurred_at: safe.ts
          }
        ]);
      } catch (_e) {
        // best effort
      }
    }
  }

  const shouldStoreInSupabase =
    (safe.action === "login" && safe.result === "success") ||
    (safe.action === "signup" && (safe.result === "success" || safe.result === "attempt"));

  if (shouldStoreInSupabase) {
    const sb = getSupabase();
    if (sb && safe.email) {
      try {
        await sb.from("login_emails").insert([
          {
            email: safe.email,
            page: safe.page || null,
            demo_user_id: safe.demoUserId || null,
            user_agent: safe.userAgent || null,
            occurred_at: safe.ts
          }
        ]);
      } catch (_e) {
        // best effort
      }
    }
  }

  // Local/dev: append to note.txt when running from filesystem.
  // Production (Vercel): filesystem is ephemeral, so prefer Vercel Blob.
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken && put) {
    const name = `demo-log/${safe.ts.replace(/[:.]/g, "-")}_${Math.random().toString(16).slice(2)}.json`;
    await put(name, JSON.stringify(safe) + "\n", {
      access: "private",
      contentType: "application/json"
    });
    return json(res, 200, { ok: true, stored: "blob" });
  }

  const notePath = path.join(process.cwd(), "note.txt");
  fs.appendFile(notePath, JSON.stringify(safe) + "\n", (err) => {
    if (err) return json(res, 500, { ok: false, error: "write_failed" });
    return json(res, 200, { ok: true, stored: "file" });
  });
};
