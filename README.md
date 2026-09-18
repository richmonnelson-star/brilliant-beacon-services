# Brilliant Beacon Services — Website

A complete, editable website project for Brilliant Beacon Services (home maintenance, cleaning, wardrobe repair & assembly, painting and decoration), built as static HTML/CSS/JS with Netlify Functions for the AI chatbot, contact form email, and payments.

**Production domain:** https://brilliantbeaconservices.co.uk
**Business email:** info@brilliantbeaconservices.co.uk

---

## ⚠️ Before this goes live

This project is a complete, working scaffold — but several things still need real information from Brilliant Beacon Services before launch. Search the codebase for `PLACEHOLDER — INFORMATION REQUIRED` to find every spot:

- Legal review of `privacy.html`, `cookies.html`, `terms.html`, `payment-terms.html`
- A confirmed payment provider (see "Environment Variables" below) — the AI provider (OpenAI), email provider (Resend) and analytics provider (Plausible) are now decided, but the analytics domain still needs to be verified in a real Plausible account (see "Website Analytics" below) before stats will start recording
- Real PayPal payment link and bank transfer details
- Several photographs in `images/_held-for-review/` were **not** used on the site — some appear to show a property in Palm Bay, Florida (not a London property), one shows another company's branding on a scaffolding sign, and one shows what looks like a third-party company logo on a worker's workwear. Confirm whether any of these belong to the business, or supply alternative photos, before using them anywhere.

Nothing fake (prices, reviews, certifications, phone numbers, payment links, bank details) has been invented anywhere in this project.

---

## 1. Project Structure

```
brilliant-beacon-services/
├── index.html, about.html, services.html, faq.html, contact.html
├── payment.html, payment-success.html, payment-cancelled.html, payment-error.html
├── privacy.html, cookies.html, terms.html, payment-terms.html
├── css/
│   ├── style.css         → design system (CSS variables), layout, components
│   └── responsive.css    → mobile/tablet breakpoints
├── js/
│   ├── main.js           → footer year, gallery lightbox
│   ├── navigation.js     → accessible mobile menu
│   ├── chatbot.js        → chat widget UI, talks to /api/chat
│   ├── contact.js        → contact form validation + submission
│   ├── faq.js            → accordion + category filter
│   └── payment.js        → payment page button behaviour
├── images/
│   ├── logo/             → the real Brilliant Beacon Services logo
│   ├── hero/              → homepage hero photo
│   ├── services/          → per-service photos
│   ├── before-after/      → before/after pairs
│   ├── gallery/           → general gallery photos
│   └── _held-for-review/  → photos NOT used on the site (see warning above)
├── assets/
│   ├── icons/             → place custom icon assets here if added later
│   └── fonts/             → place self-hosted font files here if added later
├── netlify/functions/
│   ├── chat.js             → AI chatbot backend proxy
│   ├── contact.js          → sends contact-form enquiries by email
│   ├── create-payment.js   → creates a hosted card-payment session
│   └── payment-webhook.js  → verifies payment confirmations
├── netlify.toml           → build config, API redirects, security headers
├── robots.txt / sitemap.xml
├── .gitignore
└── README.md
```

Every page is a full, separate HTML file (no build step required) so it can be opened, edited and understood directly — this is intentional for a vanilla HTML/CSS/JS project with no framework.

---

## 2. Local Development

No build tools are required. To preview the site locally:

```bash
# Option A: Node's built-in static server
npx serve .

# Option B: Python
python3 -m http.server 8080
```

Then open the printed local URL in your browser. Note: the chatbot, contact form and payment buttons call `/api/...` endpoints that only exist once deployed to Netlify (or run locally with the Netlify CLI — see below).

To run the Netlify Functions locally too:

```bash
npm install -g netlify-cli
netlify dev
```

This serves the site and functions together, using a local `.env` file for environment variables (see below).

---

## 3. Deploying to Netlify

1. Push this project to a Git repository (GitHub, GitLab or Bitbucket).
2. In Netlify: **Add new site → Import an existing project**, and connect the repository.
3. Build settings: publish directory `.` (root), no build command needed. These are already set in `netlify.toml`.
4. Add the environment variables listed below under **Site settings → Environment variables**.
5. Deploy. Netlify will give you a temporary `*.netlify.app` URL — do not use this in production SEO metadata (the site already uses `https://brilliantbeaconservices.co.uk` throughout).

---

## 4. Cloudflare + Domain Setup

