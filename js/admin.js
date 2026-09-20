/**
 * Brilliant Beacon Services — js/admin.js
 * Powers admin.html (the password-protected contact-enquiries viewer).
 * Kept as an external file (not inline) because the site's Content-Security-Policy
 * (see _headers) only allows scripts from 'self' — inline <script> blocks are blocked.
 */
(function () {
  var password = null;

  var loginScreen = document.getElementById('login-screen');
  var appScreen = document.getElementById('app-screen');
  var passwordInput = document.getElementById('password-input');
  var loginBtn = document.getElementById('login-btn');
  var loginError = document.getElementById('login-error');
  var logoutBtn = document.getElementById('logout-btn');
  var refreshBtn = document.getElementById('refresh-btn');
  var cardList = document.getElementById('card-list');
  var countLabel = document.getElementById('count-label');
  var emptyState = document.getElementById('empty-state');
  var errorState = document.getElementById('error-state');

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function renderSubmissions(list) {
    cardList.innerHTML = '';
    if (!list.length) {
      emptyState.hidden = false;
      countLabel.textContent = '';
      return;
    }
    emptyState.hidden = true;
    countLabel.textContent = list.length + (list.length === 1 ? ' enquiry' : ' enquiries');

    list.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'submission-card';

      var telephoneLine = item.telephone
        ? ' &middot; <a href="tel:' + escapeHtml(item.telephone) + '">' + escapeHtml(item.telephone) + '</a>'
        : '';
      var preferredLine = item.preferred_contact
        ? ' &middot; Prefers: ' + escapeHtml(item.preferred_contact)
        : '';

      card.innerHTML =
        '<div class="row1">' +
          '<span class="name">' + escapeHtml(item.name) + '</span>' +
          '<span class="date">' + formatDate(item.created_at) + '</span>' +
        '</div>' +
        '<div class="service-tag">' + escapeHtml(item.service) + '</div>' +
        '<div class="meta">' +
          '<a href="mailto:' + escapeHtml(item.email) + '">' + escapeHtml(item.email) + '</a>' +
          telephoneLine + preferredLine +
        '</div>' +
        '<div class="message">' + escapeHtml(item.message) + '</div>';

      cardList.appendChild(card);
    });
  }

  function loadSubmissions() {
    errorState.hidden = true;
    emptyState.hidden = true;
    countLabel.textContent = 'Loading…';

    fetch('/api/admin-submissions', {
      headers: { 'X-Admin-Password': password }
    })
      .then(function (res) {
        if (res.status === 401) {
          // Password was accepted before but server now rejects it (e.g.
          // it was rotated) — send back to the login screen.
          password = null;
          appScreen.hidden = true;
          logoutBtn.hidden = true;
          loginScreen.hidden = false;
          loginError.textContent = 'Session expired — please re-enter the password.';
          throw new Error('unauthorized');
        }
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Request failed');
          return data;
        });
      })
      .then(function (data) {
        renderSubmissions(data.submissions || []);
      })
      .catch(function (err) {
        if (err.message === 'unauthorized') return;
        countLabel.textContent = '';
        errorState.hidden = false;
        errorState.textContent = 'Could not load enquiries: ' + err.message;
      });
  }

  function attemptLogin() {
    var candidate = passwordInput.value;
    if (!candidate) return;

    loginBtn.disabled = true;
    loginError.textContent = '';

    fetch('/api/admin-submissions', {
      headers: { 'X-Admin-Password': candidate }
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        loginBtn.disabled = false;
        if (!result.ok) {
          loginError.textContent = result.data.error || 'Incorrect password.';
          return;
        }
        password = candidate;
        passwordInput.value = '';
        loginScreen.hidden = true;
        appScreen.hidden = false;
        logoutBtn.hidden = false;
        renderSubmissions(result.data.submissions || []);
      })
      .catch(function () {
        loginBtn.disabled = false;
        loginError.textContent = 'Could not reach the server. Please try again.';
      });
  }

  loginBtn.addEventListener('click', attemptLogin);
  passwordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') attemptLogin();
  });
  refreshBtn.addEventListener('click', loadSubmissions);
  logoutBtn.addEventListener('click', function () {
    password = null;
    appScreen.hidden = true;
    logoutBtn.hidden = true;
    loginScreen.hidden = false;
  });
})();
