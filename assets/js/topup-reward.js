(function(){
  let timer,running=false,loaded=false;
  const root=()=>document.querySelector('.pc-topup-reward')||document.querySelector('[data-layout-section="topup-reward-page"]');
  const q=s=>{const r=root();return r?r.querySelector(s):null};
  function base(){return String((window.NAGA_CONFIG&&NAGA_CONFIG.api&&NAGA_CONFIG.api.baseUrl)||'https://bo.titanx7.com').replace(/\/$/,'')}
  function publicHeaders(){return {Accept:'application/json','X-Brand-Domain':location.hostname}}
  function memberHeaders(){const h=publicHeaders();try{const t=localStorage.getItem('member_token');if(t)h.Authorization='Bearer '+t}catch(e){}return h}
  function money(v){return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function prize(x){return x&&x.prize?x.prize:null}
  function fillItem(node,x){const p=prize(x)||{};node.querySelectorAll('[data-tr-rank]').forEach(el=>el.textContent='#'+x.rank);node.querySelectorAll('[data-tr-player]').forEach(el=>el.textContent=x.player||'');node.querySelectorAll('[data-tr-amount]').forEach(el=>el.textContent=money(x.amount));node.querySelectorAll('[data-tr-prize-title]').forEach(el=>el.textContent=p.title||'');node.querySelectorAll('[data-tr-prize-description]').forEach(el=>el.textContent=p.description||'');node.querySelectorAll('[data-tr-prize-image]').forEach(el=>{if(p.imageUrl){el.src=p.imageUrl;el.alt=p.title||'Prize';el.hidden=false}else{el.removeAttribute('src');el.hidden=true}});return node}
  function renderItems(target,items,templateSelector,fallback){if(!target)return;const tpl=q(templateSelector);if(!(tpl instanceof HTMLTemplateElement)){target.innerHTML=items.map(fallback).join('');return}target.innerHTML='';const frag=document.createDocumentFragment();items.forEach(x=>{const clone=tpl.content.cloneNode(true);fillItem(clone,x);frag.appendChild(clone)});target.appendChild(frag)}
  function card(x){const p=prize(x);return `<div class="tr-place"><div class="rank">#${x.rank}</div>${p&&p.imageUrl?`<img src="${esc(p.imageUrl)}" alt="${esc(p.title||'Prize')}">`:''}<div class="tr-player">${esc(x.player)}</div><div class="tr-amount">${money(x.amount)}</div>${p?`<div class="tr-prize">${esc(p.title)}</div><small>${esc(p.description||'')}</small>`:''}</div>`}
  function row(x){const p=prize(x);return `<div class="tr-row"><div class="tr-rank">#${x.rank}</div><div class="tr-player">${esc(x.player)}</div><div class="tr-amount">${money(x.amount)}</div><div class="tr-prize">${p?esc(p.title):''}</div></div>`}
  function countdown(end){clearInterval(timer);const el=q('[data-tr-countdown]');if(!el||!end)return;function tick(){const d=new Date(end).getTime()-Date.now();if(d<=0){el.textContent='Campaign ended';clearInterval(timer);return}const days=Math.floor(d/86400000),h=Math.floor(d%86400000/3600000),m=Math.floor(d%3600000/60000),s=Math.floor(d%60000/1000);el.textContent=`${days}D ${h}H ${m}M ${s}S`}tick();timer=setInterval(tick,1000)}
  async function load(){
    if(running||loaded)return; const r0=root(); if(!r0||!r0.innerHTML.trim())return; running=true;
    try{
      // Clear any pre-rendered rows before loading the current merchant.
      renderItems(q('[data-tr-podium]'),[],'[data-tr-podium-template]',card);
      renderItems(q('[data-tr-list]'),[],'[data-tr-row-template]',row);
      const initialStatus=q('[data-tr-status]');if(initialStatus){initialStatus.hidden=false;initialStatus.textContent='Loading...'}
      const myRank=q('[data-tr-me]');if(myRank){myRank.hidden=true;myRank.textContent=''}
      // The public campaign request must not wait for Frontend Display refresh:
      // an unresolved refresh previously left the standalone page on Loading....
      if(window.NagaFrontendDisplay&&typeof NagaFrontendDisplay.refresh==='function'){
        try{Promise.resolve(NagaFrontendDisplay.refresh({force:true})).catch(()=>{});}catch(e){}
      }
      // Do not redirect before fetching the brand-specific public campaign.
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),12000);
      let r;
      try{r=await fetch(base()+'/api/public/topup-reward',{cache:'no-store',headers:publicHeaders(),signal:controller.signal});}
      finally{clearTimeout(timeout)} if(r.status===404){const status=q('[data-tr-status]');if(status)status.textContent='No active Top-up Reward campaign.';loaded=true;return}
      if(!r.ok)throw new Error('HTTP '+r.status);
      const j=await r.json(),d=j.data||{},c=d.campaign||{},list=Array.isArray(d.ranking)?d.ranking:[];
      const status=q('[data-tr-status]'); if(!d.active){if(status){status.hidden=false;status.textContent='No active Top-up Reward campaign.'}loaded=true;return}
      const title=q('[data-tr-title]');if(title)title.textContent=c.title||'Top-up Reward';
      const subtitle=q('[data-tr-subtitle]');if(subtitle)subtitle.textContent=c.subtitle||'';
      const banner=q('[data-tr-banner]');if(banner){if(c.bannerImage){banner.src=c.bannerImage;banner.hidden=false}else banner.hidden=true}
      const podium=q('[data-tr-podium]');renderItems(podium,list.slice(0,3),'[data-tr-podium-template]',card);
      const listEl=q('[data-tr-list]');renderItems(listEl,list.slice(3),'[data-tr-row-template]',row);
      const terms=q('[data-tr-terms]');if(terms)terms.textContent=c.terms||'';
      if(status)status.hidden=list.length>0;
      const cd=q('[data-tr-countdown]');if(Number(c.showCountdown)!==0)countdown(c.endAt);else if(cd)cd.hidden=true;
      
      loaded=true;
    }catch(e){const status=q('[data-tr-status]');if(status){status.hidden=false;status.textContent='Unable to load Top-up Reward.'}}finally{running=false}
  }
  document.addEventListener('naga:layout-section-applied',e=>{if(e.detail&&e.detail.sectionKey==='topup-reward-page')load()});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(load,0),{once:true}):setTimeout(load,0);
})();
