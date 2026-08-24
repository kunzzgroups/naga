(function(){
  'use strict';

  var IDLE_LIMIT_MS = 10 * 60 * 1000;
  var ACTIVITY_WRITE_GAP_MS = 30000;
  var LAST_ACTIVITY_KEY = 'naga_member_last_activity_at';
  var LOGOUT_REASON_KEY = 'naga_member_logout_reason';
  var timer = null;
  var lastActivityAt = 0;
  var lastPersistedAt = 0;
  var loggingOut = false;

  function getToken(){
    try{return localStorage.getItem('member_token') || '';}catch(e){return '';}
  }

  function readStoredActivity(){
    try{
      var n = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      return Number.isFinite(n) && n > 0 ? n : 0;
    }catch(e){ return 0; }
  }

  function persistActivity(now){
    lastPersistedAt = now;
    try{ localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); }catch(e){}
  }

  function clearTimer(){
    if(timer !== null){ clearTimeout(timer); timer = null; }
  }

  function isAuthPage(){
    var page = String(location.pathname.split('/').pop() || '').toLowerCase();
    return page === 'login.html' || page === 'register.html' || page === 'forget-password.html' || page === 'forgot-password.html';
  }

  function clearMemberStorage(){
    [
      'member_token','member_info','member_main_wallet_balance','member_main_wallet_balance_confirmed_at',
      'token','user','member','memberInfo','auth_token','access_token','jwt','main_wallet_balance',
      'naga_active_provider_session_id','naga_active_provider_code','naga_active_provider_session_state',
      'naga_active_provider_wallet_flow','naga_last_provider_session_id'
    ].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    try{ localStorage.removeItem(LAST_ACTIVITY_KEY); }catch(e){}
  }

  function redirectToLogin(){
    if(isAuthPage()) return;
    var target = 'login.html?reason=inactive';
    try{ location.replace(target); }catch(e){ location.href = target; }
  }

  function logoutForInactivity(){
    if(loggingOut || !getToken()) return;
    loggingOut = true;
    clearTimer();
    try{ sessionStorage.setItem(LOGOUT_REASON_KEY, 'inactive'); }catch(e){}

    // Reuse the normal logout path when the site shell is present so online
    // presence and the existing UI state are cleaned up consistently.
    if(window.NAGA_SITE_SHELL && typeof window.NAGA_SITE_SHELL.logout === 'function'){
      try{ window.NAGA_SITE_SHELL.logout(); }catch(e){ clearMemberStorage(); }
    }else{
      clearMemberStorage();
      try{ document.dispatchEvent(new CustomEvent('naga:member-logout', {detail:{reason:'inactive'}})); }catch(e){}
    }
    redirectToLogin();
  }

  function currentLastActivity(){
    var stored = readStoredActivity();
    if(stored > lastActivityAt) lastActivityAt = stored;
    return lastActivityAt;
  }

  function expired(now){
    if(!getToken()) return false;
    var last = currentLastActivity();
    return !!last && (now - last >= IDLE_LIMIT_MS);
  }

  function armTimer(){
    clearTimer();
    if(!getToken()) return;
    var now = Date.now();
    var last = currentLastActivity();
    if(!last){
      lastActivityAt = now;
      persistActivity(now);
      last = now;
    }
    var remaining = IDLE_LIMIT_MS - (now - last);
    if(remaining <= 0){ logoutForInactivity(); return; }
    timer = setTimeout(function(){
      timer = null;
      if(expired(Date.now())) logoutForInactivity();
      else armTimer();
    }, remaining + 50);
  }

  function recordActivity(){
    if(!getToken()) return;
    var now = Date.now();
    // An interaction after the deadline must not revive an expired session.
    if(expired(now)){ logoutForInactivity(); return; }
    lastActivityAt = now;
    if(now - lastPersistedAt >= ACTIVITY_WRITE_GAP_MS) persistActivity(now);
    armTimer();
  }

  function checkNow(){
    if(!getToken()){ clearTimer(); return; }
    if(expired(Date.now())) logoutForInactivity();
    else armTimer();
  }

  function onStorage(e){
    if(!e) return;
    if(e.key === LAST_ACTIVITY_KEY){
      var n = Number(e.newValue || 0);
      if(Number.isFinite(n) && n > lastActivityAt){ lastActivityAt = n; armTimer(); }
      return;
    }
    if(e.key === 'member_token'){
      if(!e.newValue){ clearTimer(); return; }
      var now = Date.now();
      lastActivityAt = now;
      persistActivity(now);
      armTimer();
    }
  }

  function init(){
    if(!getToken()) return;
    var stored = readStoredActivity();
    if(stored){
      lastActivityAt = stored;
      lastPersistedAt = stored;
      if(expired(Date.now())){ logoutForInactivity(); return; }
    }else{
      // Upgrade-safe: existing logged-in users get a fresh 10-minute window the
      // first time this version is loaded instead of being unexpectedly kicked.
      lastActivityAt = Date.now();
      persistActivity(lastActivityAt);
    }
    armTimer();
  }

  // Lightweight only: one timeout and passive event listeners. Pointer movement
  // can fire frequently, so localStorage writes are throttled to once per 30 sec.
  ['pointerdown','pointermove','keydown','wheel','touchstart','scroll'].forEach(function(name){
    window.addEventListener(name, recordActivity, {passive:true});
  });
  window.addEventListener('focus', checkNow, {passive:true});
  window.addEventListener('pageshow', checkNow, {passive:true});
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) checkNow(); });
  window.addEventListener('storage', onStorage);
  document.addEventListener('naga:member-login', function(){
    var now = Date.now(); lastActivityAt = now; persistActivity(now); armTimer();
  });
  document.addEventListener('naga:member-logout', clearTimer);

  init();

  window.NAGA_MEMBER_INACTIVITY = {
    timeoutMs: IDLE_LIMIT_MS,
    touch: recordActivity,
    check: checkNow
  };
})();
