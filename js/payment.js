/* ==========================================================================
   Brilliant Beacon Services — payment.js
   Payment page interactions. No payment provider secret keys are ever
   referenced here — session/order creation happens server-side via
   functions/api/create-payment.js (Stripe Checkout).
   ========================================================================== */

(function () {
  "use strict";

  /* ---- PayPal button ---- */
  var paypalBtn = document.getElementById("paypal-button");
  if (paypalBtn) {
    var paypalLink = paypalBtn.getAttribute("data-paypal-link");
    var isConfigured = paypalLink && paypalLink.indexOf("PAYPAL_PAYMENT_LINK") === -1;

    if (isConfigured) {
      paypalBtn.href = paypalLink;
      paypalBtn.removeAttribute("aria-disabled");
    } else {
      paypalBtn.addEventListener("click", function (e) {
        e.preventDefault();
        alert("PayPal payments are not yet configured. Please contact us to arrange payment, or use bank transfer.");
      });
    }
  }

  /* ---- Card payment (Stripe Checkout) ---- */
  var cardForm = document.getElementById("card-pay-form");
  if (cardForm) {
    var statusEl = document.getElementById("card-form-status");
    var submitBtn = document.getElementById("card-pay-button");
    var originalLabel = submitBtn ? submitBtn.textContent : "";

    function setStatus(type, msg) {
      if (!statusEl) return;
      statusEl.className = "form-status " + type;
      statusEl.textContent = msg;
      statusEl.hidden = !msg;
    }

    function parsePence(value) {
      var cleaned = String(value || "").replace(/[£,\s]/g, "");
      if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
      return Math.round(parseFloat(cleaned) * 100);
    }

    function check(fieldId, ok) {
      var field = document.getElementById(fieldId);
      if (field) field.classList.toggle("has-error", !ok);
      return ok;
    }

    cardForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {
        name: cardForm.name.value.trim(),
        email: cardForm.email.value.trim(),
        amount: cardForm.amount.value.trim(),
        reference: cardForm.reference.value.trim(),
        "company-website": cardForm["company-website"].value
      };
      var pence = parsePence(data.amount);
      var valid = [
        check("field-card-name", !!data.name),
        check("field-card-email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)),
        check("field-card-amount", pence !== null && pence >= 100 && pence <= 1000000),
        check("field-card-reference", !!data.reference)
      ].every(Boolean);
      if (!valid) {
        setStatus("error", "Please check the highlighted fields.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Redirecting to secure payment…";
      setStatus("loading", "Preparing your secure payment page…");

      fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (res.ok && body && body.checkoutUrl) {
              window.location.href = body.checkoutUrl;
              return;
            }
            if (res.status === 400 && body && body.details) {
              throw new Error(body.details.join(" "));
            }
            window.location.href = "payment-error.html";
          });
        })
        .catch(function (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
          setStatus("error", err && err.message ? err.message : "Something went wrong. Please try again.");
        });
    });
  }
})();
