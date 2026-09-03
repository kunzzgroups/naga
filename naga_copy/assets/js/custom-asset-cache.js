(function(){
  // Frontend custom asset language switcher.
  // Default assets still come from assets/custom/images/*.png.
  // Translated site customize assets are loaded from Spring Boot content_translation via:
  //   GET /api/public/translation?refType=main_layout&refId=1
  // BO saves these rows from Site Customize -> Language Translation:
  //   ref_type = main_layout, ref_id = 1, lang_code = zh, field_key = logoUrl/homeUrl/etc.
  var CUSTOM_ASSET_VERSION = '1.0.33';
  var CUSTOM_IMAGE_PATH = 'assets/custom/images/';
  var REF_TYPE = 'main_layout';
  var REF_ID = '1';
  var translationCache = {};
  var versionJsonCache = null;
  var lastRunId = 0;
  var CACHE_PREFIX = 'naga_bo_custom_assets_v2:' + String(location.hostname || 'default').toLowerCase() + ':';

  function brandHeaders(extra){
    var h = new Headers(extra || {});
    var host = String(location.hostname || '').toLowerCase();
    if(host) h.set('X-Brand-Domain', host);
    return h;
  }

  function readPersistent(key){
    try{
      var raw=localStorage.getItem(CACHE_PREFIX+key);
      if(!raw) return null;
      var parsed=JSON.parse(raw);
      return parsed && parsed.data && typeof parsed.data==='object' ? parsed.data : null;
    }catch(e){ return null; }
  }

  function writePersistent(key,data){
    try{ localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({savedAt:Date.now(),data:data||{}})); }catch(e){}
  }

  function clearPersistent(){
    try{
      for(var i=localStorage.length-1;i>=0;i--){
        var key=localStorage.key(i);
        if(key && key.indexOf(CACHE_PREFIX)===0) localStorage.removeItem(key);
      }
    }catch(e){}
  }

  var FILE_FIELD_MAP = {
    'logo.png': 'logoUrl',
    'favicon.png': 'faviconUrl',
    'favicon2.png': 'faviconUrl2',
    'favicon3.png': 'faviconUrl3',
    'background.jpg': 'pageBackgroundUrl',
    'background.jpeg': 'pageBackgroundUrl',
    'background.png': 'pageBackgroundUrl',
    'referral.png': 'referralUrl',
    'share.png': 'shareUrl',
    'downline.png': 'downlineUrl',
    'copylink.png': 'copylinkUrl',
    'login.png': 'loginUrl',
    'login.jpg': 'loginUrl',
    'login.jpeg': 'loginUrl',
    'login.gif': 'loginUrl',
    'login.webp': 'loginUrl',
    'register.png': 'registerUrl',
    'register.jpg': 'registerUrl',
    'register.jpeg': 'registerUrl',
    'register.gif': 'registerUrl',
    'register.webp': 'registerUrl',
    'deposit.png': 'depositUrl',
    'withdraw.png': 'withdrawUrl',
    'refresh.png': 'refreshUrl',
    'home.png': 'homeUrl',
    'history.png': 'historyUrl',
    'bonus.png': 'bonusUrl',
    'livechat.png': 'livechatUrl',
    'setting.png': 'settingUrl',
    'provider-all.png': 'providerAllUrl',
    'provider-all.jpg': 'providerAllUrl',
    'provider-all.jpeg': 'providerAllUrl',
    'provider-all.webp': 'providerAllUrl',
    'provider-all.gif': 'providerAllUrl'
  };

  function apiBaseUrl(){
    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    return String((cfg && cfg.baseUrl) || 'https://bo.titanx7.com').replace(/\/+$/, '');
  }

  function uploadBaseUrl(){
    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    return String((cfg && cfg.uploadBaseUrl) || 'https://static.titanx7.com/uploads').replace(/\/+$/, '');
  }


  function customVersionJsonUrl(){
    return (window.NAGA_API&&window.NAGA_API.mainLayoutCustomize) || (apiBaseUrl() + '/api/customize/main-layout');
  }

  function loadVersionJson(forceRefresh){
    if(!forceRefresh && versionJsonCache) return Promise.resolve(versionJsonCache);
    if(!forceRefresh){
      var stored=readPersistent('main-layout');
      if(stored){
        versionJsonCache=stored;
        window.NAGA_CUSTOM_ASSETS=stored;
        CUSTOM_ASSET_VERSION=String(stored.version||CUSTOM_ASSET_VERSION);
        return Promise.resolve(stored);
      }
    }
    // no-cache allows HTTP revalidation instead of forcing a full payload download
    // on every hard refresh. Brand headers are still attached by brand-runtime.
    return fetch(customVersionJsonUrl(), { cache: 'no-cache', headers: brandHeaders({ 'Accept':'application/json' }) })
      .then(function(res){ if(!res.ok) throw new Error('main layout api failed'); return res.json(); })
      .then(function(json){
        versionJsonCache = (json && json.data) || {};
        window.NAGA_CUSTOM_ASSETS = versionJsonCache;
        CUSTOM_ASSET_VERSION = String(versionJsonCache.version || CUSTOM_ASSET_VERSION);
        writePersistent('main-layout',versionJsonCache);
        return versionJsonCache;
      })
      .catch(function(){
        return versionJsonCache || readPersistent('main-layout') || {};
      });
  }

  function defaultBackgroundFromVersionJson(versionData){
    versionData = versionData || {};
    // BO site-customize writes the actual uploaded filename/url here.
    // This can be background.png, background.jpg, background.jpeg, or a full uploaded URL.
    return resolveImageValue(versionData.background || versionData.pageBackgroundUrl || '') || (CUSTOM_IMAGE_PATH + 'background.png');
  }

  function translationApiUrl(){
    return ((window.NAGA_API&&window.NAGA_API.siteCustomizeTranslation)||apiBaseUrl() + '/api/public/translation') + '?' + new URLSearchParams({
      refType: REF_TYPE,
      refId: REF_ID
    }).toString();
  }

  function currentLang(){
    var lang = (window.I18N && window.I18N.current) || localStorage.getItem('site_lang') || localStorage.getItem('lang') || document.documentElement.lang || 'en';
    return String(lang || 'en').toLowerCase().split('-')[0];
  }

  function isDefaultLang(lang){
    var def = (window.I18N && window.I18N.defaultLang) || 'en';
    return String(lang || currentLang()).toLowerCase().split('-')[0] === String(def || 'en').toLowerCase().split('-')[0];
  }

  function isFullUrl(value){
    value = String(value || '');
    return /^(https?:)?\/\//i.test(value) || value.indexOf('data:') === 0 || value.indexOf('assets/') === 0 || value.indexOf('../') === 0 || value.indexOf('./') === 0 || value.charAt(0) === '/';
  }

  function resolveImageValue(value){
    value = String(value || '').trim();
    if(!value) return '';

    // Older BO versions stored frontend assets as ../naga/assets/... .
    // On the deployed frontend this resolves to /naga/assets/... and returns 404,
    // which previously replaced the valid CSS background with a broken URL.
    value = value
      .replace(/^\.\.\/naga\/assets\//i, 'assets/')
      .replace(/^\.\/naga\/assets\//i, 'assets/')
      .replace(/^\/naga\/assets\//i, 'assets/');

    if(isFullUrl(value)) return value;
    // Dynamic translation image upload normally saves a filename from UploadService.
    // Use uploads/media as safe default for translated images.
    return uploadBaseUrl() + '/media/' + value.replace(/^\/+/, '');
  }

  function addCacheBuster(url){
    if(!url) return url;
    if(url.indexOf('data:') === 0) return url;

    // Do not add Date.now() on every page load.
    // Date.now() disables browser cache and makes logo/background/gif download again.
    // Keep existing version query from BO version.json, otherwise add stable version.
    if(/[?&](v|_cb)=/i.test(url)) return url;

    var parts = String(url).split('#');
    var base = parts[0];
    var hash = parts.length > 1 ? '#' + parts.slice(1).join('#') : '';
    return base + (base.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(CUSTOM_ASSET_VERSION) + hash;
  }

  function cleanPath(url){
    return String(url || '').split('?')[0].split('#')[0];
  }

  function fileNameFromUrl(url){
    var path = cleanPath(url).replace(/\\/g, '/');
    return path.substring(path.lastIndexOf('/') + 1).toLowerCase();
  }

  function fieldFromUrl(url){
    return FILE_FIELD_MAP[fileNameFromUrl(url)] || '';
  }

  function defaultSrc(el, attr){
    var key = attr === 'href' ? 'data-default-custom-href' : 'data-default-custom-src';
    var fieldKey = attr === 'href' ? 'data-custom-asset-href-field' : 'data-custom-asset-src-field';
    var current = el.getAttribute(attr) || '';

    // Important: save the original English/default asset once only.
    // After switching to zh, src/href becomes uploads/media/xxx, so later selectors
    // cannot find assets/custom/images anymore unless we keep this marker.
    if(!el.getAttribute(key) && current.indexOf('assets/custom/images/') !== -1){
      el.setAttribute(key, current);
      el.setAttribute(fieldKey, fieldFromUrl(current));
    }

    return el.getAttribute(key) || current;
  }

  function rememberDefaultAssets(){
    document.querySelectorAll('img[src*="assets/custom/images/"], input[type="image"][src*="assets/custom/images/"]').forEach(function(el){
      defaultSrc(el, 'src');
    });
    document.querySelectorAll('link[href*="assets/custom/images/"]').forEach(function(el){
      defaultSrc(el, 'href');
    });
  }

  function getTranslatedValue(data, field){
    if(!data || !field) return '';
    return data[field] || data[field + 'Url'] || data[field.replace(/Url$/, '')] || '';
  }

  function loadTranslationData(lang,forceRefresh){
    lang = String(lang || currentLang()).toLowerCase().split('-')[0];
    if(isDefaultLang(lang)) return Promise.resolve({});
    if(!forceRefresh && translationCache[lang]) return Promise.resolve(translationCache[lang]);
    if(!forceRefresh){
      var stored=readPersistent('translation:'+lang);
      if(stored){ translationCache[lang]=stored; return Promise.resolve(stored); }
    }

    return fetch(translationApiUrl(), { cache: 'no-cache', headers: brandHeaders({ 'Accept':'application/json' }) })
      .then(function(res){ if(!res.ok) throw new Error('translation api failed'); return res.json(); })
      .then(function(json){
        var all = (json && json.data) || {};
        translationCache = all || {};
        var selected=translationCache[lang] || translationCache[lang.toLowerCase()] || {};
        writePersistent('translation:'+lang,selected);
        return selected;
      })
      .catch(function(err){
        console.warn('Site customize translation image load failed:', err.message);
        return translationCache[lang] || readPersistent('translation:'+lang) || {};
      });
  }

  function versionAssetValue(versionData, field){
    versionData = versionData || {};
    var map = {
      logoUrl:'logo', faviconUrl:'favicon', faviconUrl2:'favicon2', faviconUrl3:'favicon3', pageBackgroundUrl:'background',
      referralUrl:'referral', shareUrl:'share', downlineUrl:'downline', copylinkUrl:'copylink',
      loginUrl:'login', registerUrl:'register', depositUrl:'deposit', withdrawUrl:'withdraw', refreshUrl:'refresh',
      homeUrl:'home', historyUrl:'history', bonusUrl:'bonus', livechatUrl:'livechat', settingUrl:'setting', providerAllUrl:'providerAll'
    };
    var key = map[field] || field.replace(/Url$/, '');
    return String(versionData[key] || '').trim();
  }

  function applyImageTranslations(data, versionData){
    // Select both original custom assets and already-translated assets.
    // This fixes zh -> en without page refresh. Previously, after zh was applied,
    // the src became static uploads/media, so the old selector no longer matched it.
    document.querySelectorAll('img[src*="assets/custom/images/"], input[type="image"][src*="assets/custom/images/"], img[data-default-custom-src], input[type="image"][data-default-custom-src]').forEach(function(el){
      var fallback = defaultSrc(el, 'src');
      var field = el.getAttribute('data-custom-asset-src-field') || fieldFromUrl(fallback);
      var translated = resolveImageValue(getTranslatedValue(data, field));
      var boDefault = resolveImageValue(versionAssetValue(versionData, field));
      var finalSrc = addCacheBuster(translated || boDefault || fallback);

      if(translated || boDefault){
        el.onerror = function(){
          el.onerror = null;
          el.setAttribute('src', addCacheBuster(fallback));
        };
      }else{
        el.onerror = null;
      }

      if(finalSrc){
        // BO-driven shell/custom assets are visible UI chrome. Never lazy-load them:
        // page-loader keeps the page hidden until these settle, preventing pop-in on any page.
        try{ el.loading = 'eager'; }catch(e){}
        try{ el.fetchPriority = 'high'; }catch(e){}
        el.setAttribute('src', finalSrc);
      }
    });

    document.querySelectorAll('link[href*="assets/custom/images/"], link[data-default-custom-href]').forEach(function(el){
      var fallback = defaultSrc(el, 'href');
      var field = el.getAttribute('data-custom-asset-href-field') || fieldFromUrl(fallback);
      var translated = resolveImageValue(getTranslatedValue(data, field));
      var boDefault = resolveImageValue(versionAssetValue(versionData, field));
      var finalHref = addCacheBuster(translated || boDefault || fallback);
      if(finalHref) el.setAttribute('href', finalHref);
    });
  }

  function applyBackground(data, versionData){
    var fallback = defaultBackgroundFromVersionJson(versionData);
    var translated = resolveImageValue(getTranslatedValue(data, 'pageBackgroundUrl'));
    var bgUrl = addCacheBuster(translated || fallback);

    // Return a promise so the global page reveal can wait for the final BO background
    // (or its fallback decision) instead of exposing a background swap after first paint.
    return new Promise(function(resolve){
      var settled=false;
      function finish(){ if(settled) return; settled=true; resolve(); }
      var probe = new Image();
      try{ probe.fetchPriority = 'high'; }catch(e){}
      probe.onload = function(){
        document.querySelectorAll('style[data-custom-asset-cache]').forEach(function(el){ el.remove(); });
        var style = document.createElement('style');
        style.setAttribute('data-custom-asset-cache', CUSTOM_ASSET_VERSION);
        style.textContent = [
        'body,',
        'body.bonus-page,',
        'body.deposit-page,',
        'body.downline-page,',
        'body.forgot-page,',
        'body.game-detail-page,',
        'body.history-page,',
        'body.login-page,',
        'body.setting-page,',
        'body.withdraw-page,',
        'body.password-setting-page,',
        'body.transaction-password-setting-page,',
        'body.mobile-setting-page {',
        '  background-image: linear-gradient(var(--page-background-overlay), var(--page-background-overlay)), url("' + bgUrl + '") !important;',
        '  background-repeat: no-repeat !important;',
        '  background-position: center top !important;',
        '  background-size: cover !important;',
        '  background-attachment: fixed !important;',
        '}'
        ].join('\n');
        document.head.appendChild(style);
        finish();
      };
      probe.onerror = function(){
        console.warn('[custom-assets] Background image could not be loaded:', bgUrl);
        finish();
      };
      probe.src = bgUrl;
      // Performance safety: never hold first paint indefinitely for one remote image.
      setTimeout(finish, 550);
    });
  }

  function waitForCustomImages(){
    var nodes=Array.prototype.slice.call(document.querySelectorAll(
      'img[data-default-custom-src], input[type="image"][data-default-custom-src], img[src*="assets/custom/images/"], input[type="image"][src*="assets/custom/images/"]'
    ));
    if(!nodes.length) return Promise.resolve();
    return new Promise(function(resolve){
      var pending=0, finished=false;
      function done(){
        if(finished) return;
        pending--;
        if(pending<=0){ finished=true; resolve(); }
      }
      nodes.forEach(function(el){
        try{ el.loading='eager'; el.fetchPriority='high'; }catch(e){}
        if(el.complete) return;
        pending++;
        el.addEventListener('load',done,{once:true});
        el.addEventListener('error',done,{once:true});
      });
      if(pending===0){ finished=true; resolve(); return; }
      // Keep performance #1: 550 ms is enough to avoid normal visible pop-in while
      // a broken/slow CDN asset can never trap the user behind the page loader.
      setTimeout(function(){ if(!finished){ finished=true; resolve(); } },550);
    });
  }

  function signalReady(runId,versionData){
    if(runId !== lastRunId) return;
    if(!window.__NAGA_CUSTOM_ASSETS_READY__){
      window.__NAGA_CUSTOM_ASSETS_READY__=true;
      document.dispatchEvent(new CustomEvent('naga:custom-assets-ready',{detail:versionData}));
    }
  }

  function applyReady(runId,data,versionData,source){
    if(runId !== lastRunId) return;
    data=data||{}; versionData=versionData||{};
    // Set every BO-driven image source while the page is still covered/hidden, then
    // wait briefly for both image chrome and background to settle before reveal.
    applyImageTranslations(data,versionData);
    Promise.all([applyBackground(data,versionData),waitForCustomImages()]).then(function(){
      signalReady(runId,versionData);
    });
  }

  function run(){
    var runId = ++lastRunId;
    var lang = currentLang();

    // Always keep the original/default asset before applying language images.
    // Required for switching zh -> en instantly.
    rememberDefaultAssets();

    // Returning visitors can paint the last BO-confirmed assets synchronously,
    // then revalidate in the background. This removes the black/loading wait
    // without ever using fabricated preload values.
    var cachedVersion=readPersistent('main-layout');
    var cachedTranslation=isDefaultLang(lang)?{}:readPersistent('translation:'+lang);
    if(cachedVersion && (isDefaultLang(lang) || cachedTranslation)){
      versionJsonCache=cachedVersion;
      if(cachedTranslation) translationCache[lang]=cachedTranslation;
      window.NAGA_CUSTOM_ASSETS=cachedVersion;
      CUSTOM_ASSET_VERSION=String(cachedVersion.version||CUSTOM_ASSET_VERSION);
      applyReady(runId,cachedTranslation||{},cachedVersion,'cache');
    }

    Promise.all([loadTranslationData(lang,true), loadVersionJson(true)]).then(function(result){
      applyReady(runId,result[0]||{},result[1]||{},'fresh');
    });
  }

  window.NAGA_CUSTOM_ASSET_TRANSLATION = {
    refresh: function(){
      translationCache = {};
      versionJsonCache = null;
      clearPersistent();
      window.__NAGA_CUSTOM_ASSETS_READY__ = false;
      CUSTOM_ASSET_VERSION = String(Date.now());
      run();
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  }else{
    run();
  }

  document.addEventListener('i18n:changed', run);
  // Layout Section HTML/CSS may be inserted after the first Site Customize pass.
  // Re-run once after all BO sections are applied so newly inserted logo/button
  // images receive the current brand assets and the BO background wins over any
  // legacy !important background rule saved inside the Layout Section CSS.
  document.addEventListener('naga:layout-sections-loaded', function(){
    run();
  });
})();
