(function(){
  'use strict';
  var timer=null;
  function token(){try{return localStorage.getItem('member_token')||localStorage.getItem('token')||''}catch(e){return ''}}
  function apiBase(){return (window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||''}
  function money(v){return 'MYR '+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function num(v){var n=Number(v);return Number.isFinite(n)?n:0}
  function el(id){return document.getElementById(id)}
  function hide(){var w=el('vipTurnoverProgressWidget');if(w)w.hidden=true}
  function render(data){
    var w=el('vipTurnoverProgressWidget');if(!w)return;
    var required=Math.max(0,num(data&&data.required)),progress=Math.max(0,num(data&&data.progress));
    if(required<=0){hide();return;}
    progress=Math.min(progress,required);
    var pct=required>0?Math.max(0,Math.min(100,(progress/required)*100)):100;
    w.hidden=false;
    var s=el('vipTurnoverProgressStatus'),b=el('vipTurnoverProgressBar'),c=el('vipTurnoverProgressCurrent'),r=el('vipTurnoverProgressRequired'),n=el('vipTurnoverProgressNote');
    if(s)s.textContent=pct.toFixed(1)+'%';
    if(b)b.style.width=pct+'%';
    if(c)c.textContent=money(progress);
    if(r)r.textContent=money(required);
    if(n)n.textContent=pct>=100?'VIP turnover requirement completed':'VIP turnover progress';
  }
  async function load(){
    var tk=token();if(!tk){hide();return;}
    try{
      var res=await fetch(apiBase()+'/api/player/vip/rewards/turnover-status?_ts='+Date.now(),{cache:'no-store',headers:{Authorization:'Bearer '+tk,'Cache-Control':'no-cache'}});
      if(!res.ok)throw new Error('HTTP '+res.status);
      var json=await res.json();render(json&&json.data?json.data:null);
    }catch(e){/* keep last confirmed state; do not flash an incorrect zero */}
  }
  var burstTimers=[];
  function clearBurst(){while(burstTimers.length)clearTimeout(burstTimers.pop())}
  function schedule(){clearTimeout(timer);timer=setTimeout(load,60)}
  function burstRefresh(){
    clearBurst();
    // Provider exit returns the wallet immediately, while the provider bet pull is
    // committed just after the exit transaction. Refresh aggressively for a few
    // seconds so VIP turnover follows the returned game balance instead of waiting
    // for the old 15-second safety interval.
    [0,250,600,1000,1500,2200,3200,4500].forEach(function(ms){
      burstTimers.push(setTimeout(load,ms));
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  document.addEventListener('naga:member-ready',schedule);
  document.addEventListener('naga:wallet-updated',schedule);
  document.addEventListener('naga:provider-bet-settled',burstRefresh);
  document.addEventListener('naga:provider-balance-returned',burstRefresh);
  document.addEventListener('naga:provider-session-settled',burstRefresh);
  window.addEventListener('focus',schedule);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)schedule()});
  setInterval(function(){if(!document.hidden&&token())load()},15000);
  window.NAGA_VIP_TURNOVER_PROGRESS={refresh:load,refreshAfterGame:burstRefresh,render:render};
})();
