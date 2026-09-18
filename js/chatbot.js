/* ==========================================================================
   Brilliant Beacon Services — chatbot.js
   Chat widget UI. Talks only to /api/chat (a Netlify Function). No AI
   provider API key is ever present in this file — see README.md "AI Chatbot"
   and netlify/functions/chat.js.
   ========================================================================== */

(function () {
  "use strict";

  var launcher = document.getElementById("chat-launcher");
  var win = document.getElementById("chat-window");
  var closeBtn = document.getElementById("chat-close");
  var clearBtn = document.getElementById("chat-clear");
  var messagesEl = document.getElementById("chat-messages");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  if (!launcher || !win || !form) return;

  var STORAGE_KEY = "bbs_chat_history";
  var history = [];
  var isLoading = false;

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) history = JSON.parse(raw);
    } catch (e) {
      history = [];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      /* sessionStorage unavailable (e.g. private browsing) — conversation
         still works for the current page view, just won't persist. */
    }
  }

  function renderMessage(role, text) {
    var div = document.createElement("div");
    div.className = "chat-message " + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function renderHistory() {
    messagesEl.innerHTML = "";
    if (!history.length) {
      renderMessage("bot", "Hello! 👋 How can we help you today?");
      return;
    }
    history.forEach(function (msg) {
      renderMessage(msg.role === "user" ? "user" : "bot", msg.content);
    });
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "chat-typing";
    el.id = "chat-typing-indicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById("chat-typing-indicator");
    if (el) el.remove();
  }

  function openChat() {
    win.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    input.focus();
  }

  function closeChat() {
    win.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", function () {
    if (win.hidden) openChat(); else closeChat();
  });
  closeBtn.addEventListener("click", closeChat);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !win.hidden) closeChat();
  });

  clearBtn.addEventListener("click", function () {
    history = [];
    saveHistory();
    renderHistory();
  });

  // Auto-resize the textarea as the user types, up to a max height (CSS caps it)
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";
  });

  // Enter sends, Shift+Enter adds a newline
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (isLoading) return;

    var text = input.value.trim();
    if (!text) return;

    history.push({ role: "user", content: text });
    renderMessage("user", text);
    saveHistory();
    input.value = "";
    input.style.height = "auto";

    isLoading = true;
    showTyping();

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Chat request failed");
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        var reply = (data && data.reply) ? data.reply :
          "Sorry, our assistant is temporarily unavailable. Please contact our team directly.";
        history.push({ role: "assistant", content: reply });
        renderMessage("bot", reply);
        saveHistory();
      })
      .catch(function () {
        hideTyping();
        renderMessage("error", "Sorry, our assistant is temporarily unavailable. Please contact our team directly.");
      })
      .finally(function () {
        isLoading = false;
      });
  });

  loadHistory();
  renderHistory();
})();
