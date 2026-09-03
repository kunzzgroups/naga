(function () {
  'use strict';

  var root = document.documentElement;
  var startTime = Date.now();
  var MIN_SHOW_MS = 40;
  var isHomeLobby = /(?:^|\/)index\.html$/i.test(location.pathname) || /\/$/.test(location.pathname);
  var isLoginPage = /(?:^|\/)login\.html$/i.test(location.pathname);
  var isRegisterPage = /(?:^|\/)register\.html$/i.test(location.pathname);
  var isAuthPage = isLoginPage || isRegisterPage;
  var isSettingPage = /(?:^|\/)setting\.html$/i.test(location.pathname);
  var isVipPage = /(?:^|\/)vip\.html$/i.test(location.pathname);
  var isBonusPage = /(?:^|\/)bonus\.html$/i.test(location.pathname);
  var expectedAuthSection = isRegisterPage ? 'register-page' : 'login-page';
  // These are normal targets only. The independent head watchdog is the absolute safety net.
  var MAX_WAIT_MS = isHomeLobby ? 3000 : (isAuthPage ? 2200 : 1100);
  var domReady = document.readyState !== 'loading';
  var customAssetsReady = false;
  var lobbyReady = !isHomeLobby;
  var criticalLayoutReady = !isHomeLobby || !!window.__NAGA_CRITICAL_LAYOUT_READY__;
  var authLayoutReady = !isAuthPage;
  var authLanguageReady = !isAuthPage || !!(window.I18N && window.I18N.ready);
  var marqueeReady = !!window.__NAGA_MARQUEE_READY__;
  var socialReady = !isHomeLobby || !!window.__NAGA_SOCIAL_LINKS_READY__;
  var profileReady = !isSettingPage || !!window.__NAGA_PROFILE_READY__;
  var vipReady = !isVipPage || !!window.__NAGA_VIP_READY__;
  var bonusReady = !isBonusPage || !!window.__NAGA_BONUS_READY__;
  if(!vipReady){
    try{
      var vipIdentity='';
      var member=JSON.parse(localStorage.getItem('member_info')||'null')||{};
      vipIdentity=String(member.id||member.memberId||member.member_id||member.username||member.mobile||member.phoneNumber||member.phone_number||'').trim();
      var vipLang=(localStorage.getItem('site_lang')||(window.I18N&&window.I18N.current)||'en').trim().toLowerCase().replace('_','-');
      var vipKey='naga_vip_page_state_v2:'+String(location.hostname||'default').toLowerCase()+':'+vipLang+':'+vipIdentity;
      var vipCached=vipIdentity?JSON.parse(localStorage.getItem(vipKey)||'null'):null;
      vipReady=!!(vipCached&&vipCached.data&&Array.isArray(vipCached.data.levels));
    }catch(_){}
  }
  var hasWalletField = !!document.querySelector('[data-main-wallet-balance]');
  var loggedInForWallet = false;
  try { loggedInForWallet = !!localStorage.getItem('member_token'); } catch (_) {}
  var walletReady = !hasWalletField || !loggedInForWallet || !!window.__NAGA_WALLET_READY__;
  if(!walletReady){
    try{
      var cachedWallet = localStorage.getItem('member_main_wallet_balance');
      var cachedWalletNum = cachedWallet === null || cachedWallet === '' ? NaN : Number(cachedWallet);
      var confirmedWalletAt = Number(localStorage.getItem('member_main_wallet_balance_confirmed_at') || 0);
      walletReady = Number.isFinite(cachedWalletNum) && (confirmedWalletAt > 0 || cachedWalletNum !== 0);
    }catch(_){}
  }
  var hasHeader = !!document.querySelector('.top-header');
  var headerReady = !hasHeader || !!window.__NAGA_HEADER_READY__ || root.classList.contains('naga-header-ready');
  try { marqueeReady = marqueeReady || !!localStorage.getItem('naga_marquee_state_v1'); } catch (_) {}
  var revealed = root.classList.contains('page-loaded') && !root.classList.contains('page-loading');
  var maxTimer = null;

  function clearSafetyTimers() {
    if (maxTimer) { clearTimeout(maxTimer); maxTimer = null; }
    if (window.__NAGA_REVEAL_TIMER__) {
      clearTimeout(window.__NAGA_REVEAL_TIMER__);
      window.__NAGA_REVEAL_TIMER__ = null;
    }
  }

  function performReveal() {
    if (revealed) return;
    revealed = true;
    clearSafetyTimers();
    root.classList.remove('page-loading', 'page-leaving');
    root.classList.add('page-loaded');
    try { document.dispatchEvent(new CustomEvent('naga:page-visible')); } catch (_) {}
  }

  // Replace the early watchdog callback with the normal reveal routine once this file is available.
  window.__NAGA_FORCE_REVEAL__ = performReveal;

  function revealPage(force) {
    if (revealed) return;
    var elapsed = Date.now() - startTime;
    var delay = force ? 0 : Math.max(0, MIN_SHOW_MS - elapsed);
    if (!delay) { performReveal(); return; }
    setTimeout(performReveal, delay);
  }

  function tryReveal() {
    // Animation is intentionally not part of this gate.
    if (domReady && customAssetsReady && lobbyReady && criticalLayoutReady && authLayoutReady && authLanguageReady && marqueeReady && socialReady && headerReady && profileReady && vipReady && bonusReady && walletReady) revealPage(false);
  }

  function onDomReady() { domReady = true; tryReveal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDomReady, { once: true });
  else onDomReady();

  document.addEventListener('naga:custom-assets-ready', function () { customAssetsReady = true; tryReveal(); }, { once: true });
  document.addEventListener('naga:lobby-ready', function () { lobbyReady = true; tryReveal(); }, { once: true });
  document.addEventListener('naga:critical-layout-ready', function () { criticalLayoutReady = true; tryReveal(); }, { once: true });
  document.addEventListener('naga:auth-layout-ready', function (event) {
    var key = event && event.detail && event.detail.sectionKey;
    if (!isAuthPage || key === expectedAuthSection) { authLayoutReady = true; tryReveal(); }
  });
  document.addEventListener('naga:i18n-ready', function () {
    authLanguageReady = true;
    tryReveal();
  }, { once: true });
  document.addEventListener('naga:marquee-ready', function () {
    marqueeReady = true;
    tryReveal();
  }, { once: true });
  document.addEventListener('naga:social-links-ready', function () {
    socialReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:header-ready', function () {
    headerReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:profile-ready', function () {
    profileReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:vip-ready', function () {
    vipReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:bonus-ready', function () {
    bonusReady = true;
    tryReveal();
  }, { once: true });

  document.addEventListener('naga:wallet-ready', function () {
    walletReady = true;
    tryReveal();
  }, { once: true });


  if (!walletReady) {
    // Never reveal a known-wrong 0.00 balance. Give the real wallet endpoint a short
    // head start; if unavailable, reveal with an empty value rather than fake data.
    setTimeout(function () { walletReady = true; tryReveal(); }, 500);
  }

  if (!profileReady) {
    // First visit may not have a cached VIP snapshot yet. Give the member/VIP API
    // a short head start so Setting never reveals a "-" badge and then swaps it.
    setTimeout(function () { profileReady = true; tryReveal(); }, 550);
  }

  if (!vipReady) {
    // VIP must never reveal the old hardcoded Bronze/demo state. On a first visit,
    // give the real VIP endpoint a short head start, then reveal clean/empty if slow.
    setTimeout(function () { vipReady = true; tryReveal(); }, 700);
  }

  if (!bonusReady) {
    // Bonus content is BO-driven. On first visit give the real promotion response a
    // short head start so cards do not pop into an already-visible background.
    // A confirmed empty response is also a valid ready state.
    setTimeout(function () { bonusReady = true; tryReveal(); }, 700);
  }

  if (!headerReady) {
    // Same UX rule on every page: never reveal an empty/default header and then pop
    // the BO logo in afterwards. Keep a short cap so a bad image cannot hurt speed.
    setTimeout(function () { headerReady = true; tryReveal(); }, 550);
  }

  if (!socialReady) {
    // Match the marquee strategy: on a brand-new browser, wait only briefly for
    // BO social data so Facebook/Telegram do not pop into an already-visible page.
    setTimeout(function () { socialReady = true; tryReveal(); }, 450);
  }

  /* On a brand-new browser with no marquee cache, give the shared BO settings
     request a tiny head start so the first visible frame has its final height.
     Never let this add noticeable loading time if the API is slow. */
  if (!marqueeReady) {
    setTimeout(function () { marqueeReady = true; tryReveal(); }, 350);
  }

  maxTimer = setTimeout(function () { revealPage(true); }, MAX_WAIT_MS);

  // If the page is restored from BFCache or a refresh/navigation edge case occurs, never keep the overlay.
  window.addEventListener('pageshow', function () {
    root.classList.remove('page-leaving');
    if (root.classList.contains('page-loading')) revealPage(true);
  });

  window.addEventListener('load', function () {
    // Load completion is sufficient to show the UI even if a noncritical custom event was missed.
    if (!revealed) revealPage(true);
  }, { once: true });
})();
