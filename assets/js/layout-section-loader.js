(function () {
  'use strict';

  const GLOBAL_CSS_SECTION = 'home';
  const sectionPromises = new Map();
  const executedJs = new Set();

  function endpoint() {
    if (window.NAGA_API && window.NAGA_API.layoutSection) return window.NAGA_API.layoutSection;
    const base = window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl;
    return String(base || 'https://bo.titanxgaming.com').replace(/\/+$/, '') + '/api/customize/section';
  }

  function normalizeData(json) {
    const data = (json && json.data) || json || {};
    return {
      html: data.html == null ? '' : String(data.html),
      css: data.css == null ? '' : String(data.css),
      js: data.js == null ? '' : String(data.js)
    };
  }

  async function fetchSection(sectionKey, force) {
    if (!force && sectionPromises.has(sectionKey)) return sectionPromises.get(sectionKey);

    const request = fetch(endpoint() + '?key=' + encodeURIComponent(sectionKey) + '&_=' + Date.now(), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache'
      }
    }).then(async function (response) {
      const json = await response.json().catch(function () { return {}; });
      if (!response.ok || (json && json.status === 'error')) {
        throw new Error((json && json.message) || ('Unable to load layout section: ' + sectionKey));
      }
      return normalizeData(json);
    }).catch(function (error) {
      console.warn('[Layout Section]', error && error.message ? error.message : error);
      return { html: '', css: '', js: '' };
    });

    sectionPromises.set(sectionKey, request);
    return request;
  }

  function applyCss(sectionKey, css) {
    let style = document.querySelector('style[data-layout-section-css="' + sectionKey + '"]');
    if (!css.trim()) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-layout-section-css', sectionKey);
      document.head.appendChild(style);
    }
    style.textContent = css;
  }

  function applyHtml(target, html, sectionKey) {
    if (!target || !html.trim()) return false;
    if (target.innerHTML !== html) target.innerHTML = html;
    target.setAttribute('data-layout-custom-applied', sectionKey);
    return true;
  }

  function applyJs(sectionKey, js) {
    if (!js.trim()) return;
    const old = document.querySelector('script[data-layout-section-js="' + sectionKey + '"]');
    if (old) old.remove();
    const script = document.createElement('script');
    script.setAttribute('data-layout-section-js', sectionKey);
    script.textContent = js + '\n//# sourceURL=layout-section-' + sectionKey + '.js';
    document.body.appendChild(script);
    executedJs.add(sectionKey);
  }

  function targetsFor(sectionKey) {
    if (sectionKey === 'frontend-header') {
      const header = document.querySelector('.top-header');
      return header ? [header] : [];
    }
    if (sectionKey === 'frontend-sidebar') {
      const panel = document.querySelector('#mobileSideMenu .mobile-menu-panel');
      return panel ? [panel] : [];
    }
    return Array.from(document.querySelectorAll('[data-layout-section="' + CSS.escape(sectionKey) + '"]'));
  }

  async function loadSection(sectionKey, targets, force) {
    const data = await fetchSection(sectionKey, !!force);
    applyCss(sectionKey, data.css);
    let htmlChanged = false;
    (targets || targetsFor(sectionKey)).forEach(function (target) {
      if (applyHtml(target, data.html, sectionKey)) htmlChanged = true;
    });
    applyJs(sectionKey, data.js);

    if (htmlChanged && (sectionKey === 'frontend-header' || sectionKey === 'frontend-sidebar')) {
      if (window.NAGA_SITE_SHELL && typeof window.NAGA_SITE_SHELL.rehydrate === 'function') {
        window.NAGA_SITE_SHELL.rehydrate();
      }
      document.dispatchEvent(new CustomEvent('naga:site-shell-customized', { detail: { sectionKey: sectionKey } }));
    }
    return data;
  }

  async function loadShellSections(force) {
    await Promise.all([
      loadSection('frontend-header', targetsFor('frontend-header'), force),
      loadSection('frontend-sidebar', targetsFor('frontend-sidebar'), force)
    ]);
  }

  async function initialize() {
    await loadSection(GLOBAL_CSS_SECTION, [], true);
    await loadShellSections(true);

    const grouped = new Map();
    document.querySelectorAll('[data-layout-section]').forEach(function (target) {
      const key = (target.getAttribute('data-layout-section') || '').trim();
      if (!key || key === 'frontend-header' || key === 'frontend-sidebar' || key === GLOBAL_CSS_SECTION) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(target);
    });
    await Promise.all(Array.from(grouped.entries()).map(function (entry) {
      return loadSection(entry[0], entry[1], true);
    }));
    document.dispatchEvent(new CustomEvent('naga:layout-sections-loaded'));
  }

  document.addEventListener('naga:site-shell-ready', function () {
    // Load immediately after site-shell creates the header/sidebar.
    loadShellSections(true);
  });

  // A final post-load refresh prevents late site-shell/page scripts from restoring old markup.
  window.addEventListener('load', function () {
    setTimeout(function () { loadShellSections(true); }, 100);
    setTimeout(function () { loadShellSections(true); }, 600);
  });

  window.loadCustomSection = async function (sectionKey, targetSelector) {
    const targets = targetSelector ? Array.from(document.querySelectorAll(targetSelector)) : targetsFor(sectionKey);
    sectionPromises.delete(sectionKey);
    return loadSection(sectionKey, targets, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
