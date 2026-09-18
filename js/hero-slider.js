/* ==========================================================================
   Brilliant Beacon Services — hero-slider.js
   Lightweight, accessible, auto-advancing hero image slider for the
   homepage. Cycles through real completed-work photos with a matching
   service caption. Pauses on hover/focus and on tab blur, respects
   prefers-reduced-motion, and is fully operable via the prev/next buttons,
   dot navigation, and keyboard.
   ========================================================================== */

(function () {
  "use strict";

  var slider = document.getElementById("hero-slider");
  if (!slider) return;

  var slides = Array.prototype.slice.call(slider.querySelectorAll(".hero-slide"));
  if (slides.length <= 1) return; // nothing to slide between

  // The headline/copy for each slide lives in the hero section (outside the
  // slider itself, overlaid on top of it), one .hero-text-slide per image.
  var heroSection = slider.closest(".hero") || document;
  var textSlides = Array.prototype.slice.call(heroSection.querySelectorAll(".hero-text-slide"));

  var prevBtn = slider.querySelector(".hero-slider-btn.prev");
  var nextBtn = slider.querySelector(".hero-slider-btn.next");
  var counter = slider.querySelector("#hero-slider-counter") || slider.querySelector(".hero-slider-counter");
  var dotsWrap = slider.querySelector(".hero-slider-dots");
  var current = 0;
  var AUTOPLAY_DELAY = 6000;
  var timer = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Build one dot per slide
  var dots = slides.map(function (slide, index) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot" + (index === 0 ? " is-active" : "");
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-selected", index === 0 ? "true" : "false");
    dot.setAttribute("aria-label", "Slide " + (index + 1));
    dot.addEventListener("click", function () {
      goTo(index);
      restartAutoplay();
    });
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  function updateUI() {
    slides.forEach(function (slide, index) {
      slide.classList.toggle("is-active", index === current);
    });
    textSlides.forEach(function (textSlide, index) {
      textSlide.classList.toggle("is-active", index === current);
    });
    dots.forEach(function (dot, index) {
      dot.classList.toggle("is-active", index === current);
      dot.setAttribute("aria-selected", index === current ? "true" : "false");
    });
    if (counter) {
      counter.textContent = "Slide " + (current + 1) + " of " + slides.length;
    }
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    updateUI();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAutoplay() {
    if (reduceMotion) return; // don't auto-animate for users who asked not to
    stopAutoplay();
    timer = window.setInterval(next, AUTOPLAY_DELAY);
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      next();
      restartAutoplay();
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      prev();
      restartAutoplay();
    });
  }

  // Pause on hover and keyboard focus so people can read/click without the
  // slide changing under them; resume when they move away.
  slider.addEventListener("mouseenter", stopAutoplay);
  slider.addEventListener("mouseleave", startAutoplay);
  slider.addEventListener("focusin", stopAutoplay);
  slider.addEventListener("focusout", startAutoplay);

  // Pause when the tab isn't visible, resume when it is again.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  updateUI();
  startAutoplay();
})();
