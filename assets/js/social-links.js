(function () {
  'use strict';

  var apiBase = String((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '').replace(/\/+$/, '');
  var uploadBase = String((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.uploadBaseUrl) || '').replace(/\/+$/, '');
  var API_URL = apiBase + '/api/social/list';
  var current = [];

  function safeHttpUrl(value) {
    try {
      var url = new URL(String(value || '').trim(), window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
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
      return {
        id: item && item.id,
        url: safeHttpUrl(item && item.url),
        image: imageUrl(item && (item.imageUrl || item.image))
      };
    }).filter(function (item) {
      return item.url && item.image;
    });
  }

  function createLink(item, index) {
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
    image.loading = 'lazy';
    image.addEventListener('error', function () {
      anchor.hidden = true;
    }, { once: true });

    anchor.appendChild(image);
    return anchor;
  }

  function apply() {
    document.querySelectorAll('[data-social-links]').forEach(function (container) {
      container.innerHTML = '';
      current.forEach(function (item, index) {
        container.appendChild(createLink(item, index));
      });
      container.hidden = current.length === 0;
    });
  }

  function load() {
    return fetch(API_URL, { method: 'GET', cache: 'no-store', credentials: 'omit' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        current = normalize(payload);
        apply();
        return current;
      })
      .catch(function () {
        current = [];
        apply();
        return current;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      apply();
      load();
    }, { once: true });
  } else {
    apply();
    load();
  }

  window.NagaSocialLinks = { refresh: load, apply: apply };
})();
