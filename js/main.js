/* ==========================================================================
   Brilliant Beacon Services — main.js
   Shared, site-wide behaviour: footer year, lazy gallery lightbox.
   No API keys or secrets belong in this file — see README.md "Security".
   ========================================================================== */

(function () {
  "use strict";

  // Footer copyright year
  document.querySelectorAll("#year").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------- Gallery Lightbox ---------------- */
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
  if (!galleryItems.length) return;

  var lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  var imgEl = document.getElementById("lightbox-img");
  var captionEl = document.getElementById("lightbox-caption");
  var closeBtn = document.getElementById("lightbox-close");
  var prevBtn = document.getElementById("lightbox-prev");
  var nextBtn = document.getElementById("lightbox-next");
  var currentIndex = 0;
  var lastFocused = null;

  function openLightbox(index) {
    currentIndex = index;
    var item = galleryItems[index];
    imgEl.src = item.getAttribute("data-full") || item.querySelector("img").src;
    imgEl.alt = item.querySelector("img").alt || "";
    captionEl.textContent = item.getAttribute("data-caption") || "";
    lastFocused = document.activeElement;
    lightbox.hidden = false;
    closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function showRelative(delta) {
    currentIndex = (currentIndex + delta + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showRelative(1);
    if (e.key === "ArrowLeft") showRelative(-1);
  }

  galleryItems.forEach(function (item, index) {
    item.addEventListener("click", function () { openLightbox(index); });
  });
  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", function () { showRelative(-1); });
  nextBtn.addEventListener("click", function () { showRelative(1); });
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });
})();
