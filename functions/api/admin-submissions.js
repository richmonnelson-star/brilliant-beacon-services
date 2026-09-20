/**
 * Brilliant Beacon Services — functions/api/admin-submissions.js
 *
 * Returns contact form submissions stored in D1, protected by a simple
 * shared password. This is intentionally lightweight (no user accounts,
 * no sessions) — it exists purely so the site owner can see enquiries in a
 * normal table instead of running SQL by hand in the D1 console.
 *
 * How the password check works: the admin page (admin.html) sends the
 * password the visitor typed in a custom request header, X-Admin-Password.
 * This function compares it to the ADMIN_PASSWORD environment variable
 * (set as a Secret in Cloudflare Pages — never committed to the repo).
 * Because everything travels over HTTPS, this is no less secure than a
 * standard login form; it's just simpler to build and maintain.
 *
 * Setup required before this works:
 *   1. In Cloudflare Pages → your project → Settings → Environment
 *      variables, add a Secret named ADMIN_PASSWORD with a strong password.
 *   2. Redeploy so the Function picks up the new variable.
 *   3. Visit /admin.html and enter that same password.
 */

function jsonResponse(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD) {
    return jsonResponse(500, { error: "ADMIN_PASSWORD is not configured on the server." });
  }

  const suppliedPassword = request.headers.get("X-Admin-Password") || "";

  // Constant-time-ish comparison isn't critical here (this isn't a
  // cryptographic secret shared with untrusted parties at scale), but a
  // simple length + value check is enough for this use case.
  if (!suppliedPassword || suppliedPassword !== env.ADMIN_PASSWORD) {
    return jsonResponse(401, { error: "Incorrect password." });
  }

  if (!env.DB) {
    return jsonResponse(500, { error: "DB binding is not configured." });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, email, telephone, preferred_contact, service, message, created_at
       FROM contact_submissions
       ORDER BY created_at DESC`
    ).all();

    return jsonResponse(200, { success: true, submissions: results });
  } catch (err) {
    return jsonResponse(500, { error: "Could not read submissions: " + (err && err.message ? err.message : String(err)) });
  }
}
