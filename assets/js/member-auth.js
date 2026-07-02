(function(){
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || 'http://localhost:8080';
  const API = window.NAGA_API || {};
  const MAIN_WALLET_BALANCE_URL = API.playerMainWalletBalance || API.playerProviderWalletBalance || (API_BASE.replace(/\/+$/, '') + '/api/player/provider/wallet-balance');

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function getToken(){
    return localStorage.getItem('member_token') || '';
  }

  function getStoredMember(){
    try{
      return JSON.parse(localStorage.getItem('member_info') || '{}') || {};
    }catch(e){
      return {};
    }
  }

  function saveMember(member){
    localStorage.setItem('member_info', JSON.stringify(member || {}));
  }

  function memberName(member){
    return (member && (member.fullName || member.full_name || member.name || member.username || member.mobile)) || 'Member';
  }

  function initials(name){
    const value = String(name || 'M').trim();
    return (value.charAt(0) || 'M').toUpperCase();
  }

  function clearMember(){
    localStorage.removeItem('member_token');
    localStorage.removeItem('member_info');
    localStorage.removeItem('member_main_wallet_balance');
    setMainWalletBalance(0);
  }

  function renderLoggedIn(member){
    const authArea = document.querySelector('[data-member-auth-area]');
    if(!authArea) return;

    const name = memberName(member);
    const sub = member && (member.username || member.mobile) ? (member.username || member.mobile) : '';

    authArea.innerHTML =
      '<div class="member-welcome-card">' +
        '<div class="member-welcome-top">' +
          '<div class="member-welcome-avatar">' + esc(initials(name)) + '</div>' +
          '<div class="member-welcome-copy">' +
            '<span class="member-welcome-label">Welcome</span>' +
            '<strong class="member-welcome-name">' + esc(name) + '</strong>' +
            (sub ? '<small class="member-welcome-sub">' + esc(sub) + '</small>' : '') +
          '</div>' +
        '</div>' +
        '<div class="member-welcome-actions">' +
          '<a href="setting.html">Profile</a>' +
          '<button type="button" data-member-logout>Logout</button>' +
        '</div>' +
      '</div>';
  }

  function renderLoggedOut(){
    const authArea = document.querySelector('[data-member-auth-area]');
    if(!authArea) return;
    authArea.innerHTML =
      '<div class="login-row">' +
        '<a href="login.html"><img src="assets/custom/images/login.gif" alt="LOGIN" class="auth-gif"></a>' +
        '<a href="register.html"><img src="assets/custom/images/register.gif" alt="REGISTER" class="auth-gif"></a>' +
      '</div>';
  }


  function formatMoney(value){
    const n = Number(value || 0);
    return 'MYR ' + (isNaN(n) ? '0.00' : n.toFixed(2));
  }

  function setMainWalletBalance(value){
    const text = formatMoney(value);
    document.querySelectorAll('[data-main-wallet-balance]').forEach(function(el){
      el.textContent = text;
    });
  }

  function extractBalance(json){
    const data = (json && json.data) || json || {};
    const candidates = [
      data.balance,
      data.mainWalletBalance,
      data.main_wallet_balance,
      data.walletBalance,
      data.wallet_balance,
      data.amount,
      data.mainWallet && data.mainWallet.balance,
      data.main_wallet && data.main_wallet.balance,
      data.wallet && data.wallet.balance
    ];
    for(let i = 0; i < candidates.length; i++){
      const value = candidates[i];
      if(value !== undefined && value !== null && value !== ''){
        const n = Number(value);
        return isNaN(n) ? 0 : n;
      }
    }
    return 0;
  }

  async function loadMainWalletBalance(){
    const token = getToken();
    if(!token){
      setMainWalletBalance(0);
      return 0;
    }

    const res = await fetch(MAIN_WALLET_BALANCE_URL, {
      headers: {'Authorization': 'Bearer ' + token}
    });
    const json = await res.json().catch(() => ({}));

    if(!res.ok || json.status === 'error'){
      throw new Error(json.message || 'Unable to load main wallet balance.');
    }

    const balance = extractBalance(json);
    setMainWalletBalance(balance);
    localStorage.setItem('member_main_wallet_balance', String(balance));
    return balance;
  }

  function renderCachedBalance(){
    const cached = localStorage.getItem('member_main_wallet_balance');
    if(cached !== null && cached !== '') setMainWalletBalance(cached);
  }

  async function loadMemberFromApi(){
    const token = getToken();
    if(!token) return null;

    const res = await fetch(API_BASE + '/api/auth/member/me', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    const json = await res.json().catch(() => ({}));

    if(!res.ok || json.status === 'error' || !json.data){
      clearMember();
      return null;
    }

    saveMember(json.data);
    return json.data;
  }

  async function initMemberPanel(){
    const authArea = document.querySelector('[data-member-auth-area]');
    if(!authArea) return;

    const token = getToken();
    if(!token){
      renderLoggedOut();
      setMainWalletBalance(0);
      return;
    }

    const stored = getStoredMember();
    if(stored && Object.keys(stored).length){
      renderLoggedIn(stored);
      renderCachedBalance();
    }

    try{
      const latest = await loadMemberFromApi();
      if(latest){
        renderLoggedIn(latest);
        try{ await loadMainWalletBalance(); }catch(balanceErr){ renderCachedBalance(); }
      }
      else renderLoggedOut();
    }catch(e){
      if(stored && Object.keys(stored).length){ renderLoggedIn(stored); renderCachedBalance(); }
      else renderLoggedOut();
    }
  }

  document.addEventListener('click', function(e){
    const btn = e.target.closest && e.target.closest('[data-member-logout]');
    if(!btn) return;
    e.preventDefault();
    clearMember();
    renderLoggedOut();
  });

  document.addEventListener('DOMContentLoaded', initMemberPanel);

  window.NAGA_MEMBER_AUTH = {
    refresh: initMemberPanel,
    logout: function(){ clearMember(); renderLoggedOut(); },
    member: getStoredMember,
    refreshBalance: loadMainWalletBalance
  };
})();