(function () {
  'use strict';

  const GLOBAL_CSS_SECTION = 'home';
  const sectionPromises = new Map();
  const executedJs = new Set();
  const authoritativeSections = new Map();
  const sectionObservers = new Map();
  const CACHE_PREFIX = 'naga_layout_section_v2:';
  let initialized = false;
  let shellReadySeen = false;
  let freshHeaderLoaded = false;
  let customAssetsReady = !!window.__NAGA_CUSTOM_ASSETS_READY__;

  function markHeaderReady() {
    if (!freshHeaderLoaded || !customAssetsReady) return;
    const root = document.documentElement;
    const header = document.querySelector('.top-header');
    if (!header) { root.classList.add('naga-header-ready'); return; }
    const logo = header.querySelector('.site-logo, .logo-box img');
    if (!logo || logo.complete) { root.classList.add('naga-header-ready'); return; }
    let done = false;
    const finish = function () {
      if (done) return;
      done = true;
      root.classList.add('naga-header-ready');
    };
    logo.addEventListener('load', finish, { once: true });
    logo.addEventListener('error', finish, { once: true });
    setTimeout(finish, 800);
  }

  function cacheKey(sectionKey) {
    return CACHE_PREFIX + sectionKey;
  }

  function readCachedSection(sectionKey) {
    try {
      const raw = localStorage.getItem(cacheKey(sectionKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return normalizeData(parsed.data || parsed);
    } catch (_) {
      return null;
    }
  }

  function writeCachedSection(sectionKey, data) {
    try {
      localStorage.setItem(cacheKey(sectionKey), JSON.stringify({
        savedAt: Date.now(),
        data: normalizeData(data)
      }));
    } catch (_) {}
  }

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
      const normalized = normalizeData(json);
      writeCachedSection(sectionKey, normalized);
      return normalized;
    }).catch(function (error) {
      console.warn('[Layout Section]', error && error.message ? error.message : error);
      return { html: '', css: '', js: '' };
    });

    sectionPromises.set(sectionKey, request);
    return request;
  }

  function ensureHomeLayoutSafetyCss() {
    let safetyStyle = document.getElementById('naga-home-layout-safety');
    if (!safetyStyle) {
      safetyStyle = document.createElement('style');
      safetyStyle.id = 'naga-home-layout-safety';
    }

    safetyStyle.textContent = `
      /* Keep BO Layout Section styling inside the available desktop viewport. */
      @media (min-width: 901px) {
        body.home-page .main-layout {
          width: 100% !important;
          max-width: 100vw !important;
          grid-template-columns: clamp(285px, 22vw, 360px) minmax(0, 1fr) clamp(320px, 23vw, 390px) !important;
          overflow: hidden !important;
        }

        body.home-page .left-sidebar,
        body.home-page .center-content,
        body.home-page .right-panel {
          min-width: 0 !important;
          max-width: 100% !important;
        }

        body.home-page .right-panel {
          padding-left: 20px !important;
          padding-right: 20px !important;
          overflow: hidden !important;
        }

        body.home-page .right-content-box {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 350px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          flex: 0 1 350px !important;
        }

        body.home-page .right-content-box .balance-box {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 350px !important;
          grid-template-columns: minmax(0, 1fr) minmax(108px, 132px) !important;
          gap: 10px !important;
        }

        body.home-page .right-content-box .money-btns {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 132px !important;
        }

        body.home-page .right-content-box .money-btns button,
        body.home-page .right-content-box .money-btns button img {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 132px !important;
        }
      }

      @media (min-width: 901px) and (max-width: 1280px) {
        body.home-page .main-layout {
          grid-template-columns: 285px minmax(0, 1fr) 320px !important;
        }

        body.home-page .right-panel {
          padding-left: 10px !important;
          padding-right: 10px !important;
        }

        body.home-page .right-content-box .balance-box {
          padding-left: 12px !important;
          padding-right: 12px !important;
          grid-template-columns: minmax(0, 1fr) minmax(104px, 120px) !important;
          gap: 8px !important;
        }
      }
    `;

    // Re-append it so these geometry guards remain after BO-provided custom CSS.
    document.head.appendChild(safetyStyle);
  }

  // BO sidebar HTML is stored as one language-neutral template. It may contain
  // English fallback text together with data-i18n attributes. Because the Layout
  // Section request and the language JSON load asynchronously, the sidebar can be
  // replaced *after* I18N has already translated the page. In that race the raw
  // English fallback used to remain visible until the user changed language again.
  // Translate only the freshly inserted sidebar subtree without dispatching another
  // global i18n:changed event (which would unnecessarily reload language-aware data).
  function translateLayoutTarget(target, sectionKey) {
    if (!target || ['frontend-sidebar','login-page','register-page'].indexOf(sectionKey) < 0) return;
    if (!window.I18N || typeof window.I18N.t !== 'function' || !window.I18N.dict) return;

    function translated(key) {
      if (!key) return '';
      try {
        const value = window.I18N.t(key);
        return value == null ? '' : String(value);
      } catch (_) {
        return '';
      }
    }

    function nodes(selector) {
      const list = [];
      if (target.matches && target.matches(selector)) list.push(target);
      if (target.querySelectorAll) list.push.apply(list, target.querySelectorAll(selector));
      return list;
    }

    nodes('[data-i18n]').forEach(function (el) {
      const value = translated(el.getAttribute('data-i18n'));
      if (value) el.textContent = value;
    });
    nodes('[data-i18n-html]').forEach(function (el) {
      const value = translated(el.getAttribute('data-i18n-html'));
      if (value) el.innerHTML = value;
    });
    nodes('[data-i18n-placeholder]').forEach(function (el) {
      const value = translated(el.getAttribute('data-i18n-placeholder'));
      if (value) el.setAttribute('placeholder', value);
    });
    nodes('[data-i18n-alt]').forEach(function (el) {
      const value = translated(el.getAttribute('data-i18n-alt'));
      if (value) el.setAttribute('alt', value);
    });
    nodes('[data-i18n-title]').forEach(function (el) {
      const value = translated(el.getAttribute('data-i18n-title'));
      if (value) el.setAttribute('title', value);
    });
    nodes('[data-i18n-aria-label]').forEach(function (el) {
      const value = translated(el.getAttribute('data-i18n-aria-label'));
      if (value) el.setAttribute('aria-label', value);
    });
  }

  function applyCss(sectionKey, css) {
    let style = document.querySelector('style[data-layout-section-css="' + sectionKey + '"]');
    if (!css.trim()) {
      if (style) style.remove();
      if (sectionKey === GLOBAL_CSS_SECTION) ensureHomeLayoutSafetyCss();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-layout-section-css', sectionKey);
      document.head.appendChild(style);
    }
    style.textContent = css;
    if (sectionKey === GLOBAL_CSS_SECTION) ensureHomeLayoutSafetyCss();
  }


  function normalizeAuthImageHtml(html, sectionKey) {
    if (!html || (sectionKey !== 'frontend-header' && sectionKey !== 'frontend-sidebar')) return html;

    const template = document.createElement('template');
    template.innerHTML = html;

    const isHeader = sectionKey === 'frontend-header';
    const items = [
      {
        selectors: isHeader
          ? ['a.top-login-btn', '.top-auth-actions a[href*="login"]']
          : ['a.mobile-login-btn', '.mobile-menu-auth a[href*="login"]'],
        src: 'assets/custom/images/login.png',
        alt: 'LOGIN',
        imgClass: isHeader ? 'header-auth-image header-login-image' : 'sidebar-auth-image sidebar-login-image'
      },
      {
        selectors: isHeader
          ? ['a.top-register-btn', '.top-auth-actions a[href*="register"]']
          : ['a.mobile-register-btn', '.mobile-menu-auth a[href*="register"]'],
        src: 'assets/custom/images/register.png',
        alt: 'REGISTER',
        imgClass: isHeader ? 'header-auth-image header-register-image' : 'sidebar-auth-image sidebar-register-image'
      }
    ];

    items.forEach(function (item) {
      let anchor = null;
      for (let i = 0; i < item.selectors.length && !anchor; i++) {
        anchor = template.content.querySelector(item.selectors[i]);
      }
      if (!anchor) return;

      anchor.classList.add('auth-image-link');
      anchor.setAttribute('aria-label', item.alt.charAt(0) + item.alt.slice(1).toLowerCase());
      anchor.removeAttribute('data-i18n');
      anchor.replaceChildren();

      const image = document.createElement('img');
      image.className = item.imgClass;
      image.src = item.src;
      image.alt = item.alt;
      image.decoding = 'async';
      image.loading = 'eager';
      anchor.appendChild(image);
    });

    return template.innerHTML;
  }

  function isAuthoritativePageSection(sectionKey) {
    return sectionKey === 'login-page' || sectionKey === 'register-page';
  }


  function normalizeAuthPageHtml(html, sectionKey) {
    if (!html || !isAuthoritativePageSection(sectionKey)) return html;

    const template = document.createElement('template');
    template.innerHTML = html;

    [
      { selector: '#loginForm', id: 'loginMessage' },
      { selector: '#registerForm', id: 'registerMessage' }
    ].forEach(function (config) {
      const form = template.content.querySelector(config.selector);
      if (!form) return;

      let message = form.querySelector('.auth-message');
      if (!message) {
        message = document.createElement('div');
        message.className = 'auth-message';
        const submit = form.querySelector('.submit-login, button[type="submit"]');
        if (submit) submit.insertAdjacentElement('afterend', message);
        else form.appendChild(message);
      }
      if (!message.id) message.id = config.id;
      message.setAttribute('role', 'alert');
      message.setAttribute('aria-live', 'polite');
    });

    // BO Layout can replace the complete Login/Register markup. Re-attach
    // semantic i18n keys to the known auth controls so BO styling/layout remains
    // authoritative while visible wording still follows the frontend language.
    function setI18n(selector, attr, key) {
      const el = template.content.querySelector(selector);
      if (el && !el.hasAttribute(attr)) el.setAttribute(attr, key);
    }

    template.content.querySelectorAll('[data-login-tab]').forEach(function (el) {
      const tab = (el.getAttribute('data-login-tab') || '').toLowerCase();
      if (tab === 'login' || tab === 'register') el.setAttribute('data-i18n', tab);
    });

    setI18n('#loginForm input[autocomplete="username"], #loginForm input[type="text"]', 'data-i18n-placeholder', 'username');
    setI18n('#loginForm input[autocomplete="current-password"], #loginForm input[type="password"]', 'data-i18n-placeholder', 'password');
    setI18n('#loginForm .forgot-link', 'data-i18n', 'forgot_password');
    setI18n('#loginForm .submit-login, #loginForm button[type="submit"]', 'data-i18n', 'login');

    setI18n('#registerForm input[autocomplete="name"]', 'data-i18n-placeholder', 'full_name');
    setI18n('#registerForm input[autocomplete="tel"], #registerForm input[type="phone"], #registerForm input[type="tel"]', 'data-i18n-placeholder', 'mobile_no');
    setI18n('#registerForm input[autocomplete="new-password"], #registerForm input[type="password"]', 'data-i18n-placeholder', 'password_6_20');
    setI18n('#registerForm input[autocomplete="off"]', 'data-i18n-placeholder', 'referrer_code_optional');
    const registerTextInputs = Array.from(template.content.querySelectorAll('#registerForm input[type="text"]'));
    registerTextInputs.forEach(function (el) {
      if (el.hasAttribute('data-i18n-placeholder')) return;
      const ph = (el.getAttribute('placeholder') || '').toLowerCase();
      if (ph.indexOf('verification') >= 0 || ph.indexOf('code') >= 0) el.setAttribute('data-i18n-placeholder', 'verification_code');
    });
    setI18n('#registerForm .verify-btn', 'data-i18n', 'get_code');
    setI18n('#registerForm .submit-login, #registerForm button[type="submit"]', 'data-i18n', 'register');

    return template.innerHTML;
  }

  function isAuthMessageOnlyMutation(mutation) {
    if (!mutation) return false;
    if (mutation.target && mutation.target.nodeType === 1 && mutation.target.closest('.auth-message')) return true;
    if (mutation.target && mutation.target.nodeType === 3 && mutation.target.parentElement && mutation.target.parentElement.closest('.auth-message')) return true;
    if (mutation.type !== 'childList') return false;
    const nodes = Array.from(mutation.addedNodes || []).concat(Array.from(mutation.removedNodes || []));
    return nodes.length > 0 && nodes.every(function (node) {
      if (node.nodeType === 3) return node.parentElement && node.parentElement.closest('.auth-message');
      return node.nodeType === 1 && (node.matches('.auth-message') || node.closest('.auth-message'));
    });
  }

  function isAuthI18nMutation(mutation) {
    if (!mutation) return false;
    const el = mutation.target && mutation.target.nodeType === 1
      ? mutation.target
      : (mutation.target && mutation.target.parentElement);
    if (!el) return false;
    return !!(el.closest && el.closest('[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-alt],[data-i18n-title],[data-i18n-aria-label]'));
  }

  function keepSectionAuthoritative(target, sectionKey, html) {
    if (!target || !isAuthoritativePageSection(sectionKey) || !html.trim()) return;
    authoritativeSections.set(sectionKey, html);
    target.setAttribute('data-layout-authoritative', sectionKey);

    const previous = sectionObservers.get(target);
    if (previous) previous.disconnect();

    let restoring = false;
    const observer = new MutationObserver(function (mutations) {
      if (restoring) return;
      if (mutations && mutations.length && mutations.every(function (mutation) {
        return isAuthMessageOnlyMutation(mutation) || isAuthI18nMutation(mutation);
      })) return;
      const expected = authoritativeSections.get(sectionKey);
      if (!expected || target.innerHTML === expected) return;
      restoring = true;
      target.innerHTML = expected;
      target.setAttribute('data-layout-custom-applied', sectionKey);
      document.dispatchEvent(new CustomEvent('naga:layout-section-restored', {
        detail: { sectionKey: sectionKey }
      }));
      Promise.resolve().then(function () { restoring = false; });
    });

    observer.observe(target, { childList: true, subtree: true, characterData: true });
    sectionObservers.set(target, observer);
  }

  function applyHtml(target, html, sectionKey) {
    html = normalizeAuthImageHtml(html, sectionKey);
    html = normalizeAuthPageHtml(html, sectionKey);
    if (!target || !html.trim()) return false;
    if (target.innerHTML !== html) target.innerHTML = html;
    target.setAttribute('data-layout-custom-applied', sectionKey);
    keepSectionAuthoritative(target, sectionKey, html);
    // Important: a fresh/cached BO sidebar can arrive after lang.js has already
    // translated the page. Re-translate this subtree immediately so its visible
    // text always follows the persisted language instead of its English fallback.
    translateLayoutTarget(target, sectionKey);
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

  function applyCachedSection(sectionKey, targets) {
    const data = readCachedSection(sectionKey);
    if (!data) return false;
    applyCss(sectionKey, data.css);
    let htmlChanged = false;
    (targets || targetsFor(sectionKey)).forEach(function (target) {
      if (applyHtml(target, data.html, sectionKey)) htmlChanged = true;
    });
    if (data.js && data.js.trim()) applyJs(sectionKey, data.js);
    document.dispatchEvent(new CustomEvent('naga:layout-section-applied', {
      detail: { sectionKey: sectionKey, htmlChanged: htmlChanged, data: data, fromCache: true }
    }));
    return htmlChanged || !!(data.css && data.css.trim());
  }

  async function loadSection(sectionKey, targets, force) {
    const data = await fetchSection(sectionKey, !!force);
    applyCss(sectionKey, data.css);
    let htmlChanged = false;
    (targets || targetsFor(sectionKey)).forEach(function (target) {
      if (applyHtml(target, data.html, sectionKey)) htmlChanged = true;
    });
    applyJs(sectionKey, data.js);

    document.dispatchEvent(new CustomEvent('naga:layout-section-applied', {
      detail: { sectionKey: sectionKey, htmlChanged: htmlChanged, data: data, fromCache: false }
    }));
    if (isAuthoritativePageSection(sectionKey) && htmlChanged) {
      document.dispatchEvent(new CustomEvent('naga:auth-layout-ready', {
        detail: { sectionKey: sectionKey, fromCache: false }
      }));
    }

    if (htmlChanged && (sectionKey === 'frontend-header' || sectionKey === 'frontend-sidebar')) {
      // First let the shell reconnect login state, wallet and menu behavior.
      // The shell/i18n rehydration may rewrite text carrying data-i18n attributes,
      // so apply the BO-saved HTML once more afterwards. This makes the saved
      // layout the final source of truth (for example a custom LOGIN22 label).
      if (window.NAGA_SITE_SHELL && typeof window.NAGA_SITE_SHELL.rehydrate === 'function') {
        window.NAGA_SITE_SHELL.rehydrate();
      }

      (targets || targetsFor(sectionKey)).forEach(function (target) {
        applyHtml(target, data.html, sectionKey);
      });

      // Reconnect state-only behavior without running translation over the
      // freshly restored custom wording.
      if (window.NAGA_SITE_SHELL) {
        if (typeof window.NAGA_SITE_SHELL.refreshHeaderAuth === 'function') {
          window.NAGA_SITE_SHELL.refreshHeaderAuth();
        }
        if (typeof window.NAGA_SITE_SHELL.refreshBalance === 'function') {
          window.NAGA_SITE_SHELL.refreshBalance();
        }
      }

      document.dispatchEvent(new CustomEvent('naga:site-shell-customized', { detail: { sectionKey: sectionKey } }));
    }
    if (sectionKey === 'frontend-header') {
      freshHeaderLoaded = true;
      markHeaderReady();
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
    const grouped = new Map();
    document.querySelectorAll('[data-layout-section]').forEach(function (target) {
      const key = (target.getAttribute('data-layout-section') || '').trim();
      if (!key || key === 'frontend-header' || key === 'frontend-sidebar' || key === GLOBAL_CSS_SECTION) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(target);
    });

    // Cached page/sidebar layout is safe, but the header/logo must always come
    // from the current no-store BO response. Painting an older cached header first
    // is what caused the logo to flash/change after refresh.
    applyCachedSection(GLOBAL_CSS_SECTION, []);
    applyCachedSection('frontend-sidebar', targetsFor('frontend-sidebar'));
    grouped.forEach(function (targets, key) {
      const applied = applyCachedSection(key, targets);
      if (applied && isAuthoritativePageSection(key)) {
        document.dispatchEvent(new CustomEvent('naga:auth-layout-ready', {
          detail: { sectionKey: key, fromCache: true }
        }));
      }
    });

    // Refresh all sections in parallel. Auth pages no longer wait for home CSS
    // and shell requests to finish before their own BO layout is requested.
    initialized = true;
    const jobs = [
      loadSection(GLOBAL_CSS_SECTION, [], true),
      loadSection('frontend-header', targetsFor('frontend-header'), true),
      loadSection('frontend-sidebar', targetsFor('frontend-sidebar'), true)
    ];
    grouped.forEach(function (targets, key) {
      jobs.push(loadSection(key, targets, true));
    });
    await Promise.all(jobs);
    document.dispatchEvent(new CustomEvent('naga:layout-sections-loaded'));
  }


  document.addEventListener('i18n:changed', function () {
    ['frontend-sidebar','login-page','register-page'].forEach(function (sectionKey) {
      targetsFor(sectionKey).forEach(function (target) {
        translateLayoutTarget(target, sectionKey);
      });
    });
  });

  document.addEventListener('naga:custom-assets-ready', function () {
    customAssetsReady = true;
    markHeaderReady();
  });

  document.addEventListener('naga:site-shell-ready', function () {
    shellReadySeen = true;
    // During normal startup initialize() runs in the same DOMContentLoaded cycle.
    // Do not issue a second identical header request/replacement. Only support a
    // genuinely late shell creation after initialization.
    if (initialized) loadShellSections(true);
  });

  // Do not unconditionally replace the header again at +100ms/+600ms: each
  // replacement rebuilt the logo/wallet markup and caused the visible flash.
  window.addEventListener('load', function () {
    const header = document.querySelector('.top-header');
    if (header && !header.getAttribute('data-layout-custom-applied')) {
      setTimeout(function () {
        if (!header.getAttribute('data-layout-custom-applied')) loadSection('frontend-header', [header], true);
      }, 500);
    }

    // Login/register page scripts, translations or cached restoration must never
    // replace the BO Layout Section after it has been applied. Refresh those
    // sections after all late scripts finish, then keep them authoritative.
    ['login-page', 'register-page'].forEach(function (sectionKey) {
      if (!targetsFor(sectionKey).length) return;
      setTimeout(function () { loadSection(sectionKey, targetsFor(sectionKey), true); }, 120);
      setTimeout(function () { loadSection(sectionKey, targetsFor(sectionKey), true); }, 700);
    });
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
