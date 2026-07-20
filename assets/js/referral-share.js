(function(){
  'use strict';

  if (window.__NAGA_REFERRAL_SHARE_V105__) return;
  window.__NAGA_REFERRAL_SHARE_V105__ = true;

  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  const copyOverlay = document.getElementById('copyOverlay');
  const copyText = document.getElementById('copyText');
  const copyTitle = copyOverlay ? copyOverlay.querySelector('h2') : null;
  let currentCode = '';
  let currentLink = '';
  let qrFileCache = null;
  let preloadPromise = null;

  function token(){ return localStorage.getItem('member_token') || ''; }
  function storedMember(){
    try { return JSON.parse(localStorage.getItem('member_info') || '{}') || {}; }
    catch(e){ return {}; }
  }
  function firstText(){
    for(let i=0;i<arguments.length;i++){
      const value = arguments[i];
      if(value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  }
  function codeFrom(member){
    if(!member || typeof member !== 'object') return '';
    return firstText(
      member.referralCode, member.referral_code,
      member.referrerCode, member.referrer_code,
      member.inviteCode, member.invite_code,
      member.data && codeFrom(member.data),
      member.member && codeFrom(member.member),
      member.profile && codeFrom(member.profile)
    );
  }
  function linkFrom(code){
    if(!code) return '';
    const url = new URL('register.html', window.location.href);
    url.searchParams.set('ref', code);
    return url.href;
  }
  function qrUrl(link){
    return link ? 'https://quickchart.io/qr?size=420&margin=2&format=png&text=' + encodeURIComponent(link) : '';
  }
  function showCopyResult(success, message){
    if(!copyOverlay) return;
    if(copyTitle) copyTitle.textContent = success ? 'Copied' : 'Copy Link';
    if(copyText) copyText.textContent = message || currentLink || '-';
    copyOverlay.classList.add('show');
    copyOverlay.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
  }
  function hideCopyResult(){
    if(!copyOverlay) return;
    copyOverlay.classList.remove('show');
    copyOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }
  function update(code){
    currentCode = String(code || '').trim();
    currentLink = linkFrom(currentCode);
    qrFileCache = null;
    if(currentCode) localStorage.setItem('member_referral_code', currentCode);
    if(currentLink) localStorage.setItem('member_referral_link', currentLink);
    document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(el => { el.textContent = currentCode || '-'; });
    if(copyText) copyText.textContent = currentLink || '-';
  }
  function cachedCode(){
    return codeFrom(storedMember()) || String(localStorage.getItem('member_referral_code') || '').trim();
  }
  async function fetchMember(){
    const accessToken = token();
    if(!accessToken) return null;
    const res = await fetch(API_BASE + '/api/auth/member/me', {
      method:'GET',
      headers:{'Authorization':'Bearer ' + accessToken, 'Accept':'application/json'},
      cache:'no-store',
      credentials:'omit'
    });
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Unable to load referral code');
    const member = json.data || json.member || json.profile || json;
    if(member && typeof member === 'object') localStorage.setItem('member_info', JSON.stringify(member));
    return member;
  }
  async function prepareQr(){
    if(!currentLink || !window.File) return null;
    try {
      const res = await fetch(qrUrl(currentLink), {mode:'cors', cache:'force-cache'});
      if(!res.ok) return null;
      const blob = await res.blob();
      if(!blob || !blob.size) return null;
      qrFileCache = new File([blob], 'titanx-referral-' + currentCode + '.png', {type:'image/png'});
      return qrFileCache;
    } catch(e){
      console.warn('Referral QR preload unavailable:', e && e.message);
      return null;
    }
  }
  function preload(force){
    if(preloadPromise && !force) return preloadPromise;
    preloadPromise = (async function(){
      let code = cachedCode();
      if(code) update(code);
      if(token()){
        try {
          const member = await fetchMember();
          code = codeFrom(member) || code;
          if(code) update(code);
        } catch(e){
          console.warn('Referral profile refresh failed:', e && e.message);
        }
      }
      if(currentLink) await prepareQr();
      return currentLink;
    })();
    return preloadPromise;
  }

  function legacyCopy(text){
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus({preventScroll:true});
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try { ok = document.execCommand('copy') === true; } catch(e){ ok = false; }
    ta.remove();
    return ok;
  }
  function copyNow(text){
    if(!text) return Promise.resolve(false);
    if(navigator.clipboard && window.isSecureContext){
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }
  async function shareNow(){
    if(!currentLink || !navigator.share) return false;
    const payload = {
      title:'TitanXGaming',
      text:'Join me on TitanXGaming\n' + currentLink,
      url:currentLink
    };
    if(qrFileCache && navigator.canShare){
      try {
        if(navigator.canShare({files:[qrFileCache]})) payload.files = [qrFileCache];
      } catch(e){}
    }
    await navigator.share(payload);
    return true;
  }
  function loginRedirect(){
    location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  }

  update(cachedCode());
  preload(false);

  document.addEventListener('pointerdown', function(e){
    if(e.target && e.target.closest && e.target.closest('.share-trigger,.copy-trigger')) preload(false);
  }, true);

  document.addEventListener('click', async function(e){
    const shareButton = e.target && e.target.closest ? e.target.closest('.share-trigger') : null;
    const copyButton = e.target && e.target.closest ? e.target.closest('.copy-trigger') : null;
    if(!shareButton && !copyButton) return;
    e.preventDefault();
    e.stopPropagation();

    if(!token()) { loginRedirect(); return; }

    // Do not wait for the network on a normal click. Waiting causes browsers to
    // revoke clipboard/share permission on live servers. Data is preloaded above.
    if(!currentLink){
      await preload(true);
      if(!currentLink){
        showCopyResult(false, 'Referral code is not available. Please refresh the page and try again.');
        return;
      }
    }

    if(copyButton){
      const ok = await copyNow(currentLink);
      if(ok) showCopyResult(true, currentLink);
      else {
        // Always expose the actual link for manual copying; never show a false success.
        showCopyResult(false, currentLink);
        try { window.prompt('Copy this referral link:', currentLink); } catch(err){}
      }
      return;
    }

    if(navigator.share){
      try {
        await shareNow();
        return;
      } catch(err){
        if(err && err.name === 'AbortError') return;
        console.warn('Native referral sharing failed:', err && err.message);
      }
    }

    const copied = await copyNow(currentLink);
    showCopyResult(copied, currentLink);
  }, true);

  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.copy-ok')) hideCopyResult();
    else if(e.target === copyOverlay) hideCopyResult();
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hideCopyResult(); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) preload(true); });
  window.addEventListener('pageshow', function(){ preload(true); });
})();
