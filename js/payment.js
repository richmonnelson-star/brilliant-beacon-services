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
        alert("PayPal payments are coming soon. Please use Pay Online or Card or Bank, or contact us to arrange payment.");
      });
    }
  }

  /* ---- Card payment (Stripe Checkout) ---- */
  var cardForm = document.getElementById("card-pay-form");
  if (cardForm) {
    var statusEl = document.getElementById("card-form-status");
    var submitBtn = document.getElementById("card-pay-button");
    var methodInput = document.getElementById("card-method");
    var methodLabel = document.getElementById("payment-method-label");
    var detailsPanel = document.getElementById("payment-details");
    var METHODS = {
      wallet: { label: "Paying with Apple Pay / Google Pay", button: "Continue to Apple Pay / Google Pay" },
      any: { label: "Paying by card or bank", button: "Continue to Secure Payment" }
    };
    var originalLabel = submitBtn ? submitBtn.textContent : "";

    function chooseMethod(method, scroll) {
      if (!METHODS[method]) method = "any";
      if (methodInput) methodInput.value = method;
      if (methodLabel) methodLabel.textContent = METHODS[method].label;
      if (submitBtn) { submitBtn.textContent = METHODS[method].button; originalLabel = submitBtn.textContent; }
      var cards = document.querySelectorAll("[data-method-card]");
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle("is-selected", cards[i].getAttribute("data-method-card") === method);
      }
      if (scroll && detailsPanel) {
        detailsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        var first = document.getElementById("card-name");
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 400);
      }
    }

    var chooseButtons = document.querySelectorAll(".js-choose-method");
    for (var b = 0; b < chooseButtons.length; b++) {
      chooseButtons[b].addEventListener("click", function () {
        chooseMethod(this.getAttribute("data-method"), true);
      });
    }
    chooseMethod(methodInput ? methodInput.value : "any", false);

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
        method: methodInput ? methodInput.value : "any",
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
