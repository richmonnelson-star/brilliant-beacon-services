/* ==========================================================================
   Brilliant Beacon Services — contact.js
   Client-side validation + submission to the /api/contact Netlify function.
   Server-side validation also happens in netlify/functions/contact.js —
   client-side checks are a convenience, not a security boundary.
   ========================================================================== */

(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  if (!form) return;

  var statusEl = document.getElementById("form-status");
  var submitBtn = document.getElementById("contact-submit");

  var fields = {
    name: { input: document.getElementById("name"), wrap: document.getElementById("field-name") },
    email: { input: document.getElementById("email"), wrap: document.getElementById("field-email") },
    service: { input: document.getElementById("service"), wrap: document.getElementById("field-service") },
    message: { input: document.getElementById("message"), wrap: document.getElementById("field-message") }
  };

  function setError(field, hasError) {
    field.wrap.classList.toggle("has-error", hasError);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    var valid = true;

    if (!fields.name.input.value.trim()) { setError(fields.name, true); valid = false; }
    else { setError(fields.name, false); }

    if (!isValidEmail(fields.email.input.value.trim())) { setError(fields.email, true); valid = false; }
    else { setError(fields.email, false); }

    if (!fields.service.input.value) { setError(fields.service, true); valid = false; }
    else { setError(fields.service, false); }

    if (!fields.message.input.value.trim()) { setError(fields.message, true); valid = false; }
    else { setError(fields.message, false); }

    return valid;
  }

  function showStatus(type, message) {
    statusEl.hidden = false;
    statusEl.className = "form-status " + type;
    statusEl.textContent = message;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validate()) {
      showStatus("error", "Please check the highlighted fields and try again.");
      return;
    }

    // Honeypot check — if this hidden field has a value, silently treat as spam
    var honeypot = document.getElementById("company-website");
    if (honeypot && honeypot.value) {
      showStatus("success", "Thank you. Your enquiry has been sent successfully. We'll get back to you as soon as possible.");
      form.reset();
      return;
    }

    var preferredContactEl = document.getElementById("preferred-contact");

    var payload = {
      name: fields.name.input.value.trim(),
      email: fields.email.input.value.trim(),
      telephone: document.getElementById("telephone").value.trim(),
      preferredContact: preferredContactEl ? preferredContactEl.value : "",
      service: fields.service.input.value,
      message: fields.message.input.value.trim(),
      source: "Website Contact Form"
    };

    submitBtn.disabled = true;
    showStatus("loading", "Sending your enquiry...");

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then(function () {
        showStatus("success", "Thank you. Your enquiry has been sent successfully. We'll get back to you as soon as possible.");
        form.reset();
      })
      .catch(function () {
        showStatus("error", "We couldn't send your enquiry right now. Please try again or email us directly at info@brilliantbeaconservices.co.uk.");
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
