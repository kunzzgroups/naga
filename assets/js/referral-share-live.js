(function(){
  'use strict';

  const API_BASE = String((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '').replace(/\/+$/, '');
  let currentCode = '';
  let currentLink = '';
  let qrFile = null;
  let loadingPromise = null;
  let lastTrigger = null;

  function getToken(){
    return localStorage.getItem('member_token') || localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  }

  function parseJson(value){
    try { return JSON.parse(value || '{}') || {}; } catch (_) { return {}; }
  }

  function getStoredMember(){
    return parseJson(localStorage.getItem('member_info'));
  }

  function firstValue(){
    for(let i = 0; i < arguments.length; i++){
      const value = arguments[i];
      if(value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  }

  function findReferralCode(object, depth){
    if(!object || typeof object !== 'object' || (depth || 0) > 6) return '';
    const direct = firstValue(
      object.referralCode, object.referral_code,
      object.referrerCode, object.referrer_code,
      object.inviteCode, object.invite_code,
      object.refCode, object.ref_code
    );
    if(direct) return direct;

    const keys = Object.keys(object);
    for(const key of keys){
      if(/(referral|referrer|invite|ref).*code/i.test(key)){
        const value = object[key];
        if(value !== undefined && value !== null && String(value).trim()) return String(value).trim();
      }
    }
    for(const key of keys){
      const value = object[key];
      if(value && typeof value === 'object'){
        const nested = findReferralCode(value, (depth || 0) + 1);
        if(nested) return nested;
      }
    }
    return '';
  }

  function createLink(code){
    if(!code) return '';
    const url = new URL('register.html', window.location.href);
    url.searchParams.set('ref', code);
    return url.href;
  }

  function applyCode(code){
    code = String(code || '').trim();
    if(!code) return false;
    currentCode = code;
    currentLink = createLink(code);
    localStorage.setItem('member_referral_code', currentCode);
    localStorage.setItem('member_referral_link', currentLink);
    document.querySelectorAll('[data-referral-code], .share-head strong').forEach(function(el){ el.textContent = currentCode; });
    return true;
  }

  function readCachedCode(){
    const memberCode = findReferralCode(getStoredMember());
    const cachedCode = String(localStorage.getItem('member_referral_code') || '').trim();
    let linkCode = '';
    try {
      const cachedLink = localStorage.getItem('member_referral_link') || '';
      if(cachedLink) linkCode = new URL(cachedLink, window.location.href).searchParams.get('ref') || '';
    } catch (_) {}
    return firstValue(memberCode, cachedCode, linkCode);
  }

  async function loadMember(){
    const accessToken = getToken();
    if(!accessToken) return '';
    const response = await fetch(API_BASE + '/api/auth/member/me', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Accept': 'application/json'
      },
      credentials: 'omit',
      cache: 'no-store'
    });
    const payload = await response.json().catch(function(){ return {}; });
    if(!response.ok || payload.status === 'error') throw new Error(payload.message || 'Unable to load member profile');
    const member = payload.data || payload.member || payload.profile || payload;
    if(member && typeof member === 'object'){
      localStorage.setItem('member_info', JSON.stringify(Object.assign({}, getStoredMember(), member)));
    }
    return findReferralCode(member);
  }

  async function prepareQrFile(){
    if(!currentLink || !window.File) return null;
    try {
      const url = 'https://quickchart.io/qr?size=420&margin=2&format=png&text=' + encodeURIComponent(currentLink);
      const response = await fetch(url, {mode:'cors', cache:'no-store', credentials:'omit'});
      if(!response.ok) return null;
      const blob = await response.blob();
      if(!blob.size) return null;
      qrFile = new File([blob], 'titanx-referral-' + currentCode + '.png', {type:'image/png'});
      return qrFile;
    } catch (_) {
      return null;
    }
  }

  function preload(force){
    if(loadingPromise && !force) return loadingPromise;
    loadingPromise = (async function(){
      const cached = readCachedCode();
      if(cached) applyCode(cached);
      try {
        const fresh = await loadMember();
        if(fresh) applyCode(fresh);
      } catch (error) {
        console.warn('Referral profile load failed:', error.message || error);
      }
      if(currentLink) prepareQrFile();
      return currentLink;
    })().finally(function(){ loadingPromise = null; });
    return loadingPromise;
  }

  function overlayElements(){
    const overlay = document.getElementById('copyOverlay');
    return {
      overlay: overlay,
      text: document.getElementById('copyText'),
      title: overlay ? overlay.querySelector('h2, h3') : null,
      ok: overlay ? overlay.querySelector('.copy-ok') : null
    };
  }

  function showResult(success, link){
    const parts = overlayElements();
    if(!parts.overlay){
      if(success) window.alert('Copied\n' + link);
      else window.prompt('Copy this referral link:', link || '');
      return;
    }
    if(parts.title) parts.title.textContent = success ? 'Copied' : 'Copy Link';
    if(parts.text) parts.text.textContent = link || 'Referral link is unavailable.';
    parts.overlay.removeAttribute('inert');
    parts.overlay.setAttribute('aria-hidden', 'false');
    parts.overlay.classList.add('show');
    document.body.classList.add('modal-open');
    setTimeout(function(){ if(parts.ok) parts.ok.focus({preventScroll:true}); }, 0);
  }

  function closeResult(){
    const parts = overlayElements();
    if(!parts.overlay) return;
    if(parts.overlay.contains(document.activeElement)) document.activeElement.blur();
    parts.overlay.classList.remove('show');
    parts.overlay.setAttribute('aria-hidden', 'true');
    parts.overlay.setAttribute('inert', '');
    document.body.classList.remove('modal-open');
    const focusTarget = lastTrigger && document.contains(lastTrigger) ? lastTrigger : null;
    if(focusTarget) setTimeout(function(){ try { focusTarget.focus({preventScroll:true}); } catch (_) {} }, 0);
  }

  function legacyCopy(text){
    if(!text) return false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0.01';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) {}
    textarea.remove();
    return !!copied;
  }

  async function copyLinkNow(link){
    if(!link) return false;
    if(navigator.clipboard && window.isSecureContext){
      try {
        await navigator.clipboard.writeText(link);
        return true;
      } catch (_) {}
    }
    return legacyCopy(link);
  }

  function shareNow(){
    if(!navigator.share || !currentLink) return Promise.reject(new Error('Native sharing unavailable'));
    if(qrFile && navigator.canShare){
      try {
        const payload = {
          title: 'TitanXGaming',
          text: 'Join me on TitanXGaming\n' + currentLink,
          url: currentLink,
          files: [qrFile]
        };
        if(navigator.canShare(payload)) return navigator.share(payload);
      } catch (_) {}
    }
    return navigator.share({
      title: 'TitanXGaming',
      text: 'Join me on TitanXGaming\n' + currentLink,
      url: currentLink
    });
  }

  function isShareButton(target){
    return target && target.closest && target.closest('.share-trigger, [data-referral-share], #shareBtn');
  }

  function isCopyButton(target){
    return target && target.closest && target.closest('.copy-trigger, [data-referral-copy], #copyLinkBtn');
  }

  function ensureButtonsClickable(root){
    (root || document).querySelectorAll('.share-trigger,.copy-trigger,[data-referral-share],[data-referral-copy]').forEach(function(button){
      button.disabled = false;
      button.removeAttribute('disabled');
      button.setAttribute('aria-disabled', 'false');
      button.style.pointerEvents = 'auto';
    });
  }

  async function handleAction(event, type, button){
    event.preventDefault();
    event.stopPropagation();
    lastTrigger = button;

    if(!getToken()){
      location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      return;
    }

    const cached = readCachedCode();
    if(cached) applyCode(cached);

    if(!currentLink){
      await preload(true);
    }
    if(!currentLink){
      showResult(false, '');
      return;
    }

    if(type === 'copy'){
      const copied = await copyLinkNow(currentLink);
      showResult(copied, currentLink);
      if(!copied) window.prompt('Copy this referral link:', currentLink);
      return;
    }

    try {
      await shareNow();
    } catch (error) {
      if(error && error.name === 'AbortError') return;
      console.warn('Native referral share failed:', error && error.message ? error.message : error);
      // Do not silently do nothing: show the valid link and allow manual copy.
      showResult(false, currentLink);
    }
  }

  document.addEventListener('click', function(event){
    const shareButton = isShareButton(event.target);
    const copyButton = isCopyButton(event.target);
    if(shareButton){ handleAction(event, 'share', shareButton); return; }
    if(copyButton){ handleAction(event, 'copy', copyButton); return; }

    const parts = overlayElements();
    if(event.target && event.target.closest && event.target.closest('.copy-ok')) closeResult();
    else if(parts.overlay && event.target === parts.overlay) closeResult();
  }, true);

  document.addEventListener('keydown', function(event){ if(event.key === 'Escape') closeResult(); });

  ensureButtonsClickable(document);
  const observer = new MutationObserver(function(records){
    records.forEach(function(record){
      record.addedNodes.forEach(function(node){
        if(node && node.nodeType === 1) ensureButtonsClickable(node);
      });
    });
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});

  const parts = overlayElements();
  if(parts.overlay) parts.overlay.setAttribute('inert', '');
  const cached = readCachedCode();
  if(cached) applyCode(cached);
  preload(false);
  window.addEventListener('pageshow', function(){ ensureButtonsClickable(document); preload(true); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) preload(true); });
})();
