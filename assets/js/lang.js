(function(){
  'use strict';

  var defaultConfig = {
    default_lang: 'en',
    available_langs: ['en', 'zh'],
    storage_key: 'site_lang'
  };

  var config = Object.assign({}, defaultConfig);
  var cache = {};
  var defaultDict = {};

  function isEmpty(value){
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }

  function normaliseLang(lang){
    lang = typeof lang === 'string' ? lang.trim() : '';
    return config.available_langs.indexOf(lang) >= 0 ? lang : config.default_lang;
  }

  function getStorageKey(){
    return config.storage_key || 'site_lang';
  }

  function getSavedLang(){
    var saved = '';
    try { saved = localStorage.getItem(getStorageKey()); } catch(e) { saved = ''; }
    return normaliseLang(saved);
  }

  function setSavedLang(lang){
    try { localStorage.setItem(getStorageKey(), normaliseLang(lang)); } catch(e) {}
  }

  function fallbackDict(lang){
    // Small fallback so the switcher still works when opening HTML directly with file://.
    // On a real server, assets/lang/config.json + assets/lang/*.json are used.
    var base = [];
    if(lang === 'zh'){
      return Object.assign({}, base, []);
    }
    return base;
  }

  function loadConfig(){
    return fetch('assets/lang/config.json?v=' + Date.now(), {cache:'no-store'})
      .then(function(res){ if(!res.ok) throw new Error('Cannot load language config'); return res.json(); })
      .then(function(json){
        json = json || {};
        config.default_lang = typeof json.default_lang === 'string' && json.default_lang.trim() ? json.default_lang.trim() : defaultConfig.default_lang;
        config.available_langs = Array.isArray(json.available_langs) && json.available_langs.length ? json.available_langs : defaultConfig.available_langs;
        config.storage_key = typeof json.storage_key === 'string' && json.storage_key.trim() ? json.storage_key.trim() : defaultConfig.storage_key;
        if(config.available_langs.indexOf(config.default_lang) < 0){ config.default_lang = config.available_langs[0] || 'en'; }
        return config;
      })
      .catch(function(){ return config; });
  }

  function loadDictFile(lang){
    lang = normaliseLang(lang);
    if(cache[lang]) return Promise.resolve(cache[lang]);
    return fetch('assets/lang/' + lang + '.json?v=' + Date.now(), {cache:'no-store'})
      .then(function(res){ if(!res.ok) throw new Error('Cannot load language JSON'); return res.json(); })
      .then(function(json){ cache[lang] = json || {}; return cache[lang]; })
      .catch(function(){ cache[lang] = fallbackDict(lang); return cache[lang]; });
  }

  function t(key){
    if(!key) return '';
    var dict = window.I18N.dict || {};
    var currentValue = dict[key];
    if(!isEmpty(currentValue)) return currentValue;
    var defaultValue = defaultDict[key];
    if(!isEmpty(defaultValue)) return defaultValue;
    return key;
  }

  function imgSrc(key){
    var dict = window.I18N.dict || {};
    if(!isEmpty(dict[key])) return dict[key];
    if(!isEmpty(defaultDict[key])) return defaultDict[key];
    return '';
  }

  function applyLanguage(){
    document.documentElement.lang = window.I18N.current === 'zh' ? 'zh-CN' : 'en';

    document.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el){ el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){ el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    document.querySelectorAll('[data-i18n-alt]').forEach(function(el){ el.setAttribute('alt', t(el.getAttribute('data-i18n-alt'))); });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el){ el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function(el){ el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });

    // Image translation. If CH image value is empty/null/missing, it automatically uses default language image.
    document.querySelectorAll('img[data-i18n-img], input[type="image"][data-i18n-img]').forEach(function(img){
      var key = img.getAttribute('data-i18n-img');
      var src = imgSrc(key);
      if(src){ img.setAttribute('src', src); }
    });

    document.querySelectorAll('.lang-option').forEach(function(btn){
      var active = btn.getAttribute('data-lang') === window.I18N.current;
      btn.classList.toggle('active', active);
      var mark = btn.querySelector('.checkmark');
      if(active && !mark) btn.insertAdjacentHTML('beforeend', ' <span class="checkmark">✔</span>');
      if(!active && mark) mark.remove();
    });

    var langBtn = document.getElementById('langBtn');
    // if(langBtn) langBtn.textContent = t('lang_button');

    document.dispatchEvent(new CustomEvent('i18n:changed', {detail:{lang:window.I18N.current}}));
  }

  function changeLanguage(lang){
    lang = normaliseLang(lang);
    return Promise.all([loadDictFile(config.default_lang), loadDictFile(lang)]).then(function(result){
      defaultDict = result[0] || {};
      window.I18N.current = lang;
      window.I18N.defaultLang = config.default_lang;
      window.I18N.dict = result[1] || {};
      window.I18N.config = config;
      setSavedLang(lang);
      applyLanguage();
      return window.I18N.dict;
    });
  }

  window.I18N = {
    current: 'en',
    defaultLang: 'en',
    dict: {},
    config: config,
    t: t,
    load: changeLanguage,
    setLanguage: changeLanguage,
    apply: applyLanguage,
    resetToDefault: function(){
      try { localStorage.removeItem(getStorageKey()); } catch(e) {}
      return changeLanguage(config.default_lang);
    }
  };

  document.addEventListener('DOMContentLoaded', function(){
    loadConfig().then(function(){
      window.I18N.current = getSavedLang();
      window.I18N.defaultLang = config.default_lang;
      window.I18N.config = config;
      return changeLanguage(window.I18N.current);
    });

    var langBtn = document.getElementById('langBtn');
    var langOverlay = document.getElementById('langOverlay');
    function openLangPopup(){ if(langOverlay){ langOverlay.classList.add('show'); langOverlay.setAttribute('aria-hidden','false'); } }
    function closeLangPopup(){ if(langOverlay){ langOverlay.classList.remove('show'); langOverlay.setAttribute('aria-hidden','true'); } }

    if(langBtn) langBtn.addEventListener('click', openLangPopup);
    if(langOverlay){
      langOverlay.addEventListener('click', function(e){
        if(e.target === langOverlay) closeLangPopup();
        var btn = e.target.closest && e.target.closest('.lang-option[data-lang]');
        if(btn){ changeLanguage(btn.getAttribute('data-lang')).then(closeLangPopup); }
      });
    }
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeLangPopup(); });
  });
})();
