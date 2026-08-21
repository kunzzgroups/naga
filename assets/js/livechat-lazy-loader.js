(function(){
  'use strict';
  if(window.__NAGA_LIVECHAT_LAZY_LOADER__) return;
  window.__NAGA_LIVECHAT_LAZY_LOADER__=true;
  var started=false;

  function load(src){
    return new Promise(function(resolve,reject){
      var existing=document.querySelector('script[data-naga-lazy-src="'+src.replace(/"/g,'&quot;')+'"]');
      if(existing){
        if(existing.dataset.loaded==='1') return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      var script=document.createElement('script');
      script.src=src;
      script.dataset.nagaLazySrc=src;
      script.addEventListener('load',function(){script.dataset.loaded='1';resolve();},{once:true});
      script.addEventListener('error',reject,{once:true});
      document.head.appendChild(script);
    });
  }

  async function start(){
    if(started || document.body.classList.contains('chat-page')) return;
    started=true;
    try{
      await load('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
      await load('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js');
      await load('https://www.gstatic.com/firebasejs/10.12.5/firebase-storage-compat.js');
      await load('assets/js/firebase-config.js?v=1.0.0');
      await load('assets/js/livechat-widget.js?v=1.0.5');
      await load('assets/js/livechat-global-notification.js?v=1.0.2');
    }catch(error){
      console.warn('[Naga livechat] lazy startup unavailable:',error&&error.message?error.message:error);
    }
  }

  function schedule(){
    if(started) return;
    if('requestIdleCallback' in window){
      requestIdleCallback(start,{timeout:800});
    }else{
      setTimeout(start,250);
    }
  }

  // Live chat is important but is not render-critical on normal pages. Starting
  // it after the first page paint prevents three remote Firebase SDKs from
  // delaying DOMContentLoaded / the page loader during a force refresh.
  document.addEventListener('naga:page-visible',schedule,{once:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();
