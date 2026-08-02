(function () {
  'use strict';

  var root = document.documentElement;
  var startTime = Date.now();
  var MIN_SHOW_MS = 60;
  var isHomeLobby = /(?:^|\/)index\.html$/i.test(location.pathname) || /\/$/.test(location.pathname);
  var isLoginPage = /(?:^|\/)login\.html$/i.test(location.pathname);
  var isRegisterPage = /(?:^|\/)register\.html$/i.test(location.pathname);
  var isAuthPage = isLoginPage || isRegisterPage;
  var expectedAuthSection = isRegisterPage ? 'register-page' : 'login-page';
  var MAX_WAIT_MS = isHomeLobby ? 3500 : (isAuthPage ? 4500 : 700);
  var domReady = document.readyState !== 'loading';
  var customAssetsReady = false;
  var lobbyReady = !isHomeLobby;
  var authLayoutReady = !isAuthPage;
  var revealed = false;

  function nextPaint(callback) {
    requestAnimationFrame(function () {
      requestAnimationFrame(callback);
    });
  }

  function revealPage(force) {
    if (revealed) return;
    var elapsed = Date.now() - startTime;
    var delay = force ? 0 : Math.max(0, MIN_SHOW_MS - elapsed);
    revealed = true;

    setTimeout(function () {
      nextPaint(function () {
        root.classList.remove('page-loading', 'page-leaving');
        root.classList.add('page-loaded');
      });
    }, delay);
  }

  function tryReveal() {
    if (domReady && customAssetsReady && lobbyReady && authLayoutReady) revealPage(false);
  }

  function onDomReady() {
    domReady = true;
    tryReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  } else {
    onDomReady();
  }

  document.addEventListener('naga:custom-assets-ready', function () {
    customAssetsReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:lobby-ready', function () {
    lobbyReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:auth-layout-ready', function (event) {
    var key = event && event.detail && event.detail.sectionKey;
    if (!isAuthPage || key === expectedAuthSection) {
      authLayoutReady = true;
      tryReveal();
    }
  });

  // Never hold the page because of a slow remote image or API.
  setTimeout(function () {
    if (!revealed) revealPage(true);
  }, MAX_WAIT_MS);

  // Internal links now use normal immediate browser navigation. There is no
  // pre-navigation fade, delay, scaling or movement, so taps feel direct.
  window.addEventListener('pageshow', function () {
    root.classList.remove('page-leaving');
    if (!root.classList.contains('page-loaded')) revealPage(true);
  });
})();
