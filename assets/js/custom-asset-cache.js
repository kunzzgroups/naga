(function(){
  // Frontend custom asset language switcher.
  // Default assets still come from assets/custom/images/*.png.
  // Translated site customize assets are loaded from Spring Boot content_translation via:
  //   GET /api/admin/language/translation?refType=main_layout&refId=1
  // BO saves these rows from Site Customize -> Language Translation:
  //   ref_type = main_layout, ref_id = 1, lang_code = zh, field_key = logoUrl/homeUrl/etc.
  var CUSTOM_ASSET_VERSION = String(Date.now());
  var CUSTOM_IMAGE_PATH = 'assets/custom/images/';
  var REF_TYPE = 'main_layout';
  var REF_ID = '1';
  var translationCache = {};
  var lastRunId = 0;

  var FILE_FIELD_MAP = {
    'logo.png': 'logoUrl',
    'favicon.png': 'faviconUrl',
    'favicon2.png': 'faviconUrl2',
    'favicon3.png': 'faviconUrl3',
    'background.jpg': 'pageBackgroundUrl',
    'referral.png': 'referralUrl',
    'share.png': 'shareUrl',
    'downline.png': 'downlineUrl',
    'copylink.png': 'copylinkUrl',
    'facebook.png': 'facebookUrl',
    'telegram.png': 'telegramUrl',
    'login.gif': 'loginUrl',
    'register.gif': 'registerUrl',
    'deposit.png': 'depositUrl',
    'withdraw.png': 'withdrawUrl',
    'refresh.png': 'refreshUrl',
    'home.png': 'homeUrl',
    'history.png': 'historyUrl',
    'bonus.png': 'bonusUrl',
    'livechat.png': 'livechatUrl',
    'setting.png': 'settingUrl'
  };

  function apiBaseUrl(){
    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    return String((cfg && cfg.baseUrl) || 'https://bo.titanxgaming.com').replace(/\/+$/, '');
  }

  function uploadBaseUrl(){
    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    return String((cfg && cfg.uploadBaseUrl) || 'https://static.titanxgaming.com/uploads').replace(/\/+$/, '');
  }

  function translationApiUrl(){
    return apiBaseUrl() + '/api/admin/language/translation?' + new URLSearchParams({
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
    return /^(https?:)?\/\//i.test(value) || value.indexOf('data:') === 0 || value.indexOf('assets/') === 0 || value.charAt(0) === '/';
  }

  function resolveImageValue(value){
    value = String(value || '').trim();
    if(!value) return '';
    if(isFullUrl(value)) return value;
    // Dynamic translation image upload normally saves a filename from UploadService.
    // Use uploads/media as safe default for translated images.
    return uploadBaseUrl() + '/media/' + value.replace(/^\/+/, '');
  }

  function addCacheBuster(url){
    if(!url) return url;
    if(url.indexOf('data:') === 0) return url;

    var parts = String(url).split('#');
    var base = parts[0];
    var hash = parts.length > 1 ? '#' + parts.slice(1).join('#') : '';

    base = base.replace(/([?&])_cb=\d+(&?)/, function(match, p1, p2){
      return p2 ? p1 : '';
    });

    return base + (base.indexOf('?') === -1 ? '?' : '&') + '_cb=' + CUSTOM_ASSET_VERSION + hash;
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

  function loadTranslationData(lang){
    lang = String(lang || currentLang()).toLowerCase().split('-')[0];
    if(isDefaultLang(lang)) return Promise.resolve({});
    if(translationCache[lang]) return Promise.resolve(translationCache[lang]);

    return fetch(translationApiUrl(), { cache: 'no-store' })
      .then(function(res){ if(!res.ok) throw new Error('translation api failed'); return res.json(); })
      .then(function(json){
        var all = (json && json.data) || {};
        translationCache = all || {};
        return translationCache[lang] || translationCache[lang.toLowerCase()] || {};
      })
      .catch(function(err){
        console.warn('Site customize translation image load failed:', err.message);
        translationCache[lang] = {};
        return {};
      });
  }

  function applyImageTranslations(data){
    // Select both original custom assets and already-translated assets.
    // This fixes zh -> en without page refresh. Previously, after zh was applied,
    // the src became static uploads/media, so the old selector no longer matched it.
    document.querySelectorAll('img[src*="assets/custom/images/"], input[type="image"][src*="assets/custom/images/"], img[data-default-custom-src], input[type="image"][data-default-custom-src]').forEach(function(el){
      var fallback = defaultSrc(el, 'src');
      var field = el.getAttribute('data-custom-asset-src-field') || fieldFromUrl(fallback);
      var translated = resolveImageValue(getTranslatedValue(data, field));
      var finalSrc = addCacheBuster(translated || fallback);

      if(translated){
        el.onerror = function(){
          el.onerror = null;
          el.setAttribute('src', addCacheBuster(fallback));
        };
      }else{
        el.onerror = null;
      }

      if(finalSrc) el.setAttribute('src', finalSrc);
    });

    document.querySelectorAll('link[href*="assets/custom/images/"], link[data-default-custom-href]').forEach(function(el){
      var fallback = defaultSrc(el, 'href');
      var field = el.getAttribute('data-custom-asset-href-field') || fieldFromUrl(fallback);
      var translated = resolveImageValue(getTranslatedValue(data, field));
      var finalHref = addCacheBuster(translated || fallback);
      if(finalHref) el.setAttribute('href', finalHref);
    });
  }

  function applyBackground(data){
    var fallback = CUSTOM_IMAGE_PATH + 'background.jpg';
    var translated = resolveImageValue(getTranslatedValue(data, 'pageBackgroundUrl'));
    var bgUrl = addCacheBuster(translated || fallback);

    document.querySelectorAll('style[data-custom-asset-cache]').forEach(function(el){ el.remove(); });

    var style = document.createElement('style');
    style.setAttribute('data-custom-asset-cache', CUSTOM_ASSET_VERSION);
    style.textContent = [
      'body,',
      'body.bonus-page,',
      'body.chat-page,',
      'body.deposit-page,',
      'body.downline-page,',
      'body.forgot-page,',
      'body.game-detail-page,',
      'body.history-page,',
      'body.login-page,',
      'body.setting-page,',
      'body.withdraw-page {',
      '  background-image: url("' + bgUrl + '") !important;',
      '  background-repeat: no-repeat !important;',
      '  background-position: center top !important;',
      '  background-size: cover !important;',
      '  background-attachment: fixed !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function run(){
    var runId = ++lastRunId;
    var lang = currentLang();

    // Always keep the original/default asset before applying language images.
    // Required for switching zh -> en instantly.
    rememberDefaultAssets();

    loadTranslationData(lang).then(function(data){
      if(runId !== lastRunId) return;
      applyBackground(data);
      applyImageTranslations(data);
    });
  }

  window.NAGA_CUSTOM_ASSET_TRANSLATION = {
    refresh: function(){
      translationCache = {};
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
})();
