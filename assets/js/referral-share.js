(function(){
  'use strict';

  if (window.__NAGA_REFERRAL_SHARE_V108__) return;
  window.__NAGA_REFERRAL_SHARE_V108__ = true;

  const API_BASE = ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '').replace(/\/+$/, '');
  const copyOverlay = document.getElementById('copyOverlay');
  const copyText = document.getElementById('copyText');
  const copyTitle = copyOverlay ? copyOverlay.querySelector('h2') : null;
  const copyOk = copyOverlay ? copyOverlay.querySelector('.copy-ok') : null;

  let currentCode = '';
  let currentLink = '';
  let qrFileCache = null;
  let preloadPromise = null;
  let lastTrigger = null;

  function token(){
    return localStorage.getItem('member_token') || localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  }
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
  function codeFrom(member, depth){
    if(!member || typeof member !== 'object' || (depth || 0) > 5) return '';
    const direct = firstText(
      member.referralCode, member.referral_code,
      member.referrerCode, member.referrer_code,
      member.inviteCode, member.invite_code,
      member.refCode, member.ref_code
    );
    if(direct) return direct;
    const keys = Object.keys(member);
    for(let i=0;i<keys.length;i++){
      const key = keys[i];
      if(/(referral|referrer|invite|ref).*code/i.test(key)){
        const value = member[key];
        if(value !== undefined && value !== null && String(value).trim()) return String(value).trim();
      }
    }
    for(let i=0;i<keys.length;i++){
      const value = member[keys[i]];
      if(value && typeof value === 'object'){
        const nested = codeFrom(value, (depth || 0) + 1);
        if(nested) return nested;
      }
    }
    return '';
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
  function setButtonsReady(ready){
    document.querySelectorAll('.share-trigger,.copy-trigger').forEach(function(btn){
      btn.disabled = !ready;
      btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    });
  }
  function showCopyResult(success, message){
    if(!copyOverlay) return;
    if(copyTitle) copyTitle.textContent = success ? 'Copied' : 'Copy Link';
    if(copyText) copyText.textContent = message || currentLink || 'Referral link is unavailable.';
    copyOverlay.removeAttribute('inert');
    copyOverlay.classList.add('show');
    copyOverlay.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    window.setTimeout(function(){ if(copyOk) copyOk.focus({preventScroll:true}); }, 0);
  }
  function hideCopyResult(){
    if(!copyOverlay) return;
    const active = document.activeElement;
    if(active && copyOverlay.contains(active)) active.blur();
    copyOverlay.setAttribute('inert','');
    copyOverlay.classList.remove('show');
    copyOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    const target = lastTrigger && document.contains(lastTrigger) ? lastTrigger : document.body;
    window.setTimeout(function(){
      try {
        if(target === document.body && !target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1');
        target.focus({preventScroll:true});
      } catch(e){}
    }, 0);
  }
  function update(code){
    const normalized = String(code || '').trim();
    if(!normalized) return;
    currentCode = normalized;
    currentLink = linkFrom(currentCode);
    qrFileCache = null;
    localStorage.setItem('member_referral_code', currentCode);
    localStorage.setItem('member_referral_link', currentLink);
    document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(el => { el.textContent = currentCode; });
    if(copyText) copyText.textContent = currentLink;
    setButtonsReady(true);
  }
  function cachedCode(){
    const fromMember = codeFrom(storedMember());
    const fromCache = String(localStorage.getItem('member_referral_code') || '').trim();
    const fromLink = String(localStorage.getItem('member_referral_link') || '').trim();
    let fromCachedLink = '';
    if(fromLink){
      try { fromCachedLink = new URL(fromLink, window.location.href).searchParams.get('ref') || ''; } catch(e){}
    }
    const fromDom = firstText.apply(null, Array.from(document.querySelectorAll('[data-referral-code],.share-head strong')).map(function(el){
      const value = String(el.textContent || '').trim();
      return value !== '-' ? value : '';
    }));
    return firstText(fromMember, fromCache, fromCachedLink, fromDom);
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
    if(member && typeof member === 'object'){
      const merged = Object.assign({}, storedMember(), member);
      localStorage.setItem('member_info', JSON.stringify(merged));
    }
    return member;
  }
  async function prepareQr(){
    if(!currentLink || !window.File) return null;
    try {
      const res = await fetch(qrUrl(currentLink), {mode:'cors', cache:'no-store'});
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
    })().finally(function(){ preloadPromise = null; });
    return preloadPromise;
  }

  function legacyCopy(text){
    if(!text) return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.setAttribute('aria-hidden','true');
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
    // First use the synchronous fallback while the original click activation is alive.
    if(legacyCopy(text)) return Promise.resolve(true);
    if(navigator.clipboard && window.isSecureContext){
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    return Promise.resolve(false);
  }
  function nativeShareNow(){
    if(!currentLink || !navigator.share) return Promise.reject(new Error('Native sharing unavailable'));

    const shareText = 'Join me on TitanXGaming using my referral link:\n' + currentLink;
    const basePayload = {
      title: 'TitanXGaming Referral',
      text: shareText,
      url: currentLink
    };

    // Send the QR image and referral message/link together to supported chat apps.
    // Checking the complete payload is important because some browsers support
    // file sharing but reject a files-only payload or silently drop the text.
    if(qrFileCache && navigator.canShare){
      const fullPayload = {
        title: basePayload.title,
        text: basePayload.text,
        url: basePayload.url,
        files: [qrFileCache]
      };
      try {
        if(navigator.canShare(fullPayload)) return navigator.share(fullPayload);
      } catch(e){}

      // Some mobile browsers reject the url field when files are attached.
      // Keep the URL inside text so the chat still receives both QR and link.
      const fileAndTextPayload = {
        title: basePayload.title,
        text: basePayload.text,
        files: [qrFileCache]
      };
      try {
        if(navigator.canShare(fileAndTextPayload)) return navigator.share(fileAndTextPayload);
      } catch(e){}
    }

    return navigator.share(basePayload);
  }
  function loginRedirect(){
    location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  }

  if(copyOverlay) copyOverlay.setAttribute('inert','');
  setButtonsReady(false);
  const initialCode = cachedCode();
  if(initialCode) update(initialCode);
  preload(false);

  document.addEventListener('click', function(e){
    const shareButton = e.target && e.target.closest ? e.target.closest('.share-trigger') : null;
    const copyButton = e.target && e.target.closest ? e.target.closest('.copy-trigger') : null;
    if(!shareButton && !copyButton) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    lastTrigger = shareButton || copyButton;

    if(!token()) { loginRedirect(); return; }

    const syncCode = cachedCode();
    if(syncCode) update(syncCode);
    if(!currentLink){
      showCopyResult(false, 'Referral link is still loading. Please close this message and click again.');
      preload(true);
      return;
    }

    if(copyButton){
      copyNow(currentLink).then(function(ok){
        showCopyResult(ok, currentLink);
      });
      return;
    }

    if(navigator.share){
      nativeShareNow().catch(function(err){
        if(err && err.name === 'AbortError') return;
        console.warn('Native referral sharing failed:', err && err.message);
        showCopyResult(false, currentLink);
      });
      return;
    }

    showCopyResult(false, currentLink);
  }, true);

  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.copy-ok')) hideCopyResult();
    else if(e.target === copyOverlay) hideCopyResult();
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hideCopyResult(); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) preload(true); });
  window.addEventListener('pageshow', function(){ preload(true); });
  window.addEventListener('storage', function(e){ if(e.key === 'member_info' || e.key === 'member_referral_code') preload(true); });
})();
