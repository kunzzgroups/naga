(function(){
  function getToken(){ return localStorage.getItem('member_token') || ''; }

  function isLoggedIn(){
    return !!getToken();
  }

  function formatMoney(value){
    if(value === undefined || value === null || value === '') return '-';
    var n = Number(value);
    return isNaN(n) ? '-' : 'MYR ' + n.toFixed(2);
  }

  function setAllWalletText(value){
    var text;
    if(typeof value === 'number' || (/^-?\d+(\.\d+)?$/.test(String(value || '').trim()))){
      text = formatMoney(value);
    }else{
      text = value || '-';
    }
    document.querySelectorAll('[data-main-wallet-balance]').forEach(function(el){ el.textContent = text; });
  }

  function invalidateStoredBalance(){
    try{ localStorage.removeItem('member_main_wallet_balance'); }catch(e){}
  }

  function getStoredBalance(){
    try{
      var raw = localStorage.getItem('member_main_wallet_balance');
      if(raw === null || raw === '') return null;
      var value = Number(raw);
      return isNaN(value) ? null : value;
    }catch(e){ return null; }
  }

  function rememberBalance(value){
    try{
      if(value === null || value === undefined || isNaN(Number(value))) localStorage.removeItem('member_main_wallet_balance');
      else localStorage.setItem('member_main_wallet_balance', String(Number(value)));
    }catch(e){}
  }

  var refreshTokenPromise = null;
  function refreshMemberToken(){
    var oldToken = getToken();
    if(!oldToken) return Promise.resolve({ok:false, terminal:true});
    if(refreshTokenPromise) return refreshTokenPromise;

    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    var base = String((cfg && cfg.baseUrl) || 'https://bo.titanxgaming.com').replace(/\/+$/, '');
    refreshTokenPromise = fetch(base + '/api/auth/member/refresh', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Authorization': 'Bearer ' + oldToken,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(json){ return {res:res, json:json}; });
    }).then(function(pair){
      var token = pair.json && pair.json.token;
      if(pair.res.ok && pair.json.status !== 'error' && token){
        try{
          localStorage.setItem('member_token', token);
          if(pair.json.data && typeof pair.json.data === 'object'){
            var current = {};
            try{ current = JSON.parse(localStorage.getItem('member_info') || '{}') || {}; }catch(e){}
            localStorage.setItem('member_info', JSON.stringify(Object.assign({}, current, pair.json.data)));
          }
        }catch(e){}
        refreshHeaderAuth();
        try{ document.dispatchEvent(new CustomEvent('naga:member-session-refreshed')); }catch(e){}
        return {ok:true, terminal:false};
      }
      return {ok:false, terminal:true};
    }).catch(function(){
      // Laptop wake-up can briefly have no network. Do not destroy a locally
      // remembered session just because the first request after resume failed.
      return {ok:false, terminal:false};
    }).then(function(result){
      refreshTokenPromise = null;
      return result;
    }, function(err){
      refreshTokenPromise = null;
      throw err;
    });
    return refreshTokenPromise;
  }

  function noCacheUrl(url){
    var separator = String(url).indexOf('?') >= 0 ? '&' : '?';
    return String(url) + separator + '_wallet_ts=' + Date.now();
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
        return isNaN(n) ? null : n;
      }
    }
    return null;
  }

  function walletBalanceUrl(){
    var api = window.NAGA_API || {};
    var cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
    var base = (cfg && cfg.baseUrl) || 'https://bo.titanxgaming.com';
    return api.playerMainWalletBalance || (String(base).replace(/\/+$/, '') + '/api/member/wallet/balance');
  }

  function refreshShellBalance(retried){
    if(!getToken()){
      setAllWalletText('-');
      return Promise.resolve(null);
    }
    return fetch(noCacheUrl(walletBalanceUrl()), {
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + getToken(), 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    })
    .then(function(res){ return res.json().catch(function(){ return {}; }).then(function(json){ return {res:res, json:json}; }); })
    .then(function(pair){
      var unauthorized = pair.res.status === 401 || String(pair.json && pair.json.message || '').toLowerCase() === 'unauthorized';
      if(unauthorized && !retried){
        return refreshMemberToken().then(function(refreshResult){
          if(refreshResult.ok) return refreshShellBalance(true);
          if(refreshResult.terminal){
            doShellLogout();
            return null;
          }
          return getStoredBalance();
        });
      }
      if(!pair.res.ok || pair.json.status === 'error') throw new Error(pair.json.message || 'Unable to load wallet balance');
      var balance = extractBalance(pair.json);
      if(balance !== null){
        rememberBalance(balance);
        setAllWalletText(balance);
      }
      return balance;
    })
    .catch(function(){
      // Preserve the last confirmed amount during temporary Wi-Fi/network/API
      // recovery after laptop sleep instead of replacing it with "-".
      var cached = getStoredBalance();
      if(cached !== null) setAllWalletText(cached);
      return cached;
    });
  }

  function scheduleBalanceRefresh(){
    // Paint the last API-confirmed balance immediately, then refresh silently.
    // This avoids a "-" flash while a laptop is reconnecting after sleep.
    var cached = getStoredBalance();
    if(getToken() && cached !== null) setAllWalletText(cached);
    setTimeout(function(){ refreshShellBalance(); }, 0);
    window.addEventListener('load', function(){ setTimeout(function(){ refreshShellBalance(); }, 80); });
    window.addEventListener('pageshow', function(){ refreshShellBalance(); });
    window.addEventListener('focus', function(){ refreshShellBalance(); });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) refreshShellBalance(); });
  }

  var presenceTimer = null;
  function presenceBase(){ var cfg=window.NAGA_CONFIG&&window.NAGA_CONFIG.api; return String((cfg&&cfg.baseUrl)||'https://bo.titanxgaming.com').replace(/\/+$/,''); }
  function sendPresence(path, keepalive){
    var token=getToken(); if(!token) return Promise.resolve();
    return fetch(presenceBase()+path,{method:'POST',keepalive:!!keepalive,cache:'no-store',headers:{'Authorization':'Bearer '+token,'Cache-Control':'no-store'}}).catch(function(){});
  }
  function heartbeatPresence(){ if(getToken()) sendPresence('/api/auth/member/presence/heartbeat', false); }
  function startPresence(){
    if(presenceTimer) clearInterval(presenceTimer);
    heartbeatPresence();
    presenceTimer=setInterval(heartbeatPresence,5000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden) heartbeatPresence(); });
    window.addEventListener('focus',heartbeatPresence);
  }

  function doShellLogout(){
    if(getToken()) sendPresence('/api/auth/member/presence/offline', true);
    try{ localStorage.removeItem('member_token'); }catch(e){}
    try{ localStorage.removeItem('member_info'); }catch(e){}
    try{ localStorage.removeItem('member_main_wallet_balance'); }catch(e){}
    ['token','user','member','memberInfo','auth_token','access_token','jwt','main_wallet_balance'].forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
    document.body.classList.remove('member-logged-in');
    setAllWalletText('-');
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
      // Keep the mobile sidebar open after switching language.
      // The user should close it explicitly with the close button, overlay, or Escape key.
    }, 350);
  }

  function enhanceHeader(){
    const header = document.querySelector('.top-header');
    if(!header || header.dataset.shellReady === '1') return;
    header.dataset.shellReady = '1';
    header.setAttribute('data-layout-section', 'frontend-header');

    const logoBox = header.querySelector('.logo-box');
    if(logoBox) logoBox.classList.add('mobile-style-logo');

    // Header language/translate control is intentionally removed on every page.
    header.querySelectorAll('.lang-btn, .top-lang-btn').forEach(function(el){ el.remove(); });
    const actions = document.createElement('div');
    actions.className = 'top-header-actions';

    const guest = document.createElement('div');
    guest.className = 'top-auth-actions';
    guest.innerHTML = '<a class="top-login-btn auth-image-link" href="login.html" aria-label="Login"><img class="header-auth-image header-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a><a class="top-register-btn auth-image-link" href="register.html" aria-label="Register"><img class="header-auth-image header-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>';

    const member = document.createElement('div');
    member.className = 'top-member-actions';
    member.innerHTML = '<a class="top-wallet-pill" href="deposit.html"><span data-main-wallet-balance>-</span></a><button type="button" class="top-logout-btn" data-member-logout data-i18n="logout">Logout</button>';

    actions.appendChild(guest);
    actions.appendChild(member);
    header.appendChild(actions);
    refreshHeaderAuth();
    watchHeaderAuthReplacement();
    if(window.I18N && typeof window.I18N.apply === 'function') window.I18N.apply();
  }

  function refreshHeaderAuth(){
    var logged = isLoggedIn();
    document.body.classList.toggle('member-logged-in', logged);

    // Apply visibility directly as well as through CSS. The BO layout loader can
    // replace the header after initial render, especially on iPhone Safari.
    document.querySelectorAll('.top-auth-actions').forEach(function(el){
      el.style.setProperty('display', logged ? 'none' : 'flex', 'important');
      el.setAttribute('aria-hidden', logged ? 'true' : 'false');
    });
    document.querySelectorAll('.top-member-actions').forEach(function(el){
      el.style.setProperty('display', logged ? 'flex' : 'none', 'important');
      el.setAttribute('aria-hidden', logged ? 'false' : 'true');
    });

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

  function watchHeaderAuthReplacement(){
    var header = document.querySelector('.top-header');
    if(!header || header.dataset.authWatchReady === '1') return;
    header.dataset.authWatchReady = '1';
    var queued = false;
    new MutationObserver(function(){
      if(queued) return;
      queued = true;
      requestAnimationFrame(function(){
        queued = false;
        refreshHeaderAuth();
      });
    }).observe(header, {childList:true, subtree:true});
    window.addEventListener('pageshow', refreshHeaderAuth);
    window.addEventListener('focus', refreshHeaderAuth);
    window.addEventListener('storage', function(e){
      if(!e || e.key === 'member_token' || e.key === 'member_info') refreshHeaderAuth();
    });
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
            <a href="login.html" class="mobile-login-btn auth-image-link" aria-label="Login"><img class="sidebar-auth-image sidebar-login-image" src="assets/custom/images/login.png" alt="LOGIN" decoding="async" loading="eager"></a>
            <a href="register.html" class="mobile-register-btn auth-image-link" aria-label="Register"><img class="sidebar-auth-image sidebar-register-image" src="assets/custom/images/register.png" alt="REGISTER" decoding="async" loading="eager"></a>
          </div>
          <div class="mobile-menu-member"><div class="mobile-menu-wallet"><span data-main-wallet-balance>-</span></div></div>
        </div>
        <div class="mobile-menu-list">
          <a href="index.html"><i class="fa-solid fa-house mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_home">Home</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="downline.html"><i class="fa-solid fa-users mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_downline">Downline</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="vip.html"><i class="fa-solid fa-crown mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_vip">VIP</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="bonus.html"><i class="fa-solid fa-gift mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_bonus">Bonus</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="rebate.html"><i class="fa-solid fa-coins mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_rebate">Rebate</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="spin.html"><i class="fa-solid fa-dharmachakra mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_spin">Spin</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="policies.html"><i class="fa-solid fa-shield-halved mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_compliance_policy">Compliance Policy</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <a href="chat.html"><i class="fa-solid fa-headset mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_live_chat">Live Chat</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></a>
          <button type="button" class="mobile-menu-list-logout" data-member-logout><i class="fa-solid fa-right-from-bracket mobile-menu-icon" aria-hidden="true"></i><span data-i18n="side_logout">Logout</span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i></button>
        </div>
        <div class="mobile-menu-lang" id="sideLangBtn"><span>🌐 简体中文</span><span>CN ›</span></div>
        <div class="mobile-menu-version"><span data-i18n="side_version">Version:</span> 1.1.0</div>
      </aside>`;
    document.body.appendChild(overlay);
    const panel = overlay.querySelector('.mobile-menu-panel');
    if(panel) panel.setAttribute('data-layout-section', 'frontend-sidebar');
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
      const logo = e.target.closest && e.target.closest('.site-logo, .logo-box');
      if(logo){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();
        window.location.href = 'index.html';
        return;
      }
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

  function rehydrateShell(){
    const header = document.querySelector('.top-header');
    if(header){
      header.setAttribute('data-layout-section', 'frontend-header');
      header.dataset.shellReady = '1';
    }
    const panel = document.querySelector('#mobileSideMenu .mobile-menu-panel');
    if(panel) panel.setAttribute('data-layout-section', 'frontend-sidebar');
    refreshHeaderAuth();
    updateSideLangLabel();
    var cached = getStoredBalance();
    if(getToken() && cached !== null) setAllWalletText(cached);
    // Re-applying BO header HTML keeps the last confirmed amount while the
    // current balance is refreshed in the background.
    refreshShellBalance();
    if(window.I18N && typeof window.I18N.apply === 'function') window.I18N.apply();
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
    startPresence();
    document.dispatchEvent(new CustomEvent('naga:site-shell-ready'));
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.NAGA_SITE_SHELL = { refreshHeaderAuth: refreshHeaderAuth, refreshBalance: refreshShellBalance, refreshMemberToken: refreshMemberToken, openMenu: openMenu, closeMenu: closeMenu, logout: doShellLogout, rehydrate: rehydrateShell };
})();
