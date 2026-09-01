(function(){
  'use strict';
  if(window.__NAGA_LIVE_TRANSACTIONS_V102__) return;
  window.__NAGA_LIVE_TRANSACTIONS_V102__=true;

  // BO allows up to 20 Random Demo transactions per update. Do not clamp it
  // back to the old hard-coded five-row demo on the storefront.
  const MAX_ROWS=20;
  let timer=0;
  let stopped=false;

  function endpoint(){
    if(window.NAGA_API&&window.NAGA_API.publicLiveTransactions) return String(window.NAGA_API.publicLiveTransactions);
    const base=window.NAGA_CONFIG?.api?.baseUrl||'';
    return String(base).replace(/\/+$/,'')+'/api/public/live-transactions';
  }
  function displaySettingEndpoint(){
    const base=window.NAGA_CONFIG?.api?.baseUrl||'';
    return String(base).replace(/\/+$/,'')+'/api/frontend/display-setting';
  }
  function brandDomain(){return String(window.NAGA_BRAND?.domain||location.hostname||'').trim().toLowerCase()}
  function widgets(){return Array.from(document.querySelectorAll('[data-live-transaction-widget]'))}
  function rowsHosts(){return Array.from(document.querySelectorAll('[data-live-transaction-rows]'))}
  function money(v){const n=Number(v);return Number.isFinite(n)?'RM'+n.toFixed(2):''}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function rowHtml(r){
    const du=r.depositUser?`<span class="lt-user">${esc(r.depositUser)}</span><span class="lt-amount">${money(r.depositAmount)}</span>`:'<span class="lt-user">—</span>';
    const wu=r.withdrawUser?`<span class="lt-user">${esc(r.withdrawUser)}</span><span class="lt-amount">${money(r.withdrawAmount)}</span>`:'<span class="lt-user">—</span>';
    return `<div class="live-transaction-row"><span>${du}</span><span>${wu}</span><span class="lt-provider">${esc(r.provider||'—')}</span></div>`;
  }
  function render(rows){
    const safe=Array.isArray(rows)?rows.slice(0,MAX_ROWS):[];
    rowsHosts().forEach(host=>{host.innerHTML=safe.length?safe.map(rowHtml).join(''):'<div class="live-transaction-empty">Waiting for completed transactions...</div>'});
  }
  function setVisible(enabled){widgets().forEach(w=>{w.hidden=!enabled})}
  function schedule(seconds){
    clearTimeout(timer);
    if(stopped) return;
    const ms=Math.max(2,Math.min(60,Number(seconds)||5))*1000;
    // Always reload from the API. In Random Demo mode the API chooses a new
    // interval, row count and deposit/withdraw amount for every cycle using
    // the exact min/max values saved in BO.
    timer=setTimeout(refresh,ms);
  }
  async function explicitlyEnabled(headers){
    try{
      const u=displaySettingEndpoint()+(displaySettingEndpoint().includes('?')?'&':'?')+'_ltcfg='+Date.now();
      const r=await fetch(u,{cache:'no-store',credentials:'omit',headers});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||String(j.status||'').toLowerCase()==='error') return false;
      const cfg=j.data||{};
      return Number(cfg.liveTransactionEnabled)===1||cfg.liveTransactionEnabled===true;
    }catch(_){
      return false;
    }
  }
  async function refresh(){
    if(stopped) return;
    try{
      if(window.NAGA_BRAND?.ready){try{await window.NAGA_BRAND.ready}catch(_){}}
      const headers={'Accept':'application/json','Cache-Control':'no-cache,no-store'};
      const domain=brandDomain();if(domain)headers['X-Brand-Domain']=domain;
      // The display setting is the source of truth. Hide first and do not even
      // request transaction rows unless this brand is explicitly enabled.
      const configuredEnabled=await explicitlyEnabled(headers);
      if(!configuredEnabled){setVisible(false);clearTimeout(timer);return}
      const url=endpoint()+(endpoint().includes('?')?'&':'?')+'_lt='+Date.now();
      const res=await fetch(url,{cache:'no-store',credentials:'omit',headers});
      const json=await res.json().catch(()=>({}));
      if(!res.ok||String(json.status||'').toLowerCase()==='error')throw new Error(json.message||('HTTP '+res.status));
      const d=json.data||{};
      const enabled=d.enabled!==false&&Number(d.enabled)!==0;
      const mode=String(d.mode||'REAL').toUpperCase()==='FAKE'?'FAKE':'REAL';
      const interval=Math.max(2,Math.min(60,Number(d.intervalSeconds)||5));
      setVisible(enabled);
      if(!enabled){clearTimeout(timer);return}
      // Both REAL and FAKE rows come from the API. For FAKE this is important:
      // depositAmount and withdrawAmount are generated from the same BO price
      // range, and the number of rows follows the BO transaction-count range.
      render(d.rows||[]);
      schedule(interval);
    }catch(err){
      console.warn('Live Transaction load failed:',err&&err.message);
      setVisible(false);
      schedule(10);
    }
  }
  function start(){stopped=false;refresh()}
  function stop(){stopped=true;clearTimeout(timer)}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
