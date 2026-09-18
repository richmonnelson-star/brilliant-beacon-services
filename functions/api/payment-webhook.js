/**
 * Brilliant Beacon Services — functions/api/payment-webhook.js (Cloudflare Pages Function)
 *
 * Receives and verifies webhook events from the payment provider, and is
 * the ONLY place a payment should be treated as confirmed — reaching
 * payment-success.html in the browser is not, by itself, proof of payment.
 *
 * Verification depends entirely on the chosen provider's webhook signing
 * scheme (e.g. Stripe's `stripe-signature` header + signing secret). The
 * signing secret lives ONLY in the Cloudflare Pages environment variable
 * PAYMENT_PROVIDER_SECRET (or a dedicated *_WEBHOOK_SECRET variable) —
 * never in frontend code.
 *
 * This is a documented stub until a real provider is connected: it
 * verifies nothing yet and simply logs receipt, because we cannot invent
 * a verification scheme without knowing which provider will be used.
 *
 * Cloudflare Pages Functions routing: this file's path
 * (functions/api/payment-webhook.js) automatically maps to the URL
 * /api/payment-webhook — no redirects config needed. Note that Stripe's
 * own Node SDK (`stripe.webhooks.constructEvent`) relies on Node's crypto
 * module in a way that doesn't run in Cloudflare's Workers runtime; use
 * Stripe's documented Web Crypto-compatible verification instead
 * (`stripe.webhooks.constructEventAsync` from the "stripe" package's
 * edge-compatible build) when a provider is connected.
 */

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const webhookSecret = env.PAYMENT_PROVIDER_SECRET;
  if (!webhookSecret) {
    console.error("payment-webhook.js: PAYMENT_PROVIDER_SECRET not configured — cannot verify webhook.");
    return jsonResponse(503, { error: "Webhook verification not configured." });
  }

  // Example only — replace with your provider's actual signature
  // verification. For Stripe on Cloudflare's Workers runtime, use the
  // async, Web-Crypto-based verifier rather than the Node-only one:
  //
  //   const signature = request.headers.get("stripe-signature");
  //   const rawBody = await request.text();
  //   let stripeEvent;
  //   try {
  //     stripeEvent = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  //   } catch (err) {
  //     return jsonResponse(400, { error: "Invalid webhook signature" });
  //   }
  //
  // Only after signature verification should a payment be treated as
  // confirmed, and only then should a confirmation email be sent to
  // info@brilliantbeaconservices.co.uk using details FROM THE VERIFIED
  // EVENT (never from unauthenticated client input).

  try {
    // No provider connected yet — nothing to verify. Do not treat any
    // request to this endpoint as a confirmed payment until real
    // signature verification is implemented above.
    console.log("payment-webhook.js received a request, but no payment provider is configured yet.");
    return jsonResponse(503, { error: "Payment webhook verification not yet implemented — see README.md 'Payments'." });
  } catch (err) {
    console.error("payment-webhook.js error:", err && err.message ? err.message : err);
    return jsonResponse(400, { error: "Webhook could not be processed." });
  }
}
