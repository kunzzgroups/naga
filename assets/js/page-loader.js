(function () {
  var startTime = Date.now();
  var MIN_SHOW_MS = 120;       // keep spinner visible only briefly, avoid feeling slow
  var MAX_WAIT_MS = 900;       // never wait for every image/gif/firebase to finish
  var domReady = document.readyState !== 'loading';
  var customAssetsReady = false;
  var hidden = false;

  function nextPaint(cb) {
    requestAnimationFrame(function () {
      requestAnimationFrame(cb);
    });
  }

  function hideLoader(force) {
    if (hidden) return;
    var elapsed = Date.now() - startTime;
    var delay = force ? 0 : Math.max(0, MIN_SHOW_MS - elapsed);

    hidden = true;
    setTimeout(function () {
      nextPaint(function () {
        document.documentElement.classList.add('page-loaded');
        document.documentElement.classList.remove('page-loading');
      });
    }, delay);
  }

  function tryHide() {
    // Hide after DOM is ready and custom assets/background were applied.
    // If custom asset API/version is slow, MAX_WAIT_MS fallback below will release it.
    if (domReady && customAssetsReady) hideLoader(false);
  }

  function onDomReady() {
    domReady = true;
    tryHide();
  }

  function showLoader() {
    startTime = Date.now();
    hidden = false;
    document.documentElement.classList.remove('page-loaded');
    document.documentElement.classList.add('page-loading');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  } else {
    onDomReady();
  }

  document.addEventListener('naga:custom-assets-ready', function () {
    customAssetsReady = true;
    tryHide();
  }, { once: true });

  // Fast fallback: do not wait for large gifs, lazy images, firebase, or slow network calls.
  setTimeout(function () {
    if (!hidden) hideLoader(true);
  }, MAX_WAIT_MS);

  // Browser back/forward cache restore should not show loader forever.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) hideLoader(true);
  });

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;

    try {
      var url = new URL(href, window.location.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
        showLoader();
      }
    } catch (e) {}
  }, true);
})();
