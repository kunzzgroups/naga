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
  function firstValue(member, keys){
    for(const key of keys){
      const value = member && member[key];
      if(value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }
  function setText(selector, value){ const el=document.querySelector(selector); if(el) el.textContent = value == null || String(value).trim()==='' ? '-' : String(value); }
  function setBadge(member){
    const el=document.querySelector('[data-profile-vip]'); if(!el) return;
    const name=firstValue(member,['vipName','vip_name','vipLevelName','vip_level_name','vipLevel','vip_level']);
    el.textContent=name||'-';
  }
  function currentLang(){ try{return (localStorage.getItem('site_lang')||(window.I18N&&window.I18N.current)||'en').trim().toLowerCase().replace('_','-');}catch(e){return 'en';} }
  const VIP_CACHE_KEY='naga_setting_vip_badge_v1:'+location.host;
  function memberIdentity(member){
    return String(firstValue(member,['id','memberId','member_id','username','mobile','phoneNumber','phone_number'])||'').trim();
  }
  function readStoredMember(){ try{ const m=JSON.parse(localStorage.getItem('member_info')||'null'); return m&&typeof m==='object'?m:null; }catch(e){return null;} }
  function readVipCache(member){
    try{
      const c=JSON.parse(localStorage.getItem(VIP_CACHE_KEY)||'null');
      if(!c||typeof c!=='object'||!c.level) return null;
      const id=memberIdentity(member);
      if(id && c.memberIdentity && String(c.memberIdentity)!==id) return null;
      if(c.lang && String(c.lang)!==currentLang()) return null;
      return c;
    }catch(e){return null;}
  }
  function writeVipCache(member, level, experience){
    try{
      localStorage.setItem(VIP_CACHE_KEY,JSON.stringify({
        memberIdentity:memberIdentity(member),lang:currentLang(),
        level:{name:level.name||'VIP',imageUrl:level.imageUrl||'',iconClass:level.iconClass||'fa-solid fa-crown'},
        experience:Number(experience||0),savedAt:Date.now()
      }));
    }catch(e){}
  }
  function renderVipLevel(level, experience){
    const el=document.querySelector('[data-profile-vip]'); if(!el||!level) return false;
    const image=String(level.imageUrl||'').trim(); const icon=String(level.iconClass||'fa-solid fa-crown').trim();
    el.classList.add('profile-vip-badge-rich');
    el.innerHTML=(image?'<img src="'+esc(image)+'" alt="" decoding="async" loading="eager" fetchpriority="high">':'<i class="'+esc(icon)+'"></i>')+'<span>'+esc(level.name||'VIP')+'</span>';
    el.title=(level.name||'VIP')+' · '+Number(experience||0).toLocaleString()+' EXP';
    return true;
  }
  function markProfileReady(){
    window.__NAGA_PROFILE_READY__=true;
    try{ document.dispatchEvent(new CustomEvent('naga:profile-ready')); }catch(e){}
  }
  async function loadVipBadge(){
    const el=document.querySelector('[data-profile-vip]'); if(!el||!token()) return;
    try{
      const res=await fetch(API_BASE+'/api/player/vip?lang='+encodeURIComponent(currentLang())+'&_profile_vip_ts='+Date.now(),{cache:'no-store',headers:{'Authorization':'Bearer '+token(),'Cache-Control':'no-cache'}});
      const json=await res.json().catch(()=>({})); const data=json&&json.data||{}; const levels=Array.isArray(data.levels)?data.levels:[]; const idx=Math.max(0,Math.min(Number(data.currentLevelIndex||0),Math.max(0,levels.length-1))); const level=levels[idx];
      if(!level){ markProfileReady(); return; }
      renderVipLevel(level,data.experience);
      writeVipCache(readStoredMember()||{},level,data.experience);
      markProfileReady();
    }catch(e){ markProfileReady(); /* retain last confirmed profile/VIP */ }
  }
  function renderSummary(member){
    const name = firstValue(member, ['fullName','full_name','name','username']);
    const mobile = firstValue(member, ['mobile','phoneNumber','phone_number','phone']);
    const country = firstValue(member, ['countryName','country_name','country','countryCode','country_code']);
    setText('[data-profile-name]', name);
    setText('[data-profile-mobile]', mobile);
    setText('[data-profile-country]', country);
    const avatar=document.querySelector('[data-profile-avatar]');
    if(avatar) avatar.textContent = name ? String(name).trim().charAt(0).toUpperCase() : '-';
    setBadge(member);
  }
  function render(member){
    const list = document.getElementById('memberProfileList'); if(!list) return;
    const rows = [];
    rows.push(row('username', member.username, 'Username'));
    rows.push(row('name', firstValue(member, ['fullName','full_name','name']), 'Name'));
    rows.push(row('phone_number', firstValue(member, ['mobile','phoneNumber','phone_number','phone']), 'Phone Number'));
    rows.push(row('bank_name', member.bankName, 'Bank Name'));
    rows.push(row('bank_account_name', member.bankAccountName, 'Bank Account Name'));
    rows.push(row('bank_account_number', member.bankAccountNumber, 'Bank Account Number'));
    if(Number(member.showBankBsb == null ? 1 : member.showBankBsb) === 1) rows.push(row('bank_bsb', member.bankBsb, 'Bank BSB'));
    if(Number(member.showPayId == null ? 1 : member.showPayId) === 1) rows.push(row('pay_id', member.payId, 'Pay ID'));
    list.innerHTML = rows.join('');
    renderSummary(member);
  }
  async function loadProfile(){
    const url = API_BASE + '/api/auth/member/me?_profile_ts=' + Date.now();
    const res = await fetch(url, {cache:'no-store', headers:{'Authorization':'Bearer ' + token(), 'Cache-Control':'no-cache'}});
    const json = await res.json().catch(()=>({}));
    if(res.status === 401 || json.message === 'Unauthorized' || json.status === 'error') { localStorage.removeItem('member_token'); location.href='login.html?redirect=setting.html'; return; }
    const member = (json && json.data && typeof json.data === 'object') ? json.data : {};
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
    localStorage.removeItem('member_token'); localStorage.removeItem('member_info'); localStorage.removeItem('member_main_wallet_balance'); localStorage.removeItem('member_main_wallet_balance_confirmed_at');
    location.href = 'index.html';
  });
  document.addEventListener('i18n:changed', function(){
    try {
      const member = JSON.parse(localStorage.getItem('member_info') || 'null');
      if(member) render(member);
      loadVipBadge();
    } catch(e) {}
  });


  function bootstrapConfirmedProfile(){
    const member=readStoredMember();
    if(member&&Object.keys(member).length) render(member);
    const cachedVip=readVipCache(member||{});
    if(cachedVip&&renderVipLevel(cachedVip.level,cachedVip.experience)) markProfileReady();
    return !!member;
  }
  // setting.js is loaded at the end of <body>, so restore the last confirmed API
  // profile before the browser reveals the page. Never replace good cache with "-".
  bootstrapConfirmedProfile();

  document.addEventListener('DOMContentLoaded', () => {
    if(!requireLogin()) return;
    loadProfile().then(loadVipBadge).catch(e => {
      markProfileReady();
      console.warn('Setting profile unavailable:', e && e.message ? e.message : e);
    });
  });
})();
