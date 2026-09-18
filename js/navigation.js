/* ==========================================================================
   Brilliant Beacon Services — navigation.js
   Accessible, keyboard-friendly mobile navigation (hamburger menu).
   ========================================================================== */

(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  var backdrop = document.querySelector(".nav-backdrop");
  if (!toggle || !nav) return;

  function openNav() {
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    if (backdrop) backdrop.classList.add("is-open");
    document.addEventListener("keydown", onKeydown);
    var firstLink = nav.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function closeNav() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    if (backdrop) backdrop.classList.remove("is-open");
    document.removeEventListener("keydown", onKeydown);
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeNav();
      toggle.focus();
    }
  }

  toggle.addEventListener("click", function () {
    var isOpen = nav.classList.contains("is-open");
    if (isOpen) { closeNav(); } else { openNav(); }
  });

  if (backdrop) backdrop.addEventListener("click", closeNav);

  // Close the mobile menu when a nav link is followed
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  // If the viewport is resized back to desktop width, ensure the menu resets
  window.addEventListener("resize", function () {
    if (window.innerWidth > 860 && nav.classList.contains("is-open")) {
      closeNav();
    }
  });
})();
