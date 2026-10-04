(function(){
  let running=false,done=false;
  function base(){return String((window.NAGA_CONFIG&&NAGA_CONFIG.api&&NAGA_CONFIG.api.baseUrl)||'https://bo.titanx7.com').replace(/\/$/,'')}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  async function run(){
    if(running||done)return; const box=document.querySelector('[data-layout-section="topup-reward-preview"]'); if(!box)return;
    if(!box.innerHTML.trim())return; running=true;
    try{
      if(window.NagaFrontendDisplay)await NagaFrontendDisplay.refresh({force:true});
      if(window.NAGA_TOPUP_REWARD_ENABLED!==true){box.hidden=true;return}
      const r=await fetch(base()+'/api/public/topup-reward',{cache:'no-store',headers:{Accept:'application/json','X-Brand-Domain':location.hostname}}); if(!r.ok)return;
      const j=await r.json(),d=j.data||{},c=d.campaign||{},rows=d.ranking||[]; if(!d.active){box.hidden=true;return}
      box.hidden=false;
      const link=box.querySelector('[data-tr-preview-link]'); if(link&&!link.getAttribute('href'))link.setAttribute('href','topup-reward.html');
      const title=box.querySelector('[data-tr-preview-title]'); if(title)title.textContent=c.title||'Top-up Reward';
      const text=box.querySelector('[data-tr-preview-text]');
      if(text){const top=rows.slice(0,Math.max(1,Number(c.homepagePreviewLimit||3))).map(x=>`#${x.rank} ${x.prize&&x.prize.title?x.prize.title:''}`).join('  •  ');text.textContent=top||'View ranking & prizes'}
      const banner=box.querySelector('[data-tr-preview-image]'); if(banner){if(c.bannerImage){banner.src=c.bannerImage;banner.hidden=false}else banner.hidden=true}
      done=true;
    }catch(e){}finally{running=false}
  }
  document.addEventListener('naga:layout-section-applied',e=>{if(e.detail&&e.detail.sectionKey==='topup-reward-preview')run()});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true}):setTimeout(run,0);
})();
