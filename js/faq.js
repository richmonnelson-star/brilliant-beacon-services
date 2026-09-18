/* ==========================================================================
   Brilliant Beacon Services — faq.js
   Accessible accordion (WAI-ARIA disclosure pattern) + category filter.
   ========================================================================== */

(function () {
  "use strict";

  var triggers = Array.prototype.slice.call(document.querySelectorAll(".accordion-trigger"));
  if (!triggers.length) return;

  triggers.forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!panel) return;
    var inner = panel.querySelector(".panel-inner");

    trigger.addEventListener("click", function () {
      var isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isOpen));
      if (isOpen) {
        panel.style.maxHeight = null;
      } else {
        panel.style.maxHeight = inner.scrollHeight + "px";
      }
    });
  });

  /* ---------------- Category filter ---------------- */
  var categoryButtons = Array.prototype.slice.call(document.querySelectorAll("#faq-categories button"));
  var groups = Array.prototype.slice.call(document.querySelectorAll(".faq-group"));
  if (!categoryButtons.length) return;

  categoryButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var category = btn.getAttribute("data-category");

      categoryButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");

      groups.forEach(function (group) {
        var matches = category === "all" || group.getAttribute("data-category") === category;
        group.hidden = !matches;
      });
    });
  });
})();
