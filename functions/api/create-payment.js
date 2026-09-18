/**
 * Brilliant Beacon Services — functions/api/create-payment.js (Cloudflare Pages Function)
 *
 * Creates a hosted payment/checkout session with a payment provider
 * (e.g. Stripe) for card payments. The provider's SECRET key lives ONLY in
 * the Cloudflare Pages environment variable PAYMENT_PROVIDER_SECRET — never
 * in frontend code, and this function never returns it to the browser.
 *
 * This is a documented stub: it returns a clear "not configured" error
 * until a real payment provider account and secret key are connected.
 * Do not invent or hard-code a payment link or amount here.
 *
 * Cloudflare Pages Functions routing: this file's path
 * (functions/api/create-payment.js) automatically maps to the URL
 * /api/create-payment — no redirects config needed.
 */

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const secret = env.PAYMENT_PROVIDER_SECRET;
  if (!secret) {
    // Fail safely and clearly — the frontend redirects to payment-error.html
    // when this endpoint does not return a checkoutUrl.
    return jsonResponse(503, { error: "Card payments are not yet configured." });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  // Example only — replace with your chosen payment provider's REST API
  // (Cloudflare Workers/Pages Functions cannot use Node-only SDKs that rely
  // on Node's `http`/`net` modules — use fetch() against the provider's
  // REST API instead) to create a real hosted checkout session, e.g. for
  // Stripe's REST API directly via fetch:
  //
  //   const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
  //     method: "POST",
  //     headers: {
  //       "Authorization": `Bearer ${secret}`,
  //       "Content-Type": "application/x-www-form-urlencoded"
  //     },
  //     body: new URLSearchParams({
  //       mode: "payment",
  //       "line_items[0][price]": "price_xxx",
  //       "line_items[0][quantity]": "1",
  //       success_url: "https://brilliantbeaconservices.co.uk/payment-success.html",
  //       cancel_url: "https://brilliantbeaconservices.co.uk/payment-cancelled.html"
  //     })
  //   });
  //   const session = await res.json();
  //   return jsonResponse(200, { checkoutUrl: session.url });

  try {
    throw new Error("Payment provider integration not yet implemented — see README.md 'Payments'.");
  } catch (err) {
    console.error("create-payment.js error:", err && err.message ? err.message : err);
    return jsonResponse(502, { error: "We couldn't start your payment. Please try again or choose another payment method." });
  }
}
