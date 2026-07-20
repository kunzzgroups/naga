(function(){
  'use strict';

  if (window.__NAGA_REFERRAL_SHARE_QR_V112__) return;
  window.__NAGA_REFERRAL_SHARE_QR_V112__ = true;

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
  let qrReady = false;
  let qrPreparing = false;

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
  function setButtonStates(){
    document.querySelectorAll('.copy-trigger').forEach(function(btn){
      const ready = !!currentLink;
      btn.disabled = !ready;
      btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
    });
    document.querySelectorAll('.share-trigger').forEach(function(btn){
      const ready = !!currentLink && qrReady;
      btn.disabled = !ready;
      btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
      btn.setAttribute('data-qr-status', qrPreparing ? 'preparing' : (qrReady ? 'ready' : 'unavailable'));
      if(qrPreparing) btn.title = 'Preparing QR code…';
      else if(qrReady) btn.title = 'Share referral QR code';
      else btn.title = 'QR code is not ready yet';
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
    qrReady = false;
    localStorage.setItem('member_referral_code', currentCode);
    localStorage.setItem('member_referral_link', currentLink);
    document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(el => { el.textContent = currentCode; });
    if(copyText) copyText.textContent = currentLink;
    setButtonStates();
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
  function loadBlobImage(blob){
    return new Promise(function(resolve, reject){
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.onload = function(){ URL.revokeObjectURL(objectUrl); resolve(img); };
      img.onerror = function(){ URL.revokeObjectURL(objectUrl); reject(new Error('Unable to render QR image')); };
      img.src = objectUrl;
    });
  }
  function wrapCanvasText(ctx, text, maxWidth){
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach(function(word){
      const test = line ? line + ' ' + word : word;
      if(line && ctx.measureText(test).width > maxWidth){ lines.push(line); line = word; }
      else line = test;
    });
    if(line) lines.push(line);
    return lines;
  }
  async function createReferralShareCard(qrBlob){
    const qrImage = await loadBlobImage(qrBlob);
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 920;
    const ctx = canvas.getContext('2d');
    if(!ctx) return qrBlob;

    const gradient = ctx.createLinearGradient(0, 0, 720, 920);
    gradient.addColorStop(0, '#09111f');
    gradient.addColorStop(1, '#17243a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 720, 920);

    ctx.strokeStyle = '#ffd900';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, 684, 884);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd900';
    ctx.font = '700 42px Arial, sans-serif';
    ctx.fillText('TitanXGaming Referral', 360, 82);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 28px Arial, sans-serif';
    ctx.fillText('Referral Code: ' + currentCode, 360, 128);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(115, 168, 490, 490);
    ctx.drawImage(qrImage, 135, 188, 450, 450);

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 27px Arial, sans-serif';
    ctx.fillText('Scan this QR code to register as my downline', 360, 714);

    ctx.font = '500 22px Arial, sans-serif';
    const lines = wrapCanvasText(ctx, currentLink, 620);
    lines.slice(0, 3).forEach(function(line, index){
      ctx.fillText(line, 360, 766 + (index * 32));
    });

    ctx.fillStyle = '#ffd900';
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillText('Join me on TitanXGaming', 360, 875);

    const cardBlob = await new Promise(function(resolve){ canvas.toBlob(resolve, 'image/png', 1); });
    return cardBlob && cardBlob.size ? cardBlob : qrBlob;
  }
  async function prepareQr(){
    if(!currentLink || !window.File){
      qrReady = false;
      qrPreparing = false;
      setButtonStates();
      return null;
    }
    qrPreparing = true;
    qrReady = false;
    setButtonStates();
    const url = qrUrl(currentLink);
    let lastError = null;
    for(let attempt = 1; attempt <= 3; attempt++){
      try {
        const res = await fetch(url + '&_=' + Date.now() + '-' + attempt, {
          mode:'cors',
          cache:'no-store',
          credentials:'omit'
        });
        if(!res.ok) throw new Error('QR service returned HTTP ' + res.status);
        const blob = await res.blob();
        if(!blob || !blob.size) throw new Error('QR image is empty');
        const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], {type:'image/png'});
        const file = new File([pngBlob], 'titanx-referral-' + currentCode + '.png', {
          type:'image/png',
          lastModified:Date.now()
        });
        if(!navigator.share || !navigator.canShare || !navigator.canShare({files:[file]})){
          throw new Error('This browser does not support sharing image attachments');
        }
        qrFileCache = file;
        qrReady = true;
        qrPreparing = false;
        setButtonStates();
        return file;
      } catch(e){
        lastError = e;
        if(attempt < 3) await new Promise(function(resolve){ setTimeout(resolve, 450 * attempt); });
      }
    }
    qrFileCache = null;
    qrReady = false;
    qrPreparing = false;
    setButtonStates();
    console.warn('Referral QR attachment unavailable:', lastError && lastError.message);
    return null;
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
    if(!qrReady || !qrFileCache) return Promise.reject(new Error('QR attachment is still preparing'));

    const message = 'Join me on TitanXGaming: ' + currentLink;
    const payload = {
      title: 'TitanXGaming Referral',
      text: message,
      files: [qrFileCache]
    };

    // Check file support using files-only because iOS may reject canShare()
    // when title/text are included even though the same share payload works.
    if(!navigator.canShare || !navigator.canShare({files:[qrFileCache]})){
      return Promise.reject(new Error('This browser cannot share QR image attachments'));
    }
    return navigator.share(payload);
  }
  function loginRedirect(){
    location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
  }

  if(copyOverlay) copyOverlay.setAttribute('inert','');
  setButtonStates();
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

    if(!qrReady || !qrFileCache){
      showCopyResult(false, qrPreparing ? 'QR code is preparing. Please wait a moment, then tap Share again.' : 'QR image attachment is unavailable on this browser.');
      if(!qrPreparing) prepareQr();
      return;
    }

    if(navigator.share){
      nativeShareNow().catch(function(err){
        if(err && err.name === 'AbortError') return;
        console.warn('Native referral sharing failed:', err && err.message);
        showCopyResult(false, 'Unable to share the QR attachment: ' + ((err && err.message) || 'Unknown error'));
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
