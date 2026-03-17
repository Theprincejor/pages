const https = require("https");

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
    "Login click",
    `result=${safe.result || "unknown"}`,
    `page=${safe.page || "unknown"}`,
    `email=${safe.email || "unknown"}`,
    `demoUserId=${safe.demoUserId || "unknown"}`,
    `ua=${safe.userAgent || "unknown"}`,
    `ts=${safe.ts}`
  ];
  return lines.join("\n").slice(0, 3800);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "method_not_allowed" });

  let event;
  try {
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch (_e) {
    return json(res, 400, { ok: false, error: "bad_json" });
  }

  const safe = {
    ts: new Date().toISOString(),
    page: toSingleLine(event.page),
    action: toSingleLine(event.action),
    result: toSingleLine(event.result),
    demoUserId: toSingleLine(event.demoUserId),
    email: normalizeEmail(event.email),
    userAgent: toSingleLine(req.headers["user-agent"])
  };

  if (safe.action === "login") {
    await sendTelegramMessage(formatLoginTelegramMessage(safe));
  }

  return json(res, 200, { ok: true });
};

