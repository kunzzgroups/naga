(function(){
  'use strict';
  let running=false, done=false;
  const base=()=>String((window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'').replace(/\/+$/,'');
  function markReady(box, visible){
    if(box){
      if(visible){
        box.dataset.topupRewardReady='1';
        box.hidden=false;
        box.style.removeProperty('display');
        box.setAttribute('aria-hidden','false');
      }else{
        delete box.dataset.topupRewardReady;
        box.hidden=true;
        box.style.display='none';
        box.setAttribute('aria-hidden','true');
      }
    }
    if(!window.__NAGA_TOPUP_PREVIEW_READY__){
      window.__NAGA_TOPUP_PREVIEW_READY__=true;
      try{document.dispatchEvent(new CustomEvent('naga:topup-preview-ready',{detail:{visible:!!visible}}))}catch(_e){}
    }
  }
  async function run(){
    if(running||done)return;
    const box=document.querySelector('[data-layout-section="topup-reward-preview"]');
    if(!box)return;
    if(window.NAGA_TOPUP_REWARD_ENABLED === undefined) return;
    if(window.NAGA_TOPUP_REWARD_ENABLED !== true){
      markReady(box,false);
      return;
    }
    running=true;
    try{
      const r=await fetch(base()+'/api/public/topup-reward',{cache:'no-store',headers:{Accept:'application/json','X-Brand-Domain':location.hostname}});
      if(!r.ok){markReady(box,false);return}
      const j=await r.json(),d=j&&j.data||{},c=d.campaign||{},rows=Array.isArray(d.ranking)?d.ranking:[];
      if(!d.active){markReady(box,false);done=true;return}
      const link=box.querySelector('[data-tr-preview-link]'); if(link&&!link.getAttribute('href'))link.setAttribute('href','topup-reward.html');
      const title=box.querySelector('[data-tr-preview-title]'); if(title)title.textContent=c.title||'Top-up Reward';
      const text=box.querySelector('[data-tr-preview-text]');
      if(text){const top=rows.slice(0,Math.max(1,Number(c.homepagePreviewLimit||3))).map(x=>`#${x.rank} ${x.prize&&x.prize.title?x.prize.title:''}`).join('  •  ');text.textContent=top||'View ranking & prizes'}
      const banner=box.querySelector('[data-tr-preview-image]'); if(banner){if(c.bannerImage){banner.src=c.bannerImage;banner.hidden=false}else banner.hidden=true}
      done=true;
      markReady(box,true);
    }catch(e){
      markReady(box,false);
    }finally{running=false}
  }
  document.addEventListener('naga:layout-section-applied',e=>{if(e.detail&&e.detail.sectionKey==='topup-reward-preview'){done=false;run()}});
  document.addEventListener('naga:topup-reward-visibility',e=>{
    const enabled=!!(e.detail&&e.detail.enabled);
    const box=document.querySelector('[data-layout-section="topup-reward-preview"]');
    if(!enabled){done=false;markReady(box,false);return}
    run();
  });
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true}):setTimeout(run,0);
})();
