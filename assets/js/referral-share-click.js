(function(){
  'use strict';

  if (window.__NAGA_REFERRAL_SHARE_QR_V114__) return;
  window.__NAGA_REFERRAL_SHARE_QR_V114__ = true;

  const API_BASE = ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '').replace(/\/+$/, '');
  const copyOverlay = document.getElementById('copyOverlay');
  const copyText = document.getElementById('copyText');
  const copyTitle = copyOverlay ? copyOverlay.querySelector('h2') : null;
  const copyOk = copyOverlay ? copyOverlay.querySelector('.copy-ok') : null;

  let currentCode = '';
  let currentLink = '';
  let qrFileCache = null;
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

  function setButtonsEnabled(){
    document.querySelectorAll('.share-trigger,.copy-trigger').forEach(function(btn){
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.setAttribute('aria-disabled','false');
      btn.style.pointerEvents = 'auto';
    });
  }

  function update(code){
    const normalized = String(code || '').trim();
    if(!normalized) return;
    currentCode = normalized;
    currentLink = linkFrom(currentCode);
    qrFileCache = null;
    localStorage.setItem('member_referral_code', currentCode);
    localStorage.setItem('member_referral_link', currentLink);
    document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(function(el){ el.textContent = currentCode; });
    if(copyText) copyText.textContent = currentLink;
    setButtonsEnabled();
    // Generate locally and synchronously ahead of time whenever possible.
    try { qrFileCache = generateQrFileSync(currentLink, currentCode); } catch(e) { qrFileCache = null; }
  }

  function generateQrFileSync(link, code){
    if(!link || !window.File || !window.NagaQRCode || typeof window.NagaQRCode.create !== 'function'){
      throw new Error('Local QR generator is unavailable');
    }

    const qr = window.NagaQRCode.create(link, {errorCorrectionLevel:'M'});
    const modules = qr.modules;
    const count = modules.size;
    const margin = 4;
    const scale = 8;
    const size = (count + margin * 2) * scale;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', {alpha:false});
    if(!ctx) throw new Error('Canvas is unavailable');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    for(let row=0; row<count; row++){
      for(let col=0; col<count; col++){
        if(modules.get(row, col)){
          ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for(let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], 'titanx-referral-' + code + '.png', {
      type:'image/png',
      lastModified:Date.now()
    });
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
    const json = await res.json().catch(function(){ return {}; });
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Unable to load referral code');
    const member = json.data || json.member || json.profile || json;
    if(member && typeof member === 'object'){
      const merged = Object.assign({}, storedMember(), member);
      localStorage.setItem('member_info', JSON.stringify(merged));
    }
    return member;
  }

  async function refreshMember(){
    let code = cachedCode();
    if(code) update(code);
    if(!token()) return;
    try {
      const member = await fetchMember();
      code = codeFrom(member) || code;
      if(code) update(code);
    } catch(e){
      console.warn('Referral profile refresh failed:', e && e.message);
    }
  }

  function legacyCopy(text){
    if(!text) return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'fixed';
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
    if(legacyCopy(text)) return Promise.resolve(true);
    if(navigator.clipboard && window.isSecureContext){
      return navigator.clipboard.writeText(text).then(function(){ return true; }).catch(function(){ return false; });
    }
    return Promise.resolve(false);
  }

  function shareNow(){
    if(!currentLink || !navigator.share) throw new Error('Native sharing is unavailable');

    // Generate the QR File synchronously inside this exact click event.
    // No network request, no background preparation and no waiting state.
    const qrFile = generateQrFileSync(currentLink, currentCode);
    qrFileCache = qrFile;

    const message = 'Join me on TitanXGaming: ' + currentLink;
    return navigator.share({
      title:'TitanXGaming Referral',
      text:message,
      files:[qrFile]
    });
  }

  function loginRedirect(){
    location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  }

  if(copyOverlay) copyOverlay.setAttribute('inert','');
  setButtonsEnabled();
  const initialCode = cachedCode();
  if(initialCode) update(initialCode);
  refreshMember();

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
      showCopyResult(false, 'Referral link is unavailable. Please refresh the page and try again.');
      refreshMember();
      return;
    }

    if(copyButton){
      copyNow(currentLink).then(function(ok){ showCopyResult(ok, currentLink); });
      return;
    }

    try {
      const result = shareNow();
      if(result && typeof result.catch === 'function'){
        result.catch(function(err){
          if(err && err.name === 'AbortError') return;
          console.warn('Referral sharing failed:', err && err.message);
          showCopyResult(false, 'Unable to share the QR attachment: ' + ((err && err.message) || 'Unknown error'));
        });
      }
    } catch(err){
      console.warn('Referral sharing failed:', err && err.message);
      showCopyResult(false, 'Unable to share the QR attachment: ' + ((err && err.message) || 'Unknown error'));
    }
  }, true);

  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('.copy-ok')) hideCopyResult();
    else if(e.target === copyOverlay) hideCopyResult();
  });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') hideCopyResult(); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshMember(); });
  window.addEventListener('pageshow', refreshMember);
  window.addEventListener('storage', function(e){
    if(e.key === 'member_info' || e.key === 'member_referral_code') refreshMember();
  });
})();
