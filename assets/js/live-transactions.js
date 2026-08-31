(function(){
  'use strict';
  if(window.__NAGA_LIVE_TRANSACTIONS_V100__) return;
  window.__NAGA_LIVE_TRANSACTIONS_V100__=true;

  const MAX_ROWS=5;
  const fakeProviders=['PRAGMATICPLAY','PLAYSTAR','LUCKY365','ACEWIN','JILI','LIVE22','EPICWIN','PGSOFT','918KISS','MEGA888'];
  let timer=0;
  let stopped=false;

  function endpoint(){
    if(window.NAGA_API&&window.NAGA_API.publicLiveTransactions) return String(window.NAGA_API.publicLiveTransactions);
    const base=window.NAGA_CONFIG?.api?.baseUrl||'';
    return String(base).replace(/\/+$/,'')+'/api/public/live-transactions';
  }
  function brandDomain(){return String(window.NAGA_BRAND?.domain||location.hostname||'').trim().toLowerCase()}
  function widgets(){return Array.from(document.querySelectorAll('[data-live-transaction-widget]'))}
  function rowsHosts(){return Array.from(document.querySelectorAll('[data-live-transaction-rows]'))}
  function money(v){const n=Number(v);return Number.isFinite(n)?'RM'+n.toFixed(2):''}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function randomDigits(n){let s='';for(let i=0;i<n;i++)s+=Math.floor(Math.random()*10);return s}
  function fakeUser(){return randomDigits(2)+'****'+randomDigits(3)}
  function fakeAmount(type){
    const min=type==='withdraw'?20:10,max=type==='withdraw'?900:500;
    return Math.round((min+Math.random()*(max-min))*100)/100;
  }
  function fakeRows(){
    return Array.from({length:MAX_ROWS},()=>({
      depositUser:fakeUser(),depositAmount:fakeAmount('deposit'),
      withdrawUser:fakeUser(),withdrawAmount:fakeAmount('withdraw'),
      provider:fakeProviders[Math.floor(Math.random()*fakeProviders.length)]
    }));
  }
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
  function schedule(seconds,mode){
    clearTimeout(timer);
    if(stopped) return;
    const ms=Math.max(2,Math.min(60,Number(seconds)||5))*1000;
    timer=setTimeout(()=>mode==='FAKE'?runFake(seconds):refresh(),ms);
  }
  function runFake(seconds){
    if(stopped) return;
    setVisible(true);render(fakeRows());schedule(seconds,'FAKE');
  }
  async function refresh(){
    if(stopped) return;
    try{
      if(window.NAGA_BRAND?.ready){try{await window.NAGA_BRAND.ready}catch(_){}}
      const headers={'Accept':'application/json','Cache-Control':'no-cache,no-store'};
      const domain=brandDomain();if(domain)headers['X-Brand-Domain']=domain;
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
      if(mode==='FAKE'){render(fakeRows());schedule(interval,'FAKE')}
      else{render(d.rows||[]);schedule(interval,'REAL')}
    }catch(err){
      console.warn('Live Transaction load failed:',err&&err.message);
      setVisible(false);
      schedule(10,'REAL');
    }
  }
  function start(){stopped=false;refresh()}
  function stop(){stopped=true;clearTimeout(timer)}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
