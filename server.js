require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3005;
const LIVERELOAD = process.env.KORVI_LIVERELOAD === "1";

app.use(express.json({ limit: "1mb" }));

const publicDir = path.join(__dirname, "public");
const indexPath = path.join(publicDir, "index.html");

// ── Rate limiting ─────────────────────────────────────────────────────────────
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateLimitByIp = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers["x-real-ip"]?.trim() || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const existing = rateLimitByIp.get(ip);
  if (!existing || now >= existing.resetAtMs) {
    rateLimitByIp.set(ip, { count: 1, resetAtMs: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (existing.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAtMs - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true };
}

// ── Email via Resend (raw fetch — no SDK needed) ───────────────────────────────
async function maybeSendEmail({ name, email, message }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_EMAIL?.trim();
  if (!apiKey || !to) return false;

  const from = process.env.FROM_EMAIL?.trim() || "Korvi <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Ny forespørsel fra ${name}`,
        text: [`Navn:    ${name}`, `E-post:  ${email}`, ``, `Melding:`, message].join("\n"),
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:2rem">
            <h2 style="margin:0 0 1.5rem;color:#0a0a0d">Ny forespørsel — Korvi</h2>
            <table style="border-collapse:collapse;width:100%">
              <tr>
                <td style="padding:0.5rem 0;color:#555;width:6rem;vertical-align:top">Navn</td>
                <td style="padding:0.5rem 0;color:#111;font-weight:600">${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding:0.5rem 0;color:#555;vertical-align:top">E-post</td>
                <td style="padding:0.5rem 0"><a href="mailto:${escapeHtml(email)}" style="color:#6f35e7">${escapeHtml(email)}</a></td>
              </tr>
            </table>
            <hr style="margin:1.5rem 0;border:none;border-top:1px solid #e5e5e5"/>
            <p style="color:#555;margin:0 0 0.5rem;font-size:0.875rem">Melding</p>
            <p style="color:#111;white-space:pre-wrap;margin:0">${escapeHtml(message)}</p>
            <hr style="margin:1.5rem 0;border:none;border-top:1px solid #e5e5e5"/>
            <p style="color:#999;font-size:0.8rem;margin:0">Svar direkte på denne e-posten for å nå ${escapeHtml(name)}.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      console.warn("[contact] email_failed", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[contact] email_exception", e);
    return false;
  }
}

// ── HTML helper ───────────────────────────────────────────────────────────────
function sendIndexHtml(res) {
  let html = fs.readFileSync(indexPath, "utf8");
  if (LIVERELOAD) {
    const lrScript = `<script src="http://127.0.0.1:35729/livereload.js?snipver=1" async></script>`;
    html = html.includes("</body>")
      ? html.replace("</body>", `${lrScript}\n</body>`)
      : html + lrScript;
  }
  res.type("html").send(html);
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => sendIndexHtml(res));
app.get("/index.html", (req, res) => sendIndexHtml(res));

app.use(express.static(publicDir, { index: false }));

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "Manglende felt." });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    return res.status(429).json({
      success: false,
      error: "For mange forespørsler. Prøv igjen senere.",
    });
  }

  console.log("[contact]", { name, email, ip });
  const emailed = await maybeSendEmail({ name, email, message });
  if (!emailed) {
    console.log("[contact] (e-post ikke konfigurert — kun logget)");
  }

  res.json({ success: true });
});

// ── Live reload ────────────────────────────────────────────────────────────────
if (LIVERELOAD) {
  const livereload = require("livereload");
  const lr = livereload.createServer({
    exts: ["html", "css", "js", "svg", "png", "jpg", "jpeg", "webp", "gif", "ico"],
    delay: 120,
  });
  lr.watch(publicDir);
  console.log("Livereload: watching", publicDir);
}

// In local dev, start the server directly; Vercel imports the module instead.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Korvi server: http://localhost:${PORT}`);
    if (!process.env.RESEND_API_KEY) {
      console.log("Tips: sett RESEND_API_KEY + CONTACT_EMAIL i .env for å aktivere e-post.");
    }
  });
}

module.exports = app;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
