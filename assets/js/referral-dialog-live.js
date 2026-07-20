(function () {
  'use strict';
  if (window.__NAGA_REFERRAL_DIALOG_LIVE__) return;
  window.__NAGA_REFERRAL_DIALOG_LIVE__ = true;

  var API_BASE = ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '').replace(/\/+$/, '');
  var overlay, codeEl, linkInput, qrImg, statusEl, copyBtn, closeBtn, qrDownload;
  var copyResultOverlay, copyResultLink, copyResultOk;
  var currentCode = '', currentLink = '', lastTrigger = null;

  function token() {
    return localStorage.getItem('member_token') || localStorage.getItem('access_token') || localStorage.getItem('token') || '';
  }
  function memberData() {
    try { return JSON.parse(localStorage.getItem('member_info') || '{}') || {}; } catch (_) { return {}; }
  }
  function first() {
    for (var i = 0; i < arguments.length; i++) {
      var v = arguments[i];
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    return '';
  }
  function findCode(obj, depth) {
    if (!obj || typeof obj !== 'object' || (depth || 0) > 5) return '';
    var direct = first(obj.referralCode, obj.referral_code, obj.referrerCode, obj.referrer_code, obj.inviteCode, obj.invite_code, obj.refCode, obj.ref_code);
    if (direct) return direct;
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (/(referral|referrer|invite|ref).*code/i.test(keys[i])) {
        var val = obj[keys[i]];
        if (val !== undefined && val !== null && String(val).trim()) return String(val).trim();
      }
    }
    for (var j = 0; j < keys.length; j++) {
      if (obj[keys[j]] && typeof obj[keys[j]] === 'object') {
        var nested = findCode(obj[keys[j]], (depth || 0) + 1);
        if (nested) return nested;
      }
    }
    return '';
  }
  function makeLink(code) {
    if (!code) return '';
    var u = new URL('register.html', window.location.href);
    u.searchParams.set('ref', code);
    return u.href;
  }
  function qrUrl(link) {
    return link ? 'https://quickchart.io/qr?size=420&margin=2&format=png&text=' + encodeURIComponent(link) : '';
  }
  function cachedCode() {
    var cachedLink = localStorage.getItem('member_referral_link') || '';
    var fromLink = '';
    try { fromLink = cachedLink ? (new URL(cachedLink, location.href).searchParams.get('ref') || '') : ''; } catch (_) {}
    return first(findCode(memberData()), localStorage.getItem('member_referral_code'), fromLink);
  }
  function update(code) {
    code = String(code || '').trim();
    if (!code) return false;
    currentCode = code;
    currentLink = makeLink(code);
    localStorage.setItem('member_referral_code', currentCode);
    localStorage.setItem('member_referral_link', currentLink);
    if (codeEl) codeEl.textContent = currentCode;
    if (linkInput) linkInput.value = currentLink;
    var q = qrUrl(currentLink);
    if (qrImg) qrImg.src = q;
    if (qrDownload) qrDownload.href = q;
    setSocialLinks();
    return true;
  }
  function setSocialLinks() {
    var message = 'Join me on TitanXGaming: ' + currentLink;
    var values = {
      referralShareWhatsapp: 'https://wa.me/?text=' + encodeURIComponent(message),
      referralShareTelegram: 'https://t.me/share/url?url=' + encodeURIComponent(currentLink) + '&text=' + encodeURIComponent('Join me on TitanXGaming'),
      referralShareFacebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(currentLink),
      referralShareMessenger: 'https://www.facebook.com/dialog/send?link=' + encodeURIComponent(currentLink) + '&app_id=291494419107518&redirect_uri=' + encodeURIComponent(currentLink)
    };
    Object.keys(values).forEach(function (id) { var a = document.getElementById(id); if (a) a.href = values[id]; });
  }
  function setStatus(text, ok) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.toggle('success', !!ok);
  }

  function ensureCopyResultModal() {
    if (copyResultOverlay) return;
    var wrap = document.createElement('div');
    wrap.className = 'referral-copy-result-overlay';
    wrap.id = 'referralCopyResult';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.setAttribute('inert', '');
    wrap.innerHTML = '<div class="referral-copy-result-modal" role="dialog" aria-modal="true" aria-labelledby="referralCopyResultTitle">' +
      '<div class="referral-copy-result-check">✓</div>' +
      '<h3 id="referralCopyResultTitle">Copied</h3>' +
      '<div class="referral-copy-result-link" id="referralCopyResultLink"></div>' +
      '<button type="button" class="referral-copy-result-ok">OK</button>' +
      '</div>';
    document.body.appendChild(wrap);
    copyResultOverlay = wrap;
    copyResultLink = wrap.querySelector('#referralCopyResultLink');
    copyResultOk = wrap.querySelector('.referral-copy-result-ok');
    copyResultOk.addEventListener('click', closeCopyResult);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeCopyResult(); });
  }
  function showCopyResult(link, copied) {
    ensureCopyResultModal();
    if (copyResultLink) {
      copyResultLink.textContent = copied ? link : ('Please copy this link: ' + link);
      copyResultLink.classList.toggle('failed', !copied);
    }
    var title = copyResultOverlay.querySelector('h3');
    if (title) title.textContent = copied ? 'Copied' : 'Copy Link';
    var check = copyResultOverlay.querySelector('.referral-copy-result-check');
    if (check) { check.textContent = copied ? '✓' : '!'; check.classList.toggle('failed', !copied); }
    copyResultOverlay.removeAttribute('inert');
    copyResultOverlay.setAttribute('aria-hidden', 'false');
    copyResultOverlay.classList.add('show');
    document.body.classList.add('modal-open');
    window.setTimeout(function () { try { copyResultOk.focus({preventScroll:true}); } catch (_) {} }, 0);
  }
  function closeCopyResult() {
    if (!copyResultOverlay) return;
    if (copyResultOverlay.contains(document.activeElement)) document.activeElement.blur();
    copyResultOverlay.classList.remove('show');
    copyResultOverlay.setAttribute('aria-hidden', 'true');
    copyResultOverlay.setAttribute('inert', '');
    document.body.classList.remove('modal-open');
    if (lastTrigger && document.contains(lastTrigger)) window.setTimeout(function(){ try { lastTrigger.focus({preventScroll:true}); } catch(_){} }, 0);
  }
  function copyDirect(trigger) {
    lastTrigger = trigger || document.activeElement;
    var c = cachedCode();
    if (c) update(c);
    if (!currentLink) {
      refreshMember().then(function () {
        if (currentLink) copyDirect(trigger);
        else showCopyResult('', false);
      });
      return;
    }
    if (legacyCopy(currentLink)) { showCopyResult(currentLink, true); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(currentLink).then(function(){ showCopyResult(currentLink, true); }).catch(function(){ showCopyResult(currentLink, false); });
    } else {
      showCopyResult(currentLink, false);
    }
  }

  function openDialog(trigger, copyRequested) {
    lastTrigger = trigger || document.activeElement;
    if (!overlay) return;
    ensureCopyResultModal();
    overlay.removeAttribute('inert');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');
    document.body.classList.add('modal-open');
    var c = cachedCode();
    if (c) update(c);
    if (!currentLink) setStatus('Loading your referral link...', false);
    else setStatus('', false);
    window.setTimeout(function () {
      if (copyRequested && currentLink) copyVisibleLink();
      else if (linkInput) { linkInput.focus({preventScroll:true}); linkInput.select(); }
    }, 20);
    refreshMember();
  }
  function closeDialog() {
    if (!overlay) return;
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    document.body.classList.remove('modal-open');
    if (lastTrigger && document.contains(lastTrigger)) window.setTimeout(function(){ try { lastTrigger.focus({preventScroll:true}); } catch(_){} }, 0);
  }
  function legacyCopy(text) {
    if (!text) return false;
    if (linkInput) {
      linkInput.focus({preventScroll:true});
      linkInput.select();
      linkInput.setSelectionRange(0, linkInput.value.length);
      try { if (document.execCommand('copy')) return true; } catch (_) {}
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    var ok = false; try { ok = document.execCommand('copy') === true; } catch (_) {}
    ta.remove(); return ok;
  }
  function copyVisibleLink() {
    if (!currentLink) { setStatus('Referral link is not ready yet.', false); return; }
    if (legacyCopy(currentLink)) { setStatus('Copied: ' + currentLink, true); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(currentLink).then(function(){ setStatus('Copied: ' + currentLink, true); }).catch(function(){
        if (linkInput) { linkInput.focus(); linkInput.select(); }
        setStatus('Press Ctrl+C or long-press the selected link to copy.', false);
      });
    } else {
      if (linkInput) { linkInput.focus(); linkInput.select(); }
      setStatus('Press Ctrl+C or long-press the selected link to copy.', false);
    }
  }
  function refreshMember() {
    var t = token();
    if (!t) { setStatus('Please log in to get your referral link.', false); return Promise.resolve(false); }
    return fetch(API_BASE + '/api/auth/member/me', {
      method: 'GET', headers: {'Authorization':'Bearer ' + t, 'Accept':'application/json'}, cache:'no-store', credentials:'omit'
    }).then(function(r){ return r.json().then(function(j){ return {ok:r.ok, json:j}; }); })
      .then(function(result){
        if (!result.ok || (result.json && result.json.status === 'error')) throw new Error((result.json && result.json.message) || 'Unable to load referral code');
        var member = result.json.data || result.json.member || result.json.profile || result.json;
        var code = findCode(member);
        if (!code) throw new Error('Referral code was not returned by the server');
        var merged = Object.assign({}, memberData(), member);
        localStorage.setItem('member_info', JSON.stringify(merged));
        update(code); setStatus('', false); return true;
      }).catch(function(err){
        if (!currentLink) setStatus(err.message || 'Unable to load referral link.', false);
        return false;
      });
  }
  function bindDirectButtons(root) {
    (root || document).querySelectorAll('.share-trigger,.copy-trigger').forEach(function(btn){
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.setAttribute('aria-disabled','false');
      btn.style.pointerEvents = 'auto';
      btn.onclick = function(ev){
        ev.preventDefault(); ev.stopPropagation();
        if (!token()) { location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html'); return false; }
        if (btn.classList.contains('copy-trigger')) copyDirect(btn);
        else openDialog(btn, false);
        return false;
      };
    });
  }
  function init() {
    overlay = document.getElementById('referralDialog');
    codeEl = document.getElementById('referralDialogCode');
    linkInput = document.getElementById('referralDialogLink');
    qrImg = document.getElementById('referralDialogQr');
    statusEl = document.getElementById('referralDialogStatus');
    copyBtn = document.getElementById('referralDialogCopy');
    closeBtn = overlay && overlay.querySelector('.referral-dialog-close');
    qrDownload = document.getElementById('referralQrDownload');
    if (!overlay) return;
    overlay.setAttribute('inert','');
    var c = cachedCode(); if (c) update(c);
    bindDirectButtons(document);
    if (copyBtn) copyBtn.addEventListener('click', copyVisibleLink);
    if (closeBtn) closeBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeDialog(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && overlay.classList.contains('show')) closeDialog(); });
    new MutationObserver(function(mutations){ mutations.forEach(function(m){ m.addedNodes.forEach(function(n){ if (n.nodeType === 1) bindDirectButtons(n); }); }); }).observe(document.body, {childList:true, subtree:true});
    refreshMember();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
