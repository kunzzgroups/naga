(function(){
  const settingCard = document.querySelector('.setting-card');
  const settingToggle = document.getElementById('settingToggle');
  const settingLangBtn = document.getElementById('settingLangBtn');
  const langOverlay = document.getElementById('langOverlay');
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';

  function token(){ return localStorage.getItem('member_token') || ''; }
  function requireLogin(){ if(!token()){ location.href = 'login.html?redirect=setting.html'; return false; } return true; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function t(key, fallback){ return (window.I18N && typeof window.I18N.t === 'function') ? window.I18N.t(key) : (fallback || key); }
  function row(labelKey, value, fallback){ return '<div class="profile-row"><span>'+esc(t(labelKey, fallback || labelKey))+'</span><strong>'+esc(value || '-')+'</strong></div>'; }
  function setBadge(member){ const b=document.querySelector('.profile-badge'); if(b) b.textContent = member.vipName || member.vipLevel || 'VIP'; }
  function render(member){
    const list = document.getElementById('memberProfileList'); if(!list) return;
    const rows = [];
    rows.push(row('username', member.username, 'Username'));
    rows.push(row('name', member.fullName || member.name, 'Name'));
    rows.push(row('phone_number', member.mobile, 'Phone Number'));
    rows.push(row('bank_name', member.bankName, 'Bank Name'));
    rows.push(row('bank_account_name', member.bankAccountName, 'Bank Account Name'));
    rows.push(row('bank_account_number', member.bankAccountNumber, 'Bank Account Number'));
    if(Number(member.showBankBsb == null ? 1 : member.showBankBsb) === 1) rows.push(row('bank_bsb', member.bankBsb, 'Bank BSB'));
    if(Number(member.showPayId == null ? 1 : member.showPayId) === 1) rows.push(row('pay_id', member.payId, 'Pay ID'));
    list.innerHTML = rows.join('');
    setBadge(member);
  }
  async function loadProfile(){
    const res = await fetch(API_BASE + '/api/auth/member/me', {headers:{'Authorization':'Bearer ' + token()}});
    const json = await res.json().catch(()=>({}));
    if(res.status === 401 || json.message === 'Unauthorized' || json.status === 'error') { localStorage.removeItem('member_token'); location.href='login.html?redirect=setting.html'; return; }
    const member = json.data || {};
    localStorage.setItem('member_info', JSON.stringify(member));
    render(member);
  }

  if(settingCard && settingToggle){
    settingToggle.addEventListener('click', () => {
      const isOpen = settingCard.classList.toggle('open');
      settingToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
  function openSettingLangPopup(){ if(!langOverlay) return; langOverlay.classList.add('show'); langOverlay.setAttribute('aria-hidden','false'); }
  if(settingLangBtn){ settingLangBtn.addEventListener('click', openSettingLangPopup); }
  document.addEventListener('click', function(e){
    const logout = e.target.closest && e.target.closest('.setting-item.logout');
    if(!logout) return;
    e.preventDefault();
    localStorage.removeItem('member_token'); localStorage.removeItem('member_info'); localStorage.removeItem('member_main_wallet_balance');
    location.href = 'index.html';
  });
  document.addEventListener('i18n:changed', function(){
    try {
      const member = JSON.parse(localStorage.getItem('member_info') || 'null');
      if(member) render(member);
    } catch(e) {}
  });


  function initReferralShareCopy(){
    const shareOverlay = document.getElementById('shareOverlay');
    const copyOverlay = document.getElementById('copyOverlay');
    const copyText = document.getElementById('copyText');

    function storedMember(){ try{return JSON.parse(localStorage.getItem('member_info')||'{}')||{};}catch(e){return {};} }
    function codeFrom(member){ return String(member && (member.referralCode || member.referral_code || member.inviteCode) || '').trim(); }
    function linkFrom(code){ return code ? location.origin + '/register.html?ref=' + encodeURIComponent(code) : ''; }
    function update(code){
      const link=linkFrom(code);
      document.querySelectorAll('.share-head strong,[data-referral-code]').forEach(el=>{el.textContent=code||'-';});
      if(copyText) copyText.textContent=link||'-';
      document.querySelectorAll('[data-share-channel]').forEach(a=>{
        const channel=a.getAttribute('data-share-channel'); const text='Join me on TitanXGaming: '+link; let href='#';
        if(link){
          if(channel==='whatsapp') href='https://wa.me/?text='+encodeURIComponent(text);
          if(channel==='telegram') href='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent('Join me on TitanXGaming');
          if(channel==='line') href='https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(link);
          if(channel==='viber') href='viber://forward?text='+encodeURIComponent(text);
          if(channel==='messenger') href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(link);
        }
        a.href=href; if(link){a.target='_blank';a.rel='noopener';}
      });
    }
    async function freshCode(){
      const res=await fetch(API_BASE+'/api/auth/member/me',{headers:{Authorization:'Bearer '+token()},cache:'no-store'});
      const json=await res.json().catch(()=>({}));
      if(!res.ok||json.status==='error') throw new Error(json.message||'Unable to load referral code');
      const member=json.data||{}; localStorage.setItem('member_info',JSON.stringify(member)); render(member); return codeFrom(member);
    }
    async function resolveCode(){ try{const c=await freshCode();update(c);return c;}catch(e){const c=codeFrom(storedMember());update(c);return c;} }
    function show(el){if(!el)return;el.classList.add('show');el.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');}
    function hide(el){if(!el)return;el.classList.remove('show');el.setAttribute('aria-hidden','true');if(!document.querySelector('.share-overlay.show,.copy-overlay.show'))document.body.classList.remove('modal-open');}

    update(codeFrom(storedMember()));
    document.querySelectorAll('.share-trigger').forEach(btn=>btn.addEventListener('click',async e=>{
      e.preventDefault(); const code=await resolveCode(); if(!code)return; const link=linkFrom(code);
      if(navigator.share) navigator.share({title:'TitanXGaming',text:'Join me on TitanXGaming',url:link}).catch(()=>show(shareOverlay)); else show(shareOverlay);
    }));
    document.querySelectorAll('.copy-trigger').forEach(btn=>btn.addEventListener('click',async e=>{
      e.preventDefault(); const code=await resolveCode(); if(!code)return; const link=linkFrom(code);
      try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(link);else{const ta=document.createElement('textarea');ta.value=link;ta.style.position='fixed';ta.style.left='-9999px';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}}catch(err){}
      show(copyOverlay);
    }));
    document.querySelectorAll('.modal-x,.copy-ok').forEach(btn=>btn.addEventListener('click',()=>{hide(shareOverlay);hide(copyOverlay);}));
    [shareOverlay,copyOverlay].forEach(o=>{if(o)o.addEventListener('click',e=>{if(e.target===o)hide(o);});});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){hide(shareOverlay);hide(copyOverlay);}});
  }

  document.addEventListener('DOMContentLoaded', () => {
    const list=document.getElementById('memberProfileList');
    if(list) list.innerHTML=row('loading', '...', 'Loading');
    if(!requireLogin()) return;
    initReferralShareCopy();
    loadProfile().catch(e => { if(list) list.innerHTML=row('error', e.message || t('load_failed', 'Load failed'), 'Error'); });
  });
})();