1. **Add the domain to Cloudflare** and note the two nameservers Cloudflare gives you.
2. **Update nameservers** at your domain registrar to the Cloudflare ones (if Cloudflare is managing DNS).
3. **Configure DNS**: add the DNS records Netlify provides (typically a CNAME for `www` pointing to your Netlify site, and an A/ALIAS record for the root domain — use the exact values Netlify shows you under **Site settings → Domain management**, not invented values).
4. **Connect the custom domain in Netlify**: Site settings → Domain management → Add custom domain → `brilliantbeaconservices.co.uk`.
5. **HTTPS**: Netlify provisions a free SSL certificate automatically once DNS is verified. In Cloudflare, set SSL/TLS mode to "Full (strict)".
6. **Force HTTPS**: enable "Force HTTPS" in Netlify's domain settings.
7. **Root domain + www**: decide which is canonical (this project assumes the root domain, `brilliantbeaconservices.co.uk`, is canonical — update `<link rel="canonical">` tags if you choose `www` instead) and set up a redirect from the other.
8. **Test DNS propagation** using a tool like `dig brilliantbeaconservices.co.uk` or an online propagation checker.
9. **Test the live site**: navigation, forms, images.
10. **Test the chatbot**: send a message and confirm a reply (requires `OPENAI_API_KEY` to be set).
11. **Test contact email**: submit the contact form and confirm an email arrives (requires `RESEND_API_KEY` and a verified sending domain in Resend).
12. **Test payments**: once a provider is connected, run a real test transaction in that provider's test/sandbox mode before going live.

---

## 5. AI Chatbot

The chatbot UI (`js/chatbot.js`) sends conversation history to `/api/chat`, which Netlify redirects (see `netlify.toml`) to `netlify/functions/chat.js`. That function:

