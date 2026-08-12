(function(){
  function money(v){const n=Number(v||0);return 'MYR '+(Number.isFinite(n)?n:0).toFixed(2);}
  async function load(){
    const api=window.NAGA_API||{}; if(!api.frontendDisplaySetting)return;
    try{
      const r=await fetch(api.frontendDisplaySetting+(api.frontendDisplaySetting.includes('?')?'&':'?')+'_limit_ts='+Date.now(),{cache:'no-store'});
      const j=await r.json().catch(()=>({})); if(!r.ok||j.status==='error')return; const d=j.data||{};
      document.querySelectorAll('[data-min-deposit-display]').forEach(el=>el.textContent=money(d.minDepositAmount||10));
      document.querySelectorAll('[data-min-withdraw-display]').forEach(el=>el.textContent=money(d.minWithdrawalAmount||50));
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
