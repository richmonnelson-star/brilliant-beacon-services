/* ==========================================================================
   Brilliant Beacon Services — payment.js
   Payment page interactions. No payment provider secret keys are ever
   referenced here — session/order creation happens server-side via
   netlify/functions/create-payment.js.
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

  /* ---- Card payment button ---- */
  var cardBtn = document.getElementById("card-pay-button");
  if (cardBtn) {
    cardBtn.addEventListener("click", function () {
      // When a payment provider is configured, this should call
      // /api/create-payment to create a secure hosted checkout session
      // and redirect the browser to the URL it returns. Left inert until
      // a provider is connected — see README.md "Payments".
      fetch("/api/create-payment", { method: "POST" })
        .then(function (res) {
          if (!res.ok) throw new Error("Payment session could not be created");
          return res.json();
        })
        .then(function (data) {
          if (data && data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
          } else {
            throw new Error("No checkout URL returned");
          }
        })
        .catch(function () {
          window.location.href = "payment-error.html";
        });
    });
  }
})();