- Holds a fixed **knowledge base** of confirmed facts about Brilliant Beacon Services (edit the `KNOWLEDGE_BASE` constant in `chat.js` as real information is confirmed).
- Refuses to invent prices, appointments, guarantees, certifications, or reviews — it's instructed to offer human contact instead.
- Calls **OpenAI's Responses API** (`https://api.openai.com/v1/responses`) using the `OPENAI_API_KEY` environment variable. The model is set via the optional `OPENAI_MODEL` environment variable, defaulting to `gpt-5-mini` — a small, low-cost model suitable for a simple support chatbot. OpenAI's model lineup changes fairly often, so check [platform.openai.com/docs/models](https://platform.openai.com/docs/models) for the current recommended small/cheap model before going live, and set `OPENAI_MODEL` if you want to use a different one.

**To go live:**
1. Create an API key at [platform.openai.com](https://platform.openai.com/api-keys).
2. Add it to Netlify as the `OPENAI_API_KEY` environment variable (Site settings → Environment variables) — never put it in any file in this project.
3. (Optional) Add an `OPENAI_MODEL` environment variable if you want to override the default model.
4. Set a spending limit on the OpenAI account, since the function will make one API call per chat message sent by a visitor.

Until `OPENAI_API_KEY` is set, the chatbot will show a friendly "temporarily unavailable" message rather than fail with a technical error.

---

## 6. Email (Contact Form)

Contact form submissions go to `netlify/functions/contact.js`, which validates the input server-side (in addition to the client-side checks in `js/contact.js`) and sends an email to **info@brilliantbeaconservices.co.uk** using **Resend** (https://resend.com) via the `RESEND_API_KEY` environment variable.

**To go live:**
1. Create a free Resend account at [resend.com](https://resend.com).
2. Verify the `brilliantbeaconservices.co.uk` domain in Resend by adding the DNS records it gives you (this proves to mailbox providers that Resend is allowed to send mail on the domain's behalf, so messages don't land in spam).
3. Create an API key in Resend and add it to Netlify as the `RESEND_API_KEY` environment variable (Site settings → Environment variables) — never put it in any file in this project.
4. Confirm the `from` address in `sendEmail()` (currently `no-reply@brilliantbeaconservices.co.uk`) matches the verified domain.

Until `RESEND_API_KEY` is set, submissions fail safely and the visitor sees "Your message could not be sent. Please try again or contact us directly." Resend's free tier covers 3,000 emails/month, which is generous for a contact form; if that's ever outgrown, swapping providers only means editing `sendEmail()` in `contact.js` — the rest of the function (validation, honeypot, response handling) doesn't need to change.

The function includes a honeypot spam check, field-length limits, and email format validation. For production, also consider adding Cloudflare Turnstile (see "Security" below).

---

## 7. Website Analytics

This site uses **Plausible Analytics** (https://plausible.io) — a cookie-free, privacy-focused analytics tool. The tracking script is already added to every page's `<head>`:

```html
<script defer data-domain="brilliantbeaconservices.co.uk" src="https://plausible.io/js/script.js"></script>
```

**To go live:**
1. Create a Plausible account at [plausible.io](https://plausible.io) and add `brilliantbeaconservices.co.uk` as a site.
2. No API key or environment variable is needed for basic pageview tracking — Plausible starts recording as soon as the domain is verified and the site is live (the script is already in place).
3. View stats at [plausible.io](https://plausible.io) once logged in.

Because Plausible doesn't use cookies or collect personal data, no cookie-consent banner is required for it — this is reflected in `privacy.html` and `cookies.html`. `netlify.toml`'s Content-Security-Policy already allow-lists `https://plausible.io` in `script-src` and `connect-src`; if a different analytics tool is used instead, update the CSP and both legal pages to match.

---

## 8. Payments

The Payment page (`payment.html`) supports three methods, none of which are "live" until configured:

- **PayPal** — replace the `data-paypal-link="PAYPAL_PAYMENT_LINK"` attribute in `payment.html` with a real PayPal payment link supplied by Brilliant Beacon Services. `js/payment.js` automatically activates the button once a real link (not the placeholder text) is present.
- **Card payment** — `netlify/functions/create-payment.js` is a documented stub for creating a secure hosted checkout session with a payment provider (e.g. Stripe). It requires `PAYMENT_PROVIDER_SECRET` to be set, and its example code shows exactly where to add real provider calls.
- **Bank transfer** — replace the placeholders in the bank details table in `payment.html` with real account details once confirmed.

**Payment verification**: reaching `payment-success.html` does **not** by itself confirm a payment. `netlify/functions/payment-webhook.js` is where real, provider-verified confirmation should happen (via signature verification — see the comments in that file), before anything is treated as paid or an internal confirmation email is sent.

**No card data is ever collected or stored by this website** — card payment goes through your provider's own hosted checkout page.

---

## 9. Environment Variables

Set these in Netlify under **Site settings → Environment variables** (and in a local `.env` file for `netlify dev` — never commit `.env`, it's already in `.gitignore`):

| Variable | Used by | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | `netlify/functions/chat.js` | Authenticates with OpenAI for the chatbot |
| `OPENAI_MODEL` | `netlify/functions/chat.js` | *(optional)* Overrides the default chatbot model (`gpt-5-mini`) |
| `RESEND_API_KEY` | `netlify/functions/contact.js` | Authenticates with Resend to send contact-form notification emails |
| `PAYPAL_CLIENT_ID` | *(only if using PayPal's JS SDK/buttons rather than a payment link)* | PayPal integration |
| `PAYPAL_CLIENT_SECRET` | *(server-side PayPal API calls, if used)* | PayPal integration |
| `PAYMENT_PROVIDER_SECRET` | `netlify/functions/create-payment.js`, `payment-webhook.js` | Card payment provider secret key + webhook signature verification |
| `TURNSTILE_SECRET_KEY` | *(add if Cloudflare Turnstile is enabled — see Security)* | Bot/spam protection |

Only add the variables you actually end up using — remove any row above that doesn't apply once providers are chosen.

---

## 10. Images

- **Logo**: `images/logo/brilliant-beacon-logo.jpg` — the real supplied logo. Do not redesign it; replace this file if a new logo version is issued.
- **Adding new photos**: drop them into the matching folder (`hero/`, `services/`, `before-after/`, `gallery/`) and reference them from the relevant HTML page. Always write a factual, descriptive `alt` attribute — never claim a photo shows something it doesn't.
- **Held for review**: `images/_held-for-review/` contains four photographs that appear to show a property in Palm Bay, Florida rather than a UK job. They're excluded from `.gitignore` deployment consideration and not linked from any page — decide whether to delete them or move them into the main folders once confirmed.
- Compress large photos before adding them (e.g. with `squoosh.app` or `imagemin`) to keep page load fast — nothing in this project resizes images automatically.

---

## 11. Editing Content

Because there's no templating system, header/footer/navigation markup is repeated at the top and bottom of every HTML page. To change something site-wide (e.g. a nav link, the footer, or the chatbot markup), you currently need to update it in every `.html` file — search-and-replace across files is the fastest way to do this consistently.

- **Text**: edit directly in the relevant `.html` file.
- **Services**: edit the service cards in `index.html` and the detailed sections in `services.html`.
- **Colours / spacing / fonts**: edit the CSS variables at the top of `css/style.css` (`:root { ... }`) — everything else references these variables, so the whole site restyles from one place.
- **Buttons**: styled via `.btn`, `.btn-primary`, `.btn-secondary` classes in `css/style.css`.
- **FAQ**: add or edit `<div class="accordion-item">` blocks in `faq.html`, following the existing pattern (each needs a unique `id` on its panel).
- **Contact information**: update the placeholders in `contact.html`, every page footer, and the `LocalBusiness` structured data block in `index.html`.

---

## 12. Security

- No API keys, secrets, or passwords are ever present in any HTML, CSS or JS file shipped to the browser — they only exist as Netlify environment variables, read server-side inside `netlify/functions/*.js`.
- Contact and payment endpoints validate input server-side (not just in the browser) and cap request/field sizes.
- The contact form includes a honeypot field for basic spam filtering. For stronger protection, add [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) to `contact.html` and verify the token inside `netlify/functions/contact.js` using `TURNSTILE_SECRET_KEY`.
- `netlify.toml` sets baseline security headers (`X-Frame-Options`, `Content-Security-Policy`, `Referrer-Policy`, etc.) — adjust the `Content-Security-Policy` if you add new third-party scripts (e.g. a payment provider's JS SDK), since it will need to be added to the `script-src`/`connect-src` allow-list.
- Netlify Functions never return internal error details, stack traces, or provider error bodies to the browser — errors are logged server-side (visible in Netlify's function logs) and a generic, friendly message is returned instead.
- True rate limiting isn't implemented at the function level in this scaffold (serverless functions are stateless between invocations, so simple in-memory counters don't work reliably). For production, use Netlify's built-in rate limiting, Cloudflare rate limiting rules, or a shared store (e.g. Upstash Redis) if abuse becomes a concern.
- `.gitignore` excludes `.env` files so real secrets are never committed to version control.
