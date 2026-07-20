(function(){
  'use strict';

  // Prevent duplicate listeners when this file is injected/reloaded by a live layout.
  if (window.__NAGA_REFERRAL_SHARE_V104__) return;
  window.__NAGA_REFERRAL_SHARE_V104__ = true;

  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  let currentCode = '';
  let currentLink = '';
  let qrFileCache = null;
  let refreshPromise = null;

  function token(){
    return localStorage.getItem('member_token') || sessionStorage.getItem('member_token') || '';
  }

  function storedMember(){
    const keys = ['member_info', 'member', 'user_info'];
    for (const key of keys) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '{}');
        if (value && typeof value === 'object' && Object.keys(value).length) return value;
      } catch(e){}
    }
    return {};
  }

  function codeFrom(member){
    const source = member && (member.data || member.member || member.user || member);
    return String(source && (
      source.referralCode || source.referral_code || source.referrerCode ||
      source.referrer_code || source.inviteCode || source.invite_code
    ) || '').trim();
  }

  function linkFrom(code){
    const directory = location.origin + location.pathname.replace(/[^/]*$/, '');
    return code ? directory + 'register.html?ref=' + encodeURIComponent(code) : '';
  }

  function qrUrl(link){
    return link ? 'https://quickchart.io/qr?size=420&margin=2&text=' + encodeURIComponent(link) : '';
  }

  function getCopyOverlay(){ return document.getElementById('copyOverlay'); }
  function getCopyText(){ return document.getElementById('copyText'); }

  function showCopyResult(success){
    const overlay = getCopyOverlay();
    const text = getCopyText();
    if (text) text.textContent = success ? (currentLink || '-') : 'Copy failed. Please copy this link: ' + (currentLink || '-');
    if (!overlay) return;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function hideCopyResult(){
    const overlay = getCopyOverlay();
    if (!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function update(code){
    const normalized = String(code || '').trim();
    if (normalized !== currentCode) qrFileCache = null;
    currentCode = normalized;
    currentLink = linkFrom(currentCode);

    document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(function(el){
      el.textContent = currentCode || '-';
    });
    const copyText = getCopyText();
    if (copyText) copyText.textContent = currentLink || '-';

    if (currentLink && !qrFileCache) prepareQrFile();
  }

  async function fetchMember(){
    const authToken = token();
    if (!authToken) return null;
    const response = await fetch(API_BASE + '/api/auth/member/me', {
      headers: {Authorization: 'Bearer ' + authToken},
      cache: 'no-store',
      credentials: 'same-origin'
    });
    const json = await response.json().catch(function(){ return {}; });
    if (!response.ok || json.status === 'error') throw new Error(json.message || 'Unable to load referral code');
    const member = json.data || json.member || json.user || {};
    if (member && Object.keys(member).length) localStorage.setItem('member_info', JSON.stringify(member));
    return member;
  }

  function refreshReferralData(){
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async function(){
      let code = codeFrom(storedMember()) || currentCode;
      if (code) update(code);
      if (token()) {
        try {
          const member = await fetchMember();
          code = codeFrom(member) || code;
          if (code) update(code);
        } catch(error) {
          console.warn('[Referral] API refresh failed; cached member data remains active:', error.message);
        }
      }
      return currentCode;
    })().finally(function(){ refreshPromise = null; });
    return refreshPromise;
  }

  async function prepareQrFile(){
    if (!currentLink || qrFileCache) return qrFileCache;
    const codeAtStart = currentCode;
    const linkAtStart = currentLink;
    try {
      const response = await fetch(qrUrl(linkAtStart), {mode: 'cors', cache: 'force-cache'});
      if (!response.ok) throw new Error('QR request failed');
      const blob = await response.blob();
      if (codeAtStart !== currentCode || linkAtStart !== currentLink) return null;
      qrFileCache = new File([blob], 'titanx-referral-' + codeAtStart + '.png', {type: blob.type || 'image/png'});
      return qrFileCache;
    } catch(error) {
      console.warn('[Referral] QR preload unavailable; link sharing will still work:', error.message);
      return null;
    }
  }

  // IMPORTANT: navigator.share must be called immediately inside the click gesture.
  // Do not await API or QR network requests before this call.
  function shareImmediately(){
    if (!currentLink || !navigator.share) return null;
    const data = {
      title: 'TitanXGaming',
      text: 'Join me on TitanXGaming\n' + currentLink,
      url: currentLink
    };
    if (qrFileCache && navigator.canShare) {
      try {
        if (navigator.canShare({files: [qrFileCache]})) data.files = [qrFileCache];
      } catch(e){}
    }
    return navigator.share(data);
  }

  function legacyCopy(text){
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus({preventScroll: true});
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try { copied = document.execCommand('copy') === true; } catch(e){}
    textarea.remove();
    return copied;
  }

  // Start clipboard operation synchronously while the click permission is active.
  function copyImmediately(){
    if (!currentLink) return Promise.resolve(false);
    if (navigator.clipboard && window.isSecureContext) {
      try {
        return navigator.clipboard.writeText(currentLink).then(function(){ return true; }).catch(function(){
          return legacyCopy(currentLink);
        });
      } catch(e){}
    }
    return Promise.resolve(legacyCopy(currentLink));
  }

  function redirectToLogin(){
    const page = location.pathname.split('/').pop() || 'index.html';
    location.href = 'login.html?redirect=' + encodeURIComponent(page);
  }

  function handleShareClick(event){
    event.preventDefault();
    event.stopPropagation();
    if (!token()) { redirectToLogin(); return; }

    // Cached data is prepared at page load. This keeps the browser user gesture alive.
    if (!currentLink) {
      refreshReferralData().then(function(code){
        if (!code) showCopyResult(false);
      });
      return;
    }

    if (navigator.share) {
      let shareResult;
      try { shareResult = shareImmediately(); }
      catch(error) { shareResult = Promise.reject(error); }
      if (shareResult && typeof shareResult.catch === 'function') {
        shareResult.catch(function(error){
          if (error && error.name === 'AbortError') return;
          // Do not open an obsolete custom share modal. Copy the URL as a reliable fallback.
          copyImmediately().then(showCopyResult);
        });
      }
    } else {
      copyImmediately().then(showCopyResult);
    }
    // Refresh only after share has already started; never block the user gesture.
    refreshReferralData();
  }

  function handleCopyClick(event){
    event.preventDefault();
    event.stopPropagation();
    if (!token()) { redirectToLogin(); return; }

    if (!currentLink) {
      refreshReferralData().then(function(code){
        if (!code) showCopyResult(false);
      });
      return;
    }

    copyImmediately().then(showCopyResult);
    refreshReferralData();
  }

  // Delegation survives BO layout replacement and late-rendered desktop/mobile controls.
  document.addEventListener('click', function(event){
    const shareButton = event.target.closest('.share-trigger');
    if (shareButton) { handleShareClick(event); return; }

    const copyButton = event.target.closest('.copy-trigger');
    if (copyButton) { handleCopyClick(event); return; }

    if (event.target.closest('.copy-ok')) { event.preventDefault(); hideCopyResult(); return; }
    const overlay = getCopyOverlay();
    if (overlay && event.target === overlay) hideCopyResult();
  }, true);

  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape') hideCopyResult();
  });

  // Populate from local data synchronously, then refresh API and QR in background.
  update(codeFrom(storedMember()));
  refreshReferralData();
  window.addEventListener('focus', refreshReferralData);
  window.addEventListener('pageshow', refreshReferralData);
})();
