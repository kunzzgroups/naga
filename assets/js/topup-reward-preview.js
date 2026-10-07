(function(){
  'use strict';
  let running=false, done=false;
  const base=()=>String((window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'').replace(/\/+$/,'');
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const currency=()=>window.NAGA_CURRENCY&&typeof window.NAGA_CURRENCY.code==='function'?window.NAGA_CURRENCY.code():'MYR';
  function markReady(box, visible){
    if(box){
      if(visible){box.dataset.topupRewardReady='1';box.hidden=false;box.style.removeProperty('display');box.setAttribute('aria-hidden','false')}
      else{delete box.dataset.topupRewardReady;box.hidden=true;box.style.display='none';box.setAttribute('aria-hidden','true')}
    }
    if(!window.__NAGA_TOPUP_PREVIEW_READY__){window.__NAGA_TOPUP_PREVIEW_READY__=true;try{document.dispatchEvent(new CustomEvent('naga:topup-preview-ready',{detail:{visible:!!visible}}))}catch(_e){}}
  }
  function rankCell(rank,row){
    const imageUrl=row&&row.prize&&row.prize.imageUrl?String(row.prize.imageUrl).trim():'';
    if(rank>=1&&rank<=3&&imageUrl){
      return `<img class="tx-deposit-board__rank-image" src="${esc(imageUrl)}" alt="Rank ${rank}" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="tx-deposit-board__rank" hidden>${rank}</span>`;
    }
    return `<span class="tx-deposit-board__rank">${rank}</span>`;
  }
  function renderDepositBoard(box,c,rows){
    const board=box.querySelector('.tx-deposit-board'); if(!board)return;
    const title=board.querySelector('.tx-deposit-board__title'); if(title&&c.title)title.textContent=c.title;
    const subtitle=board.querySelector('.tx-deposit-board__subtitle'); if(subtitle)subtitle.textContent=c.subtitle||'Ranked by total deposits';
    const tbody=board.querySelector('.tx-deposit-board__table tbody');
    if(tbody){
      const limit=Math.max(1,Number(c.homepagePreviewLimit||3));
      const code=currency();
      tbody.innerHTML=rows.slice(0,limit).map(x=>{
        const rank=Number(x.rank||0), cls=rank===1?'tx-deposit-board__row--gold':rank===2?'tx-deposit-board__row--silver':rank===3?'tx-deposit-board__row--bronze':'';
        return `<tr${cls?` class="${cls}"`:''}><td>${rankCell(rank,x)}</td><td>${esc(x.player||'')}</td><td><span class="tx-deposit-board__currency">${esc(code)}</span> ${money(x.amount)}</td></tr>`;
      }).join('');
    }
    const footer=board.querySelector('.tx-deposit-board__footer');
    if(footer)footer.textContent=rows.length?'Live ranking':'No qualifying deposits yet';
  }
  async function run(){
    if(running||done)return;
    const box=document.querySelector('[data-layout-section="topup-reward-preview"]');
    if(!box)return;
    if(window.NAGA_TOPUP_REWARD_ENABLED===undefined)return;
    if(window.NAGA_TOPUP_REWARD_ENABLED!==true){markReady(box,false);return}
    running=true;
    try{
      const r=await fetch(base()+'/api/public/topup-reward',{cache:'no-store',headers:{Accept:'application/json','X-Brand-Domain':location.hostname}});
      if(!r.ok){markReady(box,false);return}
      const j=await r.json(),d=j&&j.data||{},c=d.campaign||{},rows=Array.isArray(d.ranking)?d.ranking:[];
      if(!d.active){markReady(box,false);done=true;return}
      const link=box.querySelector('[data-tr-preview-link]');if(link&&!link.getAttribute('href'))link.setAttribute('href','topup-reward.html');
      const title=box.querySelector('[data-tr-preview-title]');if(title)title.textContent=c.title||'Top-up Reward';
      const text=box.querySelector('[data-tr-preview-text]');if(text){const top=rows.slice(0,Math.max(1,Number(c.homepagePreviewLimit||3))).map(x=>`#${x.rank} ${x.prize&&x.prize.title?x.prize.title:''}`).join('  •  ');text.textContent=top||'View ranking & prizes'}
      const banner=box.querySelector('[data-tr-preview-image]');if(banner){if(c.bannerImage){banner.src=c.bannerImage;banner.hidden=false}else banner.hidden=true}
      renderDepositBoard(box,c,rows);
      done=true;markReady(box,true);
    }catch(e){markReady(box,false)}finally{running=false}
  }
  document.addEventListener('naga:layout-section-applied',e=>{if(e.detail&&e.detail.sectionKey==='topup-reward-preview'){done=false;run()}});
  document.addEventListener('naga:topup-reward-visibility',e=>{const enabled=!!(e.detail&&e.detail.enabled),box=document.querySelector('[data-layout-section="topup-reward-preview"]');if(!enabled){done=false;markReady(box,false);return}run()});
  document.addEventListener('naga:currency-changed',()=>{done=false;run()});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true}):setTimeout(run,0);
})();
