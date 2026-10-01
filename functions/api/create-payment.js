/**
 * Brilliant Beacon Services — functions/api/create-payment.js (Cloudflare Pages Function)
 *
 * Creates a Stripe Checkout Session for a card payment and returns its
 * hosted-checkout URL. The customer enters their name, email, the amount
 * they've been quoted/invoiced, and a reference on payment.html; card
 * details are only ever entered on Stripe's own hosted page.
 *
 * Environment variables (Cloudflare Pages → Settings → Variables and Secrets):
 *   STRIPE_SECRET_KEY  — your Stripe secret key (sk_live_... or sk_test_...).
 *                        Set as a Secret. Never put it in frontend code.
 *
 * Uses Stripe's REST API via fetch() (Stripe's Node SDK doesn't run on the
 * Cloudflare Workers runtime without extra build tooling).
 *
 * Routing: functions/api/create-payment.js → /api/create-payment
 */

const MIN_PENCE = 100;          // £1.00
const MAX_PENCE = 1000000;      // £10,000.00 — raise if you take larger payments online
const MAX_FIELD_LENGTH = 200;

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function isValidEmail(value) {
  return typeof value === "string" && value.length <= MAX_FIELD_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Converts a pounds string like "125", "125.5" or "£1,250.00" to integer pence, or null. */
function poundsToPence(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value).replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const secretKey = env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("create-payment.js: STRIPE_SECRET_KEY is not configured.");
    return jsonResponse(503, { error: "Card payments are not yet configured." });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 10000) {
    return jsonResponse(413, { error: "Request too large" });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  // Honeypot — real visitors never fill this hidden field.
  if (payload["company-website"]) {
    return jsonResponse(400, { error: "Invalid request" });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const reference = typeof payload.reference === "string" ? payload.reference.trim() : "";
  const pence = poundsToPence(payload.amount);

  const errors = [];
  if (!name || name.length > MAX_FIELD_LENGTH) errors.push("A valid name is required.");
  if (!isValidEmail(email)) errors.push("A valid email address is required.");
  if (!reference || reference.length > MAX_FIELD_LENGTH) errors.push("A payment reference is required.");
  if (pence === null || pence < MIN_PENCE || pence > MAX_PENCE) {
    errors.push(`Amount must be between £${(MIN_PENCE / 100).toFixed(2)} and £${(MAX_PENCE / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}.`);
  }
  if (errors.length) {
    return jsonResponse(400, { error: "Validation failed", details: errors });
  }

  // Use the origin the visitor is on, so preview deployments redirect back
  // to themselves and the live site redirects to the live domain.
  const origin = new URL(request.url).origin;

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("customer_email", email);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "gbp");
  params.append("line_items[0][price_data][unit_amount]", String(pence));
  params.append("line_items[0][price_data][product_data][name]", "Brilliant Beacon Services — Payment");
  params.append("line_items[0][price_data][product_data][description]", `Reference: ${reference}`);
  params.append("metadata[customer_name]", name);
  params.append("metadata[reference]", reference);
  params.append("payment_intent_data[description]", `Brilliant Beacon Services — ${reference} — ${name}`);
  params.append("payment_intent_data[metadata][customer_name]", name);
  params.append("payment_intent_data[metadata][reference]", reference);
  params.append("success_url", `${origin}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/payment-cancelled.html`);

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-06-20"
      },
      body: params.toString()
    });
    const session = await res.json();

    if (!res.ok || !session.url) {
      const msg = session && session.error ? session.error.message : `status ${res.status}`;
      throw new Error(`Stripe error: ${msg}`);
    }

    return jsonResponse(200, { checkoutUrl: session.url });
  } catch (err) {
    console.error("create-payment.js error:", err && err.message ? err.message : err);
    return jsonResponse(502, { error: "We couldn't start your payment. Please try again or choose another payment method." });
  }
}
