(function () {
  'use strict';

  var root = document.documentElement;
  var startTime = Date.now();
  var MIN_SHOW_MS = 60;
  var MAX_WAIT_MS = 700;
  var domReady = document.readyState !== 'loading';
  var customAssetsReady = false;
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
    if (domReady && customAssetsReady) revealPage(false);
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
