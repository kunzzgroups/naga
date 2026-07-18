(function () {
  'use strict';

  const GLOBAL_CSS_SECTION = 'home';
  const loadedCss = new Set();
  const executedJs = new Set();
  const sectionPromises = new Map();

  function endpoint() {
    if (window.NAGA_API && window.NAGA_API.layoutSection) {
      return window.NAGA_API.layoutSection;
    }
    const base = window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl;
    return (base || 'https://bo.titanxgaming.com') + '/api/customize/section';
  }

  async function fetchSection(sectionKey) {
    if (sectionPromises.has(sectionKey)) return sectionPromises.get(sectionKey);

    const promise = fetch(endpoint() + '?key=' + encodeURIComponent(sectionKey) + '&v=' + Date.now(), {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    })
      .then(async function (response) {
        const json = await response.json().catch(function () { return {}; });
        if (!response.ok || !json || json.status === 'error') {
          throw new Error((json && json.message) || 'Unable to load layout section: ' + sectionKey);
        }
        return json.data || {};
      })
      .catch(function (error) {
        console.warn('[Layout Section]', error.message || error);
        return {};
      });

    sectionPromises.set(sectionKey, promise);
    return promise;
  }

  function applyCss(sectionKey, css) {
    if (!css || !String(css).trim()) return;

    let style = document.querySelector('style[data-layout-section-css="' + sectionKey + '"]');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-layout-section-css', sectionKey);
      // Append to the end of <head>, after style.css, so BO CSS acts as an override.
      document.head.appendChild(style);
    }
    style.textContent = String(css);
    loadedCss.add(sectionKey);
  }

  function applyHtml(target, html) {
    if (!target || !html || !String(html).trim()) return;
    target.innerHTML = String(html);
  }

  function applyJs(sectionKey, js) {
    if (!js || !String(js).trim() || executedJs.has(sectionKey)) return;
    const script = document.createElement('script');
    script.setAttribute('data-layout-section-js', sectionKey);
    script.textContent = String(js) + '\n//# sourceURL=layout-section-' + sectionKey + '.js';
    document.body.appendChild(script);
    executedJs.add(sectionKey);
  }

  async function loadSection(sectionKey, targets) {
    if (!sectionKey) return;
    const data = await fetchSection(sectionKey);
    applyCss(sectionKey, data.css);
    (targets || []).forEach(function (target) { applyHtml(target, data.html); });
    applyJs(sectionKey, data.js);
  }

  async function initialize() {
    // CSS Styling in BO uses key "home" and applies to every Naga frontend page.
    await loadSection(GLOBAL_CSS_SECTION, []);

    const groupedTargets = new Map();
    document.querySelectorAll('[data-layout-section]').forEach(function (target) {
      const key = (target.getAttribute('data-layout-section') || '').trim();
      if (!key) return;
      if (!groupedTargets.has(key)) groupedTargets.set(key, []);
      groupedTargets.get(key).push(target);
    });

    await Promise.all(Array.from(groupedTargets.entries()).map(function (entry) {
      return loadSection(entry[0], entry[1]);
    }));

    document.dispatchEvent(new CustomEvent('naga:layout-sections-loaded'));
  }

  window.loadCustomSection = async function (sectionKey, targetSelector) {
    const targets = targetSelector ? Array.from(document.querySelectorAll(targetSelector)) : [];
    sectionPromises.delete(sectionKey); // manual reload always requests latest BO content
    await loadSection(sectionKey, targets);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
