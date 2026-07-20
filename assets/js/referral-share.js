(function(){
  'use strict';

  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  const copyOverlay = document.getElementById('copyOverlay');
  const copyText = document.getElementById('copyText');
  let currentCode = '';
  let currentLink = '';
  let qrBlobCache = null;

  function token(){ return localStorage.getItem('member_token') || ''; }
  function storedMember(){
    try { return JSON.parse(localStorage.getItem('member_info') || '{}') || {}; }
    catch(e){ return {}; }
  }
  function codeFrom(member){
    return String(member && (
      member.referralCode || member.referral_code || member.referrerCode ||
      member.referrer_code || member.inviteCode || member.invite_code
    ) || '').trim();
  }
  function linkFrom(code){
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    return code ? base + 'register.html?ref=' + encodeURIComponent(code) : '';
  }
  function qrUrl(link){
    return link ? 'https://quickchart.io/qr?size=420&margin=2&text=' + encodeURIComponent(link) : '';
  }
  function show(el){
    if(!el) return;
    el.classList.add('show');
    el.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
  }
  function hide(el){
    if(!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden','true');
    if(!document.querySelector('.share-overlay.show,.copy-overlay.show')) document.body.classList.remove('modal-open');
  }
  function update(code){
    currentCode = code || '';
    currentLink = linkFrom(currentCode);
    qrBlobCache = null;
    document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(el => { el.textContent = currentCode || '-'; });
    if(copyText) copyText.textContent = currentLink || '-';
    document.querySelectorAll('[data-share-channel]').forEach(a => {
      const channel = a.getAttribute('data-share-channel');
      const text = 'Join me on TitanXGaming: ' + currentLink;
      let href = '#';
      if(currentLink){
        if(channel === 'whatsapp') href = 'https://wa.me/?text=' + encodeURIComponent(text);
        if(channel === 'telegram') href = 'https://t.me/share/url?url=' + encodeURIComponent(currentLink) + '&text=' + encodeURIComponent('Join me on TitanXGaming');
        if(channel === 'line') href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(currentLink);
        if(channel === 'viber') href = 'viber://forward?text=' + encodeURIComponent(text);
        if(channel === 'messenger') href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(currentLink);
      }
      a.href = href;
      if(currentLink){ a.target = '_blank'; a.rel = 'noopener'; }
      else { a.removeAttribute('target'); a.removeAttribute('rel'); }
    });
  }
  async function fetchMember(){
    if(!token()) return null;
    const res = await fetch(API_BASE + '/api/auth/member/me', {
      headers:{Authorization:'Bearer ' + token()}, cache:'no-store'
    });
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Unable to load referral code');
    const member = json.data || json.member || {};
    if(Object.keys(member).length) localStorage.setItem('member_info', JSON.stringify(member));
    return member;
  }
  async function resolveCode(){
    let code = codeFrom(storedMember());
    if(token()){
      try {
        const member = await fetchMember();
        code = codeFrom(member) || code;
      } catch(e) {
        console.warn('Using stored referral details:', e.message);
      }
    }
    update(code);
    return code;
  }
  async function getQrFile(){
    if(!currentLink) return null;
    if(qrBlobCache) return new File([qrBlobCache], 'titanx-referral-' + currentCode + '.png', {type:'image/png'});
    try {
      const res = await fetch(qrUrl(currentLink), {mode:'cors', cache:'no-store'});
      if(!res.ok) throw new Error('QR download failed');
      qrBlobCache = await res.blob();
      return new File([qrBlobCache], 'titanx-referral-' + currentCode + '.png', {type:qrBlobCache.type || 'image/png'});
    } catch(e) {
      console.warn('QR image attachment is unavailable:', e.message);
      return null;
    }
  }
  async function nativeShare(){
    const baseData = {title:'TitanXGaming', text:'Join me on TitanXGaming\n' + currentLink, url:currentLink};
    const qrFile = await getQrFile();
    if(qrFile && navigator.canShare && navigator.canShare({files:[qrFile]})){
      try {
        await navigator.share({...baseData, files:[qrFile]});
        return;
      } catch(err){
        if(err && err.name === 'AbortError') throw err;
        console.warn('Sharing with QR attachment failed; retrying link-only share:', err && err.message);
      }
    }
    await navigator.share(baseData);
  }

  async function copyReferralLink(){
    if(!currentLink) return false;
    try {
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(currentLink);
      else {
        const ta = document.createElement('textarea');
        ta.value = currentLink;
        ta.setAttribute('readonly','');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      return true;
    } catch(e){
      return false;
    }
  }

  update(codeFrom(storedMember()));

  document.querySelectorAll('.share-trigger').forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault();
    const code = await resolveCode();
    if(!token()){
      location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      return;
    }
    if(!code) return;
    if(navigator.share){
      try { await nativeShare(); }
      catch(err){
        if(err && err.name !== 'AbortError'){
          await copyReferralLink();
          show(copyOverlay);
        }
      }
    } else {
      await copyReferralLink();
      show(copyOverlay);
    }
  }));

  document.querySelectorAll('.copy-trigger').forEach(btn => btn.addEventListener('click', async e => {
    e.preventDefault();
    const code = await resolveCode();
    if(!token()){
      location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      return;
    }
    if(!code) return;
    await copyReferralLink();
    show(copyOverlay);
  }));

  document.querySelectorAll('.copy-ok').forEach(btn => btn.addEventListener('click', () => hide(copyOverlay)));
  if(copyOverlay) copyOverlay.addEventListener('click', e => { if(e.target === copyOverlay) hide(copyOverlay); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') hide(copyOverlay); });
})();
