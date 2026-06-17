(function () {
  const BASE_PATH = '/assets/custom/sections/';
  const VERSION = window.NAGA_CUSTOM_VERSION || Date.now();

  function isEmptyText(text) {
    return !text || !text.trim();
  }

  async function safeFetchText(url) {
    try {
      const res = await fetch(url + '?v=' + VERSION, { cache: 'no-store' });

      if (!res.ok) return null;

      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      if (isEmptyText(text)) return null;

      // prevent loading returned index.html / error html as css/js/html section
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return null;
      }

      return text;
    } catch (e) {
      return null;
    }
  }

  async function loadHtml(sectionKey, targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const html = await safeFetchText(BASE_PATH + sectionKey + '.html');
    if (!html) return;

    target.innerHTML = html;
  }

  async function loadCss(sectionKey) {
    const css = await safeFetchText(BASE_PATH + sectionKey + '.css');
    if (!css) return;

    const style = document.createElement('style');
    style.setAttribute('data-custom-section-css', sectionKey);
    style.textContent = css;
    document.head.appendChild(style);
  }

  async function loadJs(sectionKey) {
    const js = await safeFetchText(BASE_PATH + sectionKey + '.js');
    if (!js) return;

    const script = document.createElement('script');
    script.setAttribute('data-custom-section-js', sectionKey);
    script.textContent = js;
    document.body.appendChild(script);
  }

  window.loadCustomSection = async function (sectionKey, targetSelector) {
    if (!sectionKey || !targetSelector) return;

    await loadHtml(sectionKey, targetSelector);
    await loadCss(sectionKey);
    await loadJs(sectionKey);
  };
})();