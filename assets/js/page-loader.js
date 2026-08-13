(function () {
  'use strict';

  var root = document.documentElement;
  var startTime = Date.now();
  var MIN_SHOW_MS = 40;
  var isHomeLobby = /(?:^|\/)index\.html$/i.test(location.pathname) || /\/$/.test(location.pathname);
  var isLoginPage = /(?:^|\/)login\.html$/i.test(location.pathname);
  var isRegisterPage = /(?:^|\/)register\.html$/i.test(location.pathname);
  var isAuthPage = isLoginPage || isRegisterPage;
  var expectedAuthSection = isRegisterPage ? 'register-page' : 'login-page';
  // These are normal targets only. The independent head watchdog is the absolute safety net.
  var MAX_WAIT_MS = isHomeLobby ? 3000 : (isAuthPage ? 2200 : 1100);
  var domReady = document.readyState !== 'loading';
  var customAssetsReady = false;
  var lobbyReady = !isHomeLobby;
  var authLayoutReady = !isAuthPage;
  var revealed = root.classList.contains('page-loaded') && !root.classList.contains('page-loading');
  var maxTimer = null;

  function clearSafetyTimers() {
    if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
    if (window.__NAGA_REVEAL_TIMER__) {
      clearTimeout(window.__NAGA_REVEAL_TIMER__);
      window.__NAGA_REVEAL_TIMER__ = null;
    }
  }

  function performReveal() {
    if (revealed) return;
    revealed = true;
    clearSafetyTimers();
    root.classList.remove('page-loading', 'page-leaving');
    root.classList.add('page-loaded');
  }

  // Replace the early watchdog callback with the normal reveal routine once this file is available.
  window.__NAGA_FORCE_REVEAL__ = performReveal;

  function revealPage(force) {
    if (revealed) return;
    var elapsed = Date.now() - startTime;
    var delay = force ? 0 : Math.max(0, MIN_SHOW_MS - elapsed);
    if (!delay) { performReveal(); return; }
    setTimeout(performReveal, delay);
  }

  function tryReveal() {
    // Animation is intentionally not part of this gate.
    if (domReady && customAssetsReady && lobbyReady && authLayoutReady) revealPage(false);
  }

  function onDomReady() { domReady = true; tryReveal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  else onDomReady();

  document.addEventListener('naga:custom-assets-ready', function () { customAssetsReady = true; tryReveal(); }, { once: true });
  document.addEventListener('naga:lobby-ready', function () { lobbyReady = true; tryReveal(); }, { once: true });
  document.addEventListener('naga:auth-layout-ready', function (event) {
    var key = event && event.detail && event.detail.sectionKey;
    if (!isAuthPage || key === expectedAuthSection) { authLayoutReady = true; tryReveal(); }
  });

  maxTimer = setTimeout(function () { revealPage(true); }, MAX_WAIT_MS);

  // If the page is restored from BFCache or a refresh/navigation edge case occurs, never keep the overlay.
  window.addEventListener('pageshow', function () {
    root.classList.remove('page-leaving');
    if (root.classList.contains('page-loading')) revealPage(true);
  });

  window.addEventListener('load', function () {
    // Load completion is sufficient to show the UI even if a noncritical custom event was missed.
    if (!revealed) revealPage(true);
  }, { once: true });
})();
