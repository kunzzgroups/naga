(function(){
  'use strict';

  // Isolated A2HS helper. It intentionally does NOT touch NAGA_SITE_SHELL,
  // layout-section loading, I18N.apply(), API calls, scrolling or game rendering.
  var deferredPrompt = null;
  var installed = false;

  function isZh(){
    try {
      var saved = localStorage.getItem('site_lang');
      return saved === 'zh' || (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    } catch (_) {
      return (document.documentElement.lang || '').toLowerCase().indexOf('zh') === 0;
    }
  }

  function isStandalone(){
    try {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    } catch (_) { return false; }
  }

  function label(){ return isZh() ? '添加到主屏幕' : 'Add to Home Screen'; }

  function helpText(){
    var ua = navigator.userAgent || '';
    var ios = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    if (isZh()) {
      if (ios) return '请使用 Safari：点击“分享”，选择“添加到主屏幕”，然后点击“添加”。';
      if (android) return '如果没有出现安装提示，请打开浏览器菜单（⋮），选择“安装应用”或“添加到主屏幕”。';
      return '请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。';
    }
    if (ios) return 'In Safari, tap Share, choose “Add to Home Screen”, then tap Add.';
    if (android) return 'If no install prompt appears, open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.';
    return 'Open the browser menu and choose “Install app” or “Add to Home screen”.';
  }

  function showHelp(){
    var msg = helpText();
    var title = label();
    if (window.NAGA_MODAL && typeof window.NAGA_MODAL.alert === 'function') {
      window.NAGA_MODAL.alert(msg, title);
    } else {
      window.alert(msg);
    }
  }

  function onInstallClick(e){
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (isStandalone() || installed) return;
    if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
      var p = deferredPrompt;
      deferredPrompt = null;
      try {
        p.prompt();
        Promise.resolve(p.userChoice).catch(function(){}).then(refreshButton);
      } catch (_) { showHelp(); }
    } else {
      showHelp();
    }
  }

  function refreshButton(){
    var btn = document.getElementById('nagaAddToHomeScreen');
    if (!btn) return;
    if (isStandalone() || installed) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
    var text = btn.querySelector('.naga-a2hs-label');
    if (text) text.textContent = label();
    btn.setAttribute('aria-label', label());
  }

  function insertButton(){
    if (isStandalone() || installed) return;
    var list = document.querySelector('#mobileSideMenu .mobile-menu-list');
    if (!list || document.getElementById('nagaAddToHomeScreen')) {
      refreshButton();
      return;
    }
    var btn = document.createElement('button');
    btn.id = 'nagaAddToHomeScreen';
    btn.type = 'button';
    btn.className = 'naga-a2hs-button';
    btn.innerHTML = '<i class="fa-solid fa-mobile-screen-button mobile-menu-icon" aria-hidden="true"></i><span class="naga-a2hs-label"></span><i class="fa-solid fa-chevron-right mobile-menu-arrow" aria-hidden="true"></i>';
    btn.addEventListener('click', onInstallClick, {passive:false});
    var logout = list.querySelector('[data-member-logout],.mobile-menu-list-logout');
    if (logout) list.insertBefore(btn, logout); else list.appendChild(btn);
    refreshButton();
  }

  function scheduleInsert(){
    // Keep the install feature out of the critical rendering path.
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(insertButton, {timeout:1200});
    } else {
      window.setTimeout(insertButton, 0);
    }
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    refreshButton();
  });
  window.addEventListener('appinstalled', function(){
    installed = true;
    deferredPrompt = null;
    refreshButton();
  });

  // The BO layout loader emits these only after its normal work is complete.
  document.addEventListener('naga:layout-sections-loaded', scheduleInsert, {passive:true});
  document.addEventListener('naga:site-shell-customized', function(e){
    if (!e.detail || !e.detail.sectionKey || e.detail.sectionKey === 'frontend-sidebar') scheduleInsert();
  }, {passive:true});
  document.addEventListener('i18n:changed', refreshButton, {passive:true});

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInsert, {once:true, passive:true});
  } else {
    scheduleInsert();
  }
})();
