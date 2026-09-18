/**
 * Brilliant Beacon Services — functions/api/contact.js (Cloudflare Pages Function)
 *
 * Receives contact-form submissions, validates them server-side, and sends
 * an email to info@brilliantbeaconservices.co.uk via Resend
 * (https://resend.com). The API key lives ONLY in the Cloudflare Pages
 * environment variable RESEND_API_KEY — never in frontend code.
 *
 * Setup required before this will actually send anything:
 *   1. Create a free Resend account and verify the brilliantbeaconservices.co.uk
 *      domain by adding the DNS records Resend gives you (this is what lets
 *      Resend send mail "from" that domain instead of it being flagged as spam).
 *   2. Create an API key in Resend and set it as RESEND_API_KEY in Cloudflare
 *      Pages' environment variables (Workers & Pages → your project →
 *      Settings → Environment variables).
 *   3. Update the "from" address below once the domain is verified, if
 *      different from no-reply@brilliantbeaconservices.co.uk.
 * Until RESEND_API_KEY is set, submissions fail safely and the visitor sees
 * a friendly "please try again or contact us directly" message.
 *
 * To switch to a different provider later (SendGrid, Postmark, Mailgun,
 * etc.), only sendEmail() below needs to change — everything else (the
 * validation, the honeypot, the response shape) stays the same.
 *
 * Cloudflare Pages Functions routing: this file's path
 * (functions/api/contact.js) automatically maps to the URL /api/contact —
 * no redirects config needed. Environment variables are read from
 * context.env instead of Netlify's process.env, and responses are standard
 * Fetch API Response objects instead of Netlify's { statusCode, body } shape.
 */

const RECIPIENT_EMAIL = "info@brilliantbeaconservices.co.uk";
const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const ALLOWED_SERVICES = [
  "Home Maintenance",
  "Cleaning",
  "Wardrobe Repair & Assembly",
  "Painting",
  "Decoration",
  "Multiple Services",
  "Other / Not Sure"
];

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validate(payload) {
  const errors = [];

  if (!payload.name || typeof payload.name !== "string" || !payload.name.trim() || payload.name.length > MAX_FIELD_LENGTH) {
    errors.push("A valid name is required.");
  }
  if (!isValidEmail(payload.email)) {
    errors.push("A valid email address is required.");
  }
  if (payload.telephone && (typeof payload.telephone !== "string" || payload.telephone.length > 40)) {
    errors.push("Telephone number is invalid.");
  }
  if (payload.preferredContact && !["Email", "Phone"].includes(payload.preferredContact)) {
    errors.push("Preferred contact method is invalid.");
  }
  if (!payload.service || !ALLOWED_SERVICES.includes(payload.service)) {
    errors.push("A valid service selection is required.");
  }
  if (!payload.message || typeof payload.message !== "string" || !payload.message.trim() || payload.message.length > MAX_MESSAGE_LENGTH) {
    errors.push("A message is required.");
  }

  return errors;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the enquiry email via Resend (https://resend.com/docs/api-reference/emails/send-email).
 */
async function sendEmail(payload, env) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const now = new Date();

  const textBody = [
    "New Brilliant Beacon Services Enquiry",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Telephone: ${payload.telephone || "Not provided"}`,
    `Preferred contact method: ${payload.preferredContact || "Not specified"}`,
    `Service: ${payload.service}`,
    `Message: ${payload.message}`,
    `Source: ${payload.source || "Website Contact Form"}`,
    `Date: ${now.toLocaleDateString("en-GB")}`,
    `Time: ${now.toLocaleTimeString("en-GB")}`
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: "Brilliant Beacon Services <no-reply@brilliantbeaconservices.co.uk>",
      to: [RECIPIENT_EMAIL],
      reply_to: payload.email,
      subject: `New Enquiry: ${payload.service} — ${payload.name}`,
      text: textBody
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(function () { return ""; });
    throw new Error(`Resend responded with status ${response.status}: ${errorText}`);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Basic request-size guard
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 20000) {
    return jsonResponse(413, { error: "Request too large" });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  // Honeypot: a real visitor never fills this hidden field. If it has a
  // value, silently accept without sending an email (looks like spam).
  if (payload["company-website"]) {
    return jsonResponse(200, { success: true });
  }

  const errors = validate(payload);
  if (errors.length) {
    return jsonResponse(400, { error: "Validation failed", details: errors });
  }

  const clean = {
    name: escapeHtml(payload.name.trim()),
    email: payload.email.trim(),
    telephone: payload.telephone ? escapeHtml(String(payload.telephone).trim()) : "",
    preferredContact: payload.preferredContact ? escapeHtml(String(payload.preferredContact).trim()) : "",
    service: payload.service,
    message: escapeHtml(payload.message.trim()),
    source: payload.source ? escapeHtml(String(payload.source).trim()) : "Website Contact Form"
  };

  try {
    await sendEmail(clean, env);
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error("contact.js error:", err && err.message ? err.message : err);
    return jsonResponse(502, { error: "Your message could not be sent. Please try again or contact us directly." });
  }
}
