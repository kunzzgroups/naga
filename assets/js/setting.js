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


  document.addEventListener('DOMContentLoaded', () => {
    const list=document.getElementById('memberProfileList');
    if(list) list.innerHTML=row('loading', '...', 'Loading');
    if(!requireLogin()) return;
    loadProfile().catch(e => { if(list) list.innerHTML=row('error', e.message || t('load_failed', 'Load failed'), 'Error'); });
  });
})();
