(function(){
  'use strict';

  var base = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  var API_URL = String(base || '').replace(/\/+$/, '') + '/api/customize/social';
  var VERSION_URL = 'assets/custom/version.json?_=' + Date.now();
  var current = { facebookHref: '', telegramHref: '' };

  function safeHttpUrl(value){
    try {
      var url = new URL(String(value || '').trim(), window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch(e){
      return '';
    }
  }

  function unwrap(payload){
    if(!payload || typeof payload !== 'object') return {};
    var data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    if(data.social && typeof data.social === 'object') data = data.social;
    return data || {};
  }

  function readLinks(payload){
    var data = unwrap(payload);
    return {
      facebookHref: safeHttpUrl(data.facebookHref || data.facebook_href || data.facebookUrl || data.facebook_url),
      telegramHref: safeHttpUrl(data.telegramHref || data.telegram_href || data.telegramUrl || data.telegram_url)
    };
  }

  function platformOf(anchor){
    var img = anchor && anchor.querySelector ? anchor.querySelector('img') : null;
    var text = ((img && (img.alt || img.src)) || anchor.id || '').toLowerCase();
    if(text.indexOf('facebook') !== -1) return 'facebook';
    if(text.indexOf('telegram') !== -1) return 'telegram';
    return '';
  }

  function apply(){
    document.querySelectorAll('a.social-image, #settingFacebookLink, #settingTelegramLink').forEach(function(anchor){
      var platform = platformOf(anchor);
      var href = platform === 'facebook' ? current.facebookHref : platform === 'telegram' ? current.telegramHref : '';
      if(!href){
        anchor.removeAttribute('target');
        anchor.setAttribute('href', '#');
        anchor.setAttribute('aria-disabled', 'true');
        return;
      }
      anchor.href = href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.removeAttribute('aria-disabled');
      anchor.hidden = false;
    });

    var settingWrap = document.getElementById('settingSocialLinks');
    if(settingWrap) settingWrap.hidden = !(current.facebookHref || current.telegramHref);
  }

  function fetchJson(url){
    return fetch(url, { method:'GET', cache:'no-store', credentials:'omit' })
      .then(function(response){
        if(!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      });
  }

  function load(){
    return fetchJson(API_URL)
      .then(readLinks)
      .catch(function(){ return fetchJson(VERSION_URL).then(readLinks).catch(function(){ return current; }); })
      .then(function(links){ current = links || current; apply(); return current; });
  }

  document.addEventListener('click', function(event){
    var anchor = event.target && event.target.closest ? event.target.closest('a.social-image, #settingFacebookLink, #settingTelegramLink') : null;
    if(!anchor) return;
    var platform = platformOf(anchor);
    var href = platform === 'facebook' ? current.facebookHref : current.telegramHref;
    if(!href){ event.preventDefault(); }
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ apply(); load(); }, {once:true});
  else { apply(); load(); }

  window.NagaSocialLinks = { refresh: load, apply: apply };
})();
