(function(){
  'use strict';

  var header=document.querySelector('.top-header');
  if(!header) return;

  var CACHE_KEY='naga_marquee_state_v1';
  var readyDispatched=false;
  var activeContent='';
  var activeEnabled=false;

  function markReady(){
    if(readyDispatched) return;
    readyDispatched=true;
    window.__NAGA_MARQUEE_READY__=true;
    try{ document.dispatchEvent(new CustomEvent('naga:marquee-ready')); }catch(_e){}
  }

  function plainText(html){
    var d=document.createElement('div');
    d.innerHTML=html||'';
    return (d.textContent||'').replace(/\s+/g,' ').trim();
  }

  function normalizeEnabled(value){
    return value===1||value===true||String(value).toLowerCase()==='true';
  }

  function readCache(){
    try{
      var raw=localStorage.getItem(CACHE_KEY);
      if(!raw) return null;
      var state=JSON.parse(raw);
      if(!state||typeof state!=='object') return null;
      return {
        enabled:state.enabled===true,
        content:typeof state.content==='string'?state.content:''
      };
    }catch(_e){
      return null;
    }
  }

  function writeCache(enabled,content){
    try{
      localStorage.setItem(CACHE_KEY,JSON.stringify({
        enabled:enabled===true,
        content:typeof content==='string'?content:''
      }));
    }catch(_e){}
  }

  function updateMetrics(bar,copy){
    if(!bar||!bar.isConnected) return;
    var h=Math.round(bar.getBoundingClientRect().height||0);
    document.documentElement.style.setProperty('--naga-marquee-height',h+'px');

    var viewport=bar.querySelector('.naga-marquee-viewport');
    var viewportWidth=Math.max(1,(viewport&&viewport.clientWidth)||window.innerWidth||1);
    var contentWidth=Math.max(1,copy.scrollWidth||1);
    var totalDistance=viewportWidth+contentWidth;
    var pxPerSecond=window.innerWidth<=768?55:70;
    var duration=Math.max(10,Math.min(60,totalDistance/pxPerSecond));
    bar.style.setProperty('--naga-marquee-duration',duration+'s');
  }

  function createOrUpdateBar(html){
    if(!plainText(html)) return hide(false);

    var bar=document.getElementById('nagaGlobalMarquee');
    var isNew=!bar;
    if(!bar){
      bar=document.createElement('div');
      bar.id='nagaGlobalMarquee';
      bar.className='naga-marquee';
      bar.setAttribute('role','region');
      bar.setAttribute('aria-label','Announcement');
      bar.innerHTML='<div class="naga-marquee-viewport"><div class="naga-marquee-track"><div class="naga-marquee-copy"></div></div></div>';
      header.insertAdjacentElement('afterend',bar);
    }

    var copy=bar.querySelector('.naga-marquee-copy');
    if(activeContent!==html||copy.innerHTML!==html){
      copy.innerHTML=html;
    }

    activeContent=html;
    activeEnabled=true;
    bar.classList.add('is-visible');

    requestAnimationFrame(function(){
      updateMetrics(bar,copy);
      if(isNew) window.dispatchEvent(new Event('resize'));
    });
  }

  function hide(dispatchResize){
    var old=document.getElementById('nagaGlobalMarquee');
    var hadBar=!!old;
    if(old) old.remove();
    activeContent='';
    activeEnabled=false;
    document.documentElement.style.setProperty('--naga-marquee-height','0px');
    if(dispatchResize!==false&&hadBar) window.dispatchEvent(new Event('resize'));
  }

  function applyState(enabled,content,persist){
    var normalizedContent=typeof content==='string'?content:'';
    var shouldShow=enabled===true&&!!plainText(normalizedContent);

    if(persist) writeCache(shouldShow,shouldShow?normalizedContent:'');

    if(shouldShow){
      /* Do not destroy/recreate the row if BO returned the same value. This
         prevents animation restart and, more importantly, avoids layout work. */
      if(activeEnabled&&activeContent===normalizedContent){
        var current=document.getElementById('nagaGlobalMarquee');
        if(current&&current.classList.contains('is-visible')) return;
      }
      createOrUpdateBar(normalizedContent);
    }else{
      hide(true);
    }
  }

  function applyPayload(payload,persist){
    var d=payload&&payload.data&&typeof payload.data==='object'?payload.data:(payload||{});

    try{
      if(Object.prototype.hasOwnProperty.call(d,'leaderboardEnabled')){
        var lbEnabled=normalizeEnabled(d.leaderboardEnabled);
        localStorage.setItem('naga_leaderboard_enabled',lbEnabled?'1':'0');
        document.dispatchEvent(new CustomEvent('naga:leaderboard-visibility',{detail:{enabled:lbEnabled}}));
      }
    }catch(_e){}

    applyState(
      normalizeEnabled(d.marqueeEnabled),
      d.marqueeContent==null?'':String(d.marqueeContent),
      persist===true
    );
  }

  /* Paint the last BO-confirmed state synchronously, before DOMContentLoaded
     and before the page loader is dismissed. This removes the 30/34px CLS
     where the lobby used to jump down after the API response arrived. */
  var cached=readCache();
  if(cached){
    applyState(cached.enabled,cached.content,false);
    markReady();
  }

  var resizeTimer=0;
  window.addEventListener('resize',function(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(function(){
      var bar=document.getElementById('nagaGlobalMarquee');
      if(!bar) return;
      var copy=bar.querySelector('.naga-marquee-copy');
      if(copy) updateMetrics(bar,copy);
    },120);
  },{passive:true});

  function directRefresh(){
    var base=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';
    var endpoint=(window.NAGA_API&&window.NAGA_API.frontendDisplaySetting)||(String(base).replace(/\/$/,'')+'/api/frontend/display-setting');
    if(!endpoint) return Promise.resolve(null);
    return fetch(endpoint,{cache:'no-store',headers:{'Accept':'application/json'}})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});
  }

  function refresh(){
    /* Reuse FrontendDisplay's in-flight request when available. This turns
       two identical startup calls into one and shortens the critical path. */
    var p=(window.NagaFrontendDisplay&&typeof window.NagaFrontendDisplay.refresh==='function')
      ? window.NagaFrontendDisplay.refresh()
      : directRefresh();

    Promise.resolve(p)
      .then(function(payload){
        if(payload) applyPayload(payload,true);
        markReady();
      })
      .catch(function(){
        /* Keep confirmed cached BO content on transient network failure.
           Removing it here would reintroduce the layout jump. */
        if(!cached) hide(false);
        markReady();
      });
  }

  /* config.js / frontend-display.js are already parsed before this script in
     current pages. Starting immediately lets their shared fetch run before DCL. */
  refresh();
})();
