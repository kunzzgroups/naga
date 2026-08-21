(function(){
  'use strict';


  function money(v){
    const n=Number(v);
    return 'MYR '+(Number.isFinite(n)?n:0).toFixed(2);
  }

  function positive(v){
    const n=Number(v);
    return Number.isFinite(n) && n>0 ? n : null;
  }

  const LIMIT_CACHE_KEY='naga_transaction_limits_v1:'+location.host;
  function readCache(){
    try{ const c=JSON.parse(localStorage.getItem(LIMIT_CACHE_KEY)||'null'); return c&&typeof c==='object'?c:null; }catch(e){return null;}
  }
  function writeCache(v){ try{localStorage.setItem(LIMIT_CACHE_KEY,JSON.stringify(v));}catch(e){} }

  function endpoint(){
    const api=window.NAGA_API||{};
    if(api.frontendDisplaySetting) return String(api.frontendDisplaySetting);
    const base=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';
    return String(base).replace(/\/+$/,'')+'/api/frontend/display-setting';
  }

  function apply(data){
    const minDeposit=positive(data&&data.minDepositAmount);
    const minWithdraw=positive(data&&data.minWithdrawalAmount);
    if(minDeposit===null || minWithdraw===null) return;

    window.NAGA_TRANSACTION_LIMITS={
      minDepositAmount:minDeposit,
      minWithdrawalAmount:minWithdraw
    };
    writeCache(window.NAGA_TRANSACTION_LIMITS);

    document.querySelectorAll('[data-min-deposit-display]').forEach(function(el){
      el.textContent=money(minDeposit);
    });
    document.querySelectorAll('[data-min-withdraw-display]').forEach(function(el){
      el.textContent=money(minWithdraw);
    });

    window.dispatchEvent(new CustomEvent('naga:transaction-limits',{detail:window.NAGA_TRANSACTION_LIMITS}));
  }

  async function load(){
    try{
      const url=endpoint();
      const sep=url.includes('?')?'&':'?';
      const r=await fetch(url+sep+'_limit_ts='+Date.now(),{
        cache:'no-store',
        headers:{'Cache-Control':'no-cache, no-store, must-revalidate','Pragma':'no-cache'}
      });
      const j=await r.json().catch(function(){return {};});
      if(!r.ok||j.status==='error') return;
      apply(j.data||{});
    }catch(e){
      // Do not paint hardcoded transaction limits; keep BO-bound fields unset.
    }
  }

  window.NAGA_TRANSACTION_LIMITS_API={load:load,apply:apply};
  // Paint the last confirmed BO values immediately; refresh silently afterwards.
  const cached=readCache(); if(cached) apply(cached);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
