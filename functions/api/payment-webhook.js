/**
 * Brilliant Beacon Services — functions/api/payment-webhook.js (Cloudflare Pages Function)
 *
 * Receives Stripe webhook events, verifies Stripe's signature, and only
 * then records the payment (D1, table `payments`) and emails a notification
 * to info@brilliantbeaconservices.co.uk via Resend. This is the ONLY place
 * a payment is treated as confirmed — reaching payment-success.html in the
 * browser is not proof of payment.
 *
 * Environment variables (Cloudflare Pages → Settings → Variables and Secrets):
 *   STRIPE_WEBHOOK_SECRET — the endpoint's signing secret (whsec_...), from
 *                           Stripe Dashboard → Developers → Webhooks. Secret.
 *   RESEND_API_KEY        — already set (used by the contact form).
 * D1 binding: DB (already bound). The `payments` table is created
 * automatically on first use.
 *
 * Signature verification is implemented with Web Crypto (HMAC-SHA256), as
 * documented at https://docs.stripe.com/webhooks#verify-manually — no SDK
 * needed, and it runs natively on Cloudflare's Workers runtime.
 *
 * Routing: functions/api/payment-webhook.js → /api/payment-webhook
 */

const RECIPIENT_EMAIL = "info@brilliantbeaconservices.co.uk";
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

function hexFromBuffer(buf) {
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies a Stripe-Signature header against the raw body. Returns true/false. */
async function verifyStripeSignature(rawBody, header, secret, nowSeconds) {
  if (!header) return false;
  let timestamp = null;
  const signatures = [];
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  if (!timestamp || !signatures.length) return false;

  const now = typeof nowSeconds === "number" ? nowSeconds : Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = hexFromBuffer(mac);
  return signatures.some(function (sig) { return timingSafeEqual(sig, expected); });
}

function formatGBP(pence, currency) {
  const amount = (Number(pence) || 0) / 100;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: (currency || "gbp").toUpperCase() }).format(amount);
  } catch (e) {
    return `${amount.toFixed(2)} ${(currency || "").toUpperCase()}`;
  }
}

/** Saves the payment to D1. Returns true if a NEW row was inserted (false if already recorded). */
async function saveToDatabase(record, env) {
  if (!env.DB) throw new Error("DB binding is not configured");

  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS payments (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       stripe_session_id TEXT NOT NULL UNIQUE,
       stripe_payment_intent TEXT,
       status TEXT NOT NULL,
       amount_pence INTEGER NOT NULL,
       currency TEXT NOT NULL,
       customer_name TEXT,
       customer_email TEXT,
       reference TEXT,
       livemode INTEGER,
       created_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`
  ).run();

  const result = await env.DB.prepare(
    `INSERT INTO payments (stripe_session_id, stripe_payment_intent, status, amount_pence, currency, customer_name, customer_email, reference, livemode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(stripe_session_id) DO UPDATE SET status = excluded.status
     WHERE payments.status <> excluded.status`
  )
    .bind(
      record.sessionId,
      record.paymentIntent,
      record.status,
      record.amountPence,
      record.currency,
      record.name,
      record.email,
      record.reference,
      record.livemode ? 1 : 0
    )
    .run();

  return !!(result && result.meta && result.meta.changes > 0);
}

async function sendEmail(record, env) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const statusLabel = record.status === "paid" ? "Payment received" : record.status === "failed" ? "Payment FAILED" : `Payment ${record.status}`;
  const amount = formatGBP(record.amountPence, record.currency);

  const text = [
    `${statusLabel} — Brilliant Beacon Services`,
    record.livemode ? "" : "*** TEST MODE — no real money was taken ***",
    "",
    `Amount: ${amount}`,
    `Name: ${record.name || "Not provided"}`,
    `Email: ${record.email || "Not provided"}`,
    `Reference: ${record.reference || "Not provided"}`,
    `Stripe payment: ${record.paymentIntent || record.sessionId}`,
    "",
    "View it in your Stripe Dashboard: https://dashboard.stripe.com/payments"
  ].filter(function (line, i) { return !(i === 1 && line === ""); }).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "Brilliant Beacon Services <no-reply@brilliantbeaconservices.co.uk>",
      to: [RECIPIENT_EMAIL],
      reply_to: record.email || undefined,
      subject: `${record.livemode ? "" : "[TEST] "}${statusLabel}: ${amount} — ${record.name || record.email || "customer"}`,
      text: text
    })
  });
  if (!res.ok) {
    const body = await res.text().catch(function () { return ""; });
    throw new Error(`Resend responded with status ${res.status}: ${body}`);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("payment-webhook.js: STRIPE_WEBHOOK_SECRET not configured — cannot verify webhook.");
    return jsonResponse(503, { error: "Webhook verification not configured." });
  }

  const rawBody = await request.text();
  const valid = await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), webhookSecret);
  if (!valid) {
    return jsonResponse(400, { error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return jsonResponse(400, { error: "Invalid JSON" });
  }

  const handled = {
    "checkout.session.completed": true,
    "checkout.session.async_payment_succeeded": true,
    "checkout.session.async_payment_failed": true
  };
  if (!handled[event.type]) {
    return jsonResponse(200, { received: true, ignored: event.type });
  }

  const session = event.data && event.data.object ? event.data.object : {};
  let status;
  if (event.type === "checkout.session.async_payment_failed") status = "failed";
  else if (session.payment_status === "paid") status = "paid";
  else status = "pending"; // e.g. a delayed payment method — a later event will confirm or fail it

  const metadata = session.metadata || {};
  const record = {
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    status: status,
    amountPence: session.amount_total || 0,
    currency: session.currency || "gbp",
    name: metadata.customer_name || (session.customer_details && session.customer_details.name) || null,
    email: (session.customer_details && session.customer_details.email) || session.customer_email || null,
    reference: metadata.reference || null,
    livemode: !!event.livemode
  };

  if (!record.sessionId) {
    return jsonResponse(400, { error: "Missing session id" });
  }

  // Record first; only email if this is new information, so Stripe's
  // automatic retries don't send duplicate emails. If the DB is unavailable,
  // still email (better a duplicate email than a missed payment).
  let isNew = true;
  try {
    isNew = await saveToDatabase(record, env);
  } catch (err) {
    console.error("payment-webhook.js DB error:", err && err.message ? err.message : err);
  }

  if (isNew) {
    try {
      await sendEmail(record, env);
    } catch (err) {
      console.error("payment-webhook.js email error:", err && err.message ? err.message : err);
    }
  }

  return jsonResponse(200, { received: true });
}
