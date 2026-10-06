(function () {
  'use strict';

  var apiBase = String((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '').replace(/\/+$/, '');
  var uploadBase = String((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.uploadBaseUrl) || '').replace(/\/+$/, '');
  var API_URL = (window.NAGA_API && window.NAGA_API.socialLinkList) || (apiBase + '/api/social/list');
  var CACHE_KEY = 'naga_social_links_v2:' + String(location.hostname || 'default').toLowerCase();
  var current = [];
  var readySent = false;

  function safeHttpUrl(value) {
    try {
      var url = new URL(String(value || '').trim(), window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) { return ''; }
  }

  function imageUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\/\//.test(raw)) return window.location.protocol + raw;
    raw = raw.replace(/^\.\.\/naga\//i, '').replace(/^\.\//, '');
    if (/^assets\//i.test(raw)) return raw;
    if (/^\/assets\//i.test(raw)) return raw;
    if (/^uploads\//i.test(raw)) return uploadBase.replace(/\/uploads$/i, '') + '/' + raw;
    if (/^\/uploads\//i.test(raw)) return uploadBase.replace(/\/uploads$/i, '') + raw;
    if (/^social\//i.test(raw)) return uploadBase + '/' + raw.replace(/^\/+/, '');
    if (/^\/social\//i.test(raw)) return uploadBase + raw;
    return uploadBase + '/social/' + raw.replace(/^\/+/, '');
  }

  function unwrap(payload) {
    var data = payload && payload.data ? payload.data : payload;
    if (data && Array.isArray(data.content)) return data.content;
    if (Array.isArray(data)) return data;
    return [];
  }

  function normalize(payload) {
    return unwrap(payload).map(function (item) {
      return { id: item && item.id, url: safeHttpUrl(item && (item.url || item.linkUrl || item.link || item.socialUrl)), image: imageUrl(item && (item.imageUrl || item.image_url || item.image || item.imagePath || item.path || item.iconUrl || item.icon)) };
    }).filter(function (item) { return item.url && item.image; });
  }

  function readCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return parsed && Array.isArray(parsed.data) ? parsed.data.filter(function (item) { return item && item.url && item.image; }) : [];
    } catch (_) { return []; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: data || [] })); } catch (_) {}
  }

  function markReady() {
    if (readySent) return;
    readySent = true;
    window.__NAGA_SOCIAL_LINKS_READY__ = true;
    try { document.dispatchEvent(new CustomEvent('naga:social-links-ready')); } catch (_) {}
  }

  function createLink(item, index, onImageDone) {
    var anchor = document.createElement('a');
    anchor.className = 'social-image';
    anchor.href = item.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('data-social-id', item.id == null ? String(index) : String(item.id));

    var image = document.createElement('img');
    image.src = item.image;
    image.alt = 'Social link';
    image.decoding = 'async';
    // These buttons are above the fold on the lobby. Lazy-loading caused them to
    // pop in after the page was already visible, so prioritize the confirmed BO images.
    image.loading = 'eager';
    try { image.fetchPriority = index < 2 ? 'high' : 'auto'; } catch (_) {}
    var done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      if (!ok) anchor.classList.add('social-image-load-error');
      if (onImageDone) onImageDone();
    }
    image.addEventListener('load', function () { finish(true); }, { once: true });
    image.addEventListener('error', function () { finish(false); }, { once: true });
    anchor.appendChild(image);
    return anchor;
  }

  function socialLabel(urlValue) {
    try {
      var host = new URL(urlValue).hostname.toLowerCase().replace(/^www\./, '');
      if (host.indexOf('facebook.') !== -1 || host === 'fb.com') return 'Facebook';
      if (host.indexOf('telegram.') !== -1 || host === 't.me') return 'Telegram';
      if (host.indexOf('instagram.') !== -1) return 'Instagram';
      if (host.indexOf('whatsapp.') !== -1 || host === 'wa.me') return 'WhatsApp';
      if (host.indexOf('youtube.') !== -1 || host === 'youtu.be') return 'YouTube';
      if (host.indexOf('tiktok.') !== -1) return 'TikTok';
      if (host.indexOf('twitter.') !== -1 || host === 'x.com') return 'X';
      return host.split('.')[0].replace(/(^|[-_])([a-z])/g, function (_, sep, ch) { return (sep ? ' ' : '') + ch.toUpperCase(); }) || 'Social Media';
    } catch (_) { return 'Social Media'; }
  }

  function createMobileLink(item, index) {
    var anchor = document.createElement('a');
    anchor.className = 'mobile-social-item';
    anchor.href = item.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('data-social-id', item.id == null ? String(index) : String(item.id));

    var iconWrap = document.createElement('span');
    iconWrap.className = 'mobile-social-item-icon';
    var image = document.createElement('img');
    image.src = item.image;
    image.alt = '';
    image.decoding = 'async';
    image.loading = 'lazy';
    iconWrap.appendChild(image);

    var label = document.createElement('span');
    label.className = 'mobile-social-item-label';
    label.textContent = socialLabel(item.url);

    anchor.appendChild(iconWrap);
    anchor.appendChild(label);
    return anchor;
  }

  function applyMobile() {
    document.querySelectorAll('[data-mobile-social-list]').forEach(function (container) {
      container.innerHTML = '';
      current.forEach(function (item, index) {
        container.appendChild(createMobileLink(item, index));
      });
      // BO owns visibility/layout. Only expose data state for BO CSS/JS if desired.
      container.setAttribute('data-social-count', String(current.length));
      var group = container.closest('[data-mobile-social-group]');
      if (group) { group.hidden = current.length === 0; if (!current.length) group.classList.remove('is-open'); }
      if (window.NagaSidebarRuntime && typeof window.NagaSidebarRuntime.syncSocialVisibility === 'function') window.NagaSidebarRuntime.syncSocialVisibility();
    });
  }

  function apply(options) {
    options = options || {};
    var pending = 0;
    applyMobile();
    var containers = document.querySelectorAll('[data-social-links]');
    containers.forEach(function (container) {
      container.innerHTML = '';
      current.forEach(function (item, index) {
        pending += 1;
        container.appendChild(createLink(item, index, function () {
          pending -= 1;
          if (pending <= 0 && options.markReady) markReady();
        }));
      });
      container.hidden = current.length === 0;
    });
    if (!current.length || !containers.length || pending === 0) {
      if (options.markReady) markReady();
    } else if (options.markReady) {
      // Never trade performance for an image that is unusually slow. The DOM and
      // its final layout are already reserved; this cap only avoids visible pop-in.
      setTimeout(markReady, 450);
    }
  }

  function load() {
    return fetch(API_URL, { method: 'GET', cache: 'no-cache', credentials: 'omit' })
      .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
      .then(function (payload) {
        var fresh = normalize(payload);
        // Only touch the DOM when BO data actually changed, avoiding image restart/flicker.
        var before = JSON.stringify(current);
        current = fresh;
        writeCache(current);
        if (JSON.stringify(current) !== before) apply({ markReady: !readySent });
        else if (!readySent) markReady();
        return current;
      })
      .catch(function () {
        // Keep last-known-good BO links on transient failure. Do not collapse the
        // block and cause layout movement just because one refresh lost the API.
        if (!current.length) current = readCache();
        apply({ markReady: !readySent });
        return current;
      });
  }

  function start() {
    // Paint last-confirmed BO links synchronously before page-loader reveals the lobby.
    current = readCache();
    if (current.length) apply({ markReady: true });
    load();
    // Brand-new browser: give BO only a short window to establish the social row.
    if (!current.length) setTimeout(markReady, 450);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  document.addEventListener('naga:layout-section-applied', function (event) {
    if (event && event.detail && event.detail.sectionKey === 'frontend-sidebar') applyMobile();
  });
  document.addEventListener('naga:layout-section-restored', function (event) {
    if (event && event.detail && event.detail.sectionKey === 'frontend-sidebar') applyMobile();
  });


  // BO may inject/replace frontend-sidebar after this controller has already loaded.
  // Observe only for the BO-owned placeholder; never build sidebar structure here.
  var sidebarObserver = new MutationObserver(function () {
    if (document.querySelector('[data-mobile-social-list]')) applyMobile();
  });
  if (document.documentElement) sidebarObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.NagaSocialLinks = { refresh: load, apply: function () { apply({ markReady: !readySent }); }, applyMobile: applyMobile };
})();
