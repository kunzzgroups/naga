(function () {
  var MIN_SHOW_MS = 250;
  var startTime = Date.now();

  function hideLoader() {
    var elapsed = Date.now() - startTime;
    var delay = Math.max(0, MIN_SHOW_MS - elapsed);
    setTimeout(function () {
      document.documentElement.classList.remove('page-loading');
    }, delay);
  }

  function showLoader() {
    startTime = Date.now();
    document.documentElement.classList.add('page-loading');
  }

  if (document.readyState === 'complete') {
    hideLoader();
  } else {
    window.addEventListener('load', hideLoader);
  }

  // Safety fallback so users are not stuck if one asset hangs.
  setTimeout(function () {
    document.documentElement.classList.remove('page-loading');
  }, 8000);

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;

    try {
      var url = new URL(href, window.location.href);
      if (url.origin === window.location.origin) {
        showLoader();
      }
    } catch (e) {}
  }, true);
})();
