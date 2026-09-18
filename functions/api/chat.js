/**
 * Brilliant Beacon Services — functions/api/chat.js (Cloudflare Pages Function)
 *
 * Server-side proxy between the website chatbot and OpenAI. The API key
 * lives ONLY in the Cloudflare Pages environment variable OPENAI_API_KEY
 * (Workers & Pages → your project → Settings → Environment variables) — it
 * is never sent to the browser and never appears in this file.
 *
 * This function restricts the assistant to a fixed, factual knowledge base
 * about Brilliant Beacon Services (see KNOWLEDGE_BASE below) and instructs
 * it not to invent prices, appointments, availability, qualifications,
 * guarantees, discounts, reviews or certifications. Update KNOWLEDGE_BASE
 * as the business confirms real information — do not let the model guess.
 *
 * Uses OpenAI's Responses API (https://api.openai.com/v1/responses), which
 * is OpenAI's current recommended endpoint for new integrations. The model
 * name is set via the OPENAI_MODEL environment variable, defaulting to
 * "gpt-5-mini" — a small, low-cost model suitable for a simple support
 * chatbot. OpenAI's model lineup moves quickly, so before going live it's
 * worth checking https://platform.openai.com/docs/models for the current
 * cheapest/recommended small model and setting OPENAI_MODEL accordingly if
 * a newer, cheaper option exists.
 *
 * Cloudflare Pages Functions routing: this file's path (functions/api/chat.js)
 * automatically maps to the URL /api/chat — no redirects config needed.
 * The handler receives a `context` object ({ request, env, ... }) instead of
 * Netlify's (event, context); environment variables are read from
 * context.env instead of process.env, and the return value is a standard
 * Fetch API Response instead of a { statusCode, headers, body } object.
 */

const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 20;

// ---------------------------------------------------------------------------
// Knowledge base — confirmed facts only. Keep this in sync with the site.
// Anything not covered here should be answered with "please contact our team".
// ---------------------------------------------------------------------------
const KNOWLEDGE_BASE = `
You are the website assistant for Brilliant Beacon Services, a UK-based home
maintenance, cleaning, painting, decoration and wardrobe repair business.

CONFIRMED FACTS YOU MAY SHARE:
- Services offered: Home Maintenance, Cleaning, Wardrobe Repair & Assembly,
  Painting, Decoration (Decoration covers wallpapering, feature walls,
  decorative painting, and ceiling and bathroom finishing touches).
- Service area: UK-wide.
- Legal business name: Brilliant Beacon Services Ltd (company number 17156886).
- Business address: 128 City Road, London, EC1V 2NX, United Kingdom.
- Contact email: info@brilliantbeaconservices.co.uk
- Contact phone: +44 7448 139783
- Opening hours: Monday to Saturday, 7am to 9pm. Closed Sundays.
- Quotes: customers can request a quote via the Contact page, phone, email, or
  by asking you to collect their details for a human follow-up.
- Payments: PayPal, card payment, and bank transfer are supported where
  configured — see the website's Payment page for current availability.
- The company does not have published prices, reviews, certifications,
  awards, years-of-experience figure, or guarantee terms confirmed in this
  system yet.

STRICT RULES:
- Do NOT invent or estimate: prices, quotes, appointment availability,
  qualifications, certifications, awards, years of experience, number of
  customers, guarantees, discounts, or reviews/testimonials.
- If asked for anything not covered by the confirmed facts above, say you
  don't have that information confirmed and offer to connect the customer
  with the team via the Contact page or by collecting their details.
- Keep answers short, friendly, and focused on Brilliant Beacon Services.
- If the user wants to book work or get a firm price, direct them to request
  a quote via the Contact page rather than attempting to give one yourself.
`;

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

function sanitiseMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return null;
  const trimmed = rawMessages.slice(-MAX_MESSAGES);

  for (const msg of trimmed) {
    if (!msg || typeof msg.content !== "string" || !["user", "assistant"].includes(msg.role)) {
      return null;
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      return null;
    }
  }
  return trimmed;
}

/**
 * Pulls the assistant's reply text out of an OpenAI Responses API result.
 * Checks the documented output_text convenience field first, then falls
 * back to walking the output array (belt-and-braces against API shape
 * changes, since this surface has moved fast historically).
 */
function extractReplyText(data) {
  if (data && typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (data && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item && item.type === "message" && Array.isArray(item.content)) {
        for (const part of item.content) {
          if (part && typeof part.text === "string" && part.text.trim()) {
            return part.text.trim();
          }
        }
      }
    }
  }
  return null;
}

/**
 * Calls OpenAI's Responses API. Fails gracefully (throws, caught by the
 * handler below) if OPENAI_API_KEY isn't configured yet, rather than
 * silently pretending to work.
 */
async function callAIProvider(messages, env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = env.OPENAI_MODEL || "gpt-5-mini";

  const input = [
    { type: "message", role: "developer", content: [{ type: "input_text", text: KNOWLEDGE_BASE }] },
    ...messages.map(function (msg) {
      return {
        type: "message",
        role: msg.role,
        content: [{ type: "input_text", text: msg.content }]
      };
    })
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input })
  });

  if (!response.ok) {
    throw new Error(`OpenAI responded with status ${response.status}`);
  }

  const data = await response.json();
  const reply = extractReplyText(data);

  if (!reply) {
    throw new Error("OpenAI returned an unexpected response shape");
  }

  return reply;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  const messages = sanitiseMessages(body.messages);
  if (!messages || !messages.length) {
    return jsonResponse(400, { error: "Invalid or missing messages" });
  }

  try {
    const reply = await callAIProvider(messages, env);
    return jsonResponse(200, { reply });
  } catch (err) {
    // Never leak internal error details or stack traces to the client.
    console.error("chat.js error:", err && err.message ? err.message : err);
    return jsonResponse(200, {
      reply: "Sorry, our assistant is temporarily unavailable. Please contact our team directly at info@brilliantbeaconservices.co.uk."
    });
  }
}

// Cloudflare Pages Functions automatically returns 405 Method Not Allowed
// for any HTTP method that has no matching onRequest<Method> export, so a
// GET/PUT/DELETE etc. to /api/chat is rejected without any extra code here.
