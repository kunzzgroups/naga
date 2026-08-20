(function(){
  'use strict';

  const DEFAULT_MIN_DEPOSIT = 10;
  const DEFAULT_MIN_WITHDRAW = 50;

  function money(v){
    const n=Number(v);
    return 'MYR '+(Number.isFinite(n)?n:0).toFixed(2);
  }

  function positive(v, fallback){
    const n=Number(v);
    return Number.isFinite(n) && n>0 ? n : fallback;
  }

  function endpoint(){
    const api=window.NAGA_API||{};
    if(api.frontendDisplaySetting) return String(api.frontendDisplaySetting);
    const base=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';
    return String(base).replace(/\/+$/,'')+'/api/frontend/display-setting';
  }

  function apply(data){
    const minDeposit=positive(data&&data.minDepositAmount, DEFAULT_MIN_DEPOSIT);
    const minWithdraw=positive(data&&data.minWithdrawalAmount, DEFAULT_MIN_WITHDRAW);

    window.NAGA_TRANSACTION_LIMITS={
      minDepositAmount:minDeposit,
      minWithdrawalAmount:minWithdraw
    };

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
      // Keep the HTML fallback values if the API is temporarily unavailable.
    }
  }

  window.NAGA_TRANSACTION_LIMITS_API={load:load,apply:apply};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
