(function(){
  function getToken(){ return localStorage.getItem('member_token') || ''; }

  function isLoggedIn(){
    return !!getToken();
  }

  function formatMoney(value){
    var n = Number(value || 0);
    return 'MYR ' + (isNaN(n) ? '0.00' : n.toFixed(2));
  }

  function setAllWalletText(value){
    var text;
    if(typeof value === 'number' || (/^-?\d+(\.\d+)?$/.test(String(value || '').trim()))){
      text = formatMoney(value);
    }else{
      text = value || 'MYR 0.00';
    }
    document.querySelectorAll('[data-main-wallet-balance]').forEach(function(el){ el.textContent = text; });
  }

  function readCachedBalance(){
    try{
      var cached = localStorage.getItem('member_main_wallet_balance');
      if(cached !== null && cached !== ''){
        setAllWalletText(cached);
        return true;
      }
    }catch(e){}
    return false;
  }

  function extractBalance(json){
    var data = (json && json.data) || json || {};
    var candidates = [
      data.balance, data.mainWalletBalance, data.main_wallet_balance,
      data.walletBalance, data.wallet_balance, data.amount,
      data.mainWallet && data.mainWallet.balance,
      data.main_wallet && data.main_wallet.balance,
      data.wallet && data.wallet.balance
    ];
    for(var i=0;i<candidates.length;i++){
      if(candidates[i] !== undefined && candidates[i] !== null && candidates[i] !== ''){
        var n = Number(candidates[i]);
        return isNaN(n) ? 0 : n;
      }
    }
    return 0;
  }

  function walletBalanceUrl(){
    var api = window.NAGA_API || {};
    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    var base = (cfg && cfg.baseUrl) || 'https://bo.titanxgaming.com';
    return api.playerMainWalletBalance || (String(base).replace(/\/+$/, '') + '/api/member/wallet/balance');
  }

  function refreshShellBalance(){
    if(!getToken()){
      setAllWalletText('MYR 0.00');
      return Promise.resolve(0);
    }
    readCachedBalance();
    return fetch(walletBalanceUrl(), {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + getToken(), 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(json){ return {res:res, json:json}; }); })
    .then(function(pair){
      if(!pair.res.ok || pair.json.status === 'error') throw new Error(pair.json.message || 'Unable to load wallet balance');
      var balance = extractBalance(pair.json);
      try{ localStorage.setItem('member_main_wallet_balance', String(balance)); }catch(e){}
      setAllWalletText(balance);
      return balance;
    })
    .catch(function(){ readCachedBalance(); return 0; });
  }

  function scheduleBalanceRefresh(){
    readCachedBalance();
    setTimeout(refreshShellBalance, 80);
    window.addEventListener('load', function(){ setTimeout(refreshShellBalance, 150); });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshShellBalance(); });
  }

  function doShellLogout(){
    try{ localStorage.removeItem('member_token'); }catch(e){}
    try{ localStorage.removeItem('member_info'); }catch(e){}
    try{ localStorage.removeItem('member_main_wallet_balance'); }catch(e){}
    ['token','user','member','memberInfo','auth_token','access_token','jwt','main_wallet_balance'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
    document.body.classList.remove('member-logged-in');
    setAllWalletText('MYR 0.00');
    refreshHeaderAuth();
    try{ document.dispatchEvent(new CustomEvent('naga:member-logout')); }catch(e){}
    closeMenu();
    if(window.NAGA_MEMBER_AUTH && typeof window.NAGA_MEMBER_AUTH.refresh === 'function'){
      try{ window.NAGA_MEMBER_AUTH.refresh(); }catch(e){}
    }
  }

  function tr(key, fallback){
    try{
      if(window.I18N && typeof window.I18N.t === 'function'){
        var value = window.I18N.t(key);
        if(value && value !== key) return value;
      }
    }catch(e){}
    return fallback || key;
  }

  function getCurrentLang(){
    return (window.I18N && window.I18N.current) || localStorage.getItem('site_lang') || localStorage.getItem('lang') || document.documentElement.lang || 'en';
  }

  function isCurrentZh(){
    return String(getCurrentLang()).toLowerCase().startsWith('zh') || String(getCurrentLang()).toLowerCase().startsWith('cn');
  }

  function nextLangLabel(){
    return isCurrentZh()
      ? { text: tr('side_language_english', 'English'), suffix: 'EN ›' }
      : { text: tr('side_language_chinese', '简体中文'), suffix: 'CN ›' };
  }

  function updateSideLangLabel(){
    const btn = document.getElementById('sideLangBtn');
    if(!btn) return;
    const next = nextLangLabel();
    btn.innerHTML = '<span>🌐 ' + next.text + '</span><span>' + next.suffix + '</span>';
  }


  function flashSideLangChanged(lang){
    const btn = document.getElementById('sideLangBtn');
    if(!btn) return;
    const label = String(lang || getCurrentLang()).toLowerCase().startsWith('zh') ? tr('language_changed_zh','已切换：中文') : tr('language_changed_en','Changed: English');
    btn.classList.add('changed');
    btn.innerHTML = '<span>✅ ' + label + '</span><span>✓</span>';
    clearTimeout(btn._nagaLangTimer);
    btn._nagaLangTimer = setTimeout(function(){
      btn.classList.remove('changed');
      updateSideLangLabel();
      closeMenu();
    }, 350);
  }

  function enhanceHeader(){
    const header = document.querySelector('.top-header');
    if(!header || header.dataset.shellReady === '1') return;
    header.dataset.shellReady = '1';

    const logoBox = header.querySelector('.logo-box');
    if(logoBox) logoBox.classList.add('mobile-style-logo');

    const oldLang = header.querySelector('.lang-btn');
    const actions = document.createElement('div');
    actions.className = 'top-header-actions';

    const guest = document.createElement('div');
    guest.className = 'top-auth-actions';
    guest.innerHTML = '<a class="top-login-btn" href="login.html" data-i18n="login">LOGIN</a><a class="top-register-btn" href="register.html"><span data-i18n="register">REGISTER</span> <span class="gift-dot">🎁</span></a>';

    const member = document.createElement('div');
    member.className = 'top-member-actions';
    member.innerHTML = '<a class="top-wallet-pill" href="deposit.html"><span data-main-wallet-balance>MYR 0.00</span></a><button type="button" class="top-logout-btn" data-member-logout data-i18n="logout">Logout</button>';

    actions.appendChild(guest);
    actions.appendChild(member);
    if(oldLang){
      oldLang.classList.add('top-lang-btn');
      actions.appendChild(oldLang);
    }else{
      const lang = document.createElement('button');
      lang.className = 'lang-btn top-lang-btn';
      lang.id = 'langBtn';
      lang.type = 'button';
      lang.innerHTML = '<img src="assets/images/translate-language.png" alt="Change language">';
      actions.appendChild(lang);
    }
    header.appendChild(actions);
    refreshHeaderAuth();
    if(window.I18N && typeof window.I18N.apply === 'function') window.I18N.apply();
  }

  function refreshHeaderAuth(){
    var logged = isLoggedIn();
    document.body.classList.toggle('member-logged-in', logged);

    document.querySelectorAll('.mobile-menu-member').forEach(function(el){
      el.style.display = logged ? 'flex' : 'none';
    });
    document.querySelectorAll('.mobile-menu-list-logout').forEach(function(el){
      el.style.display = logged ? 'flex' : 'none';
    });
    document.querySelectorAll('.mobile-menu-auth').forEach(function(el){
      el.style.display = logged ? 'none' : '';
    });
    if(!logged){
      document.querySelectorAll('#mobileSideMenu [data-main-wallet-balance]').forEach(function(el){
        el.textContent = '';
      });
    }
  }

  function createSideMenu(){
    if(document.getElementById('mobileSideMenu')) return;
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    overlay.id = 'mobileSideMenu';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML = `
      <div class="mobile-menu-backdrop" data-menu-close></div>
      <aside class="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="mobile-menu-head">
          <div class="mobile-avatar"><i class="fa-solid fa-user"></i></div>
          <div class="mobile-menu-auth">
            <a href="login.html" class="mobile-login-btn" data-i18n="login">LOGIN</a>
            <a href="register.html" class="mobile-register-btn"><span data-i18n="register">REGISTER</span> <span>🎁</span></a>
          </div>
          <div class="mobile-menu-member"><div class="mobile-menu-wallet"><span data-main-wallet-balance>MYR 0.00</span></div></div>
        </div>
        <div class="mobile-menu-list">
          <a href="index.html"><img src="assets/custom/images/home.png" alt=""><span data-i18n="side_home">Home</span> <b>›</b></a>
          <a href="downline.html"><img src="assets/custom/images/downline.png" alt=""><span data-i18n="side_downline">Downline</span> <b>›</b></a>
          <a href="setting.html"><span class="menu-emoji">👑</span><span data-i18n="side_vip">VIP</span> <b>›</b></a>
          <a href="bonus.html"><img src="assets/custom/images/bonus.png" alt=""><span data-i18n="side_bonus">Bonus</span> <b>›</b></a>
          <a href="#"><span class="menu-emoji">🎡</span><span data-i18n="side_spin">Spin</span> <b>›</b></a>
          <a href="#"><span class="menu-emoji">🛡️</span><span data-i18n="side_compliance_policy">Compliance Policy</span> <b>›</b></a>
          <a href="chat.html"><img src="assets/custom/images/livechat.png" alt=""><span data-i18n="side_live_chat">Live Chat</span> <b>›</b></a>
          <button type="button" class="mobile-menu-list-logout" data-member-logout><span class="menu-emoji">🚪</span><span data-i18n="side_logout">Logout</span> <b>›</b></button>
        </div>
        <div class="mobile-menu-lang" id="sideLangBtn"><span>🌐 简体中文</span><span>CN ›</span></div>
        <div class="mobile-menu-version"><span data-i18n="side_version">Version:</span> 1.1.0</div>
      </aside>`;
    document.body.appendChild(overlay);
    updateSideLangLabel();
    if(window.I18N && typeof window.I18N.apply === 'function') window.I18N.apply();
  }

  function openMenu(){
    createSideMenu();
    const overlay = document.getElementById('mobileSideMenu');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('mobile-menu-open');
  }

  function closeMenu(){
    const overlay = document.getElementById('mobileSideMenu');
    if(!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('mobile-menu-open');
  }

  function bindMenu(){
    document.addEventListener('click', function(e){
      const logoutBtn = e.target.closest && e.target.closest('[data-member-logout]');
      if(logoutBtn){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        doShellLogout();
        window.location.href = 'index.html';
        return;
      }
      const homeLink = e.target.closest && e.target.closest('.bottom-nav a:first-child');
      if(homeLink){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        openMenu();
        return;
      }
      if(e.target.closest && e.target.closest('[data-menu-close]')) closeMenu();
      if(e.target.closest && e.target.closest('#sideLangBtn')){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        const targetLang = isCurrentZh() ? 'en' : 'zh';
        const sideBtn = document.getElementById('sideLangBtn');
        if(sideBtn){ sideBtn.classList.add('switching'); }
        if(window.I18N && typeof window.I18N.setLanguage === 'function'){
          window.I18N.setLanguage(targetLang).then(function(){
            if(sideBtn){ sideBtn.classList.remove('switching'); }
            const overlay = document.getElementById('langOverlay');
            if(overlay){ overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); }
            flashSideLangChanged(targetLang);
          });
        }else{
          localStorage.setItem('site_lang', targetLang);
          localStorage.setItem('lang', targetLang);
          document.documentElement.lang = targetLang === 'zh' ? 'zh-CN' : 'en';
          if(sideBtn){ sideBtn.classList.remove('switching'); }
          flashSideLangChanged(targetLang);
        }
        return;
      }
    }, true);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeMenu(); });
    document.addEventListener('i18n:changed', updateSideLangLabel);
  }

  function init(){
    enhanceHeader();
    createSideMenu();
    bindMenu();
    window.addEventListener('storage', refreshHeaderAuth);
    document.addEventListener('click', function(e){
      if(e.target.closest && e.target.closest('[data-member-logout]')) setTimeout(refreshHeaderAuth, 80);
    });
    refreshHeaderAuth();
    scheduleBalanceRefresh();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.NAGA_SITE_SHELL = { refreshHeaderAuth: refreshHeaderAuth, refreshBalance: refreshShellBalance, openMenu: openMenu, closeMenu: closeMenu, logout: doShellLogout };
})();
