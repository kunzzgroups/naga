(function(){
  const tabsWrap=document.getElementById('policyTabs'), content=document.querySelector('.policy-content');
  const fallback={tabs:tabsWrap.innerHTML,content:content.innerHTML};
  let loadSeq=0;
  const revealPolicy=()=>document.documentElement.classList.remove('policy-data-loading');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function rawLang(){
    try{
      return (window.I18N&&window.I18N.current) || localStorage.getItem('site_lang') || localStorage.getItem('lang') || document.documentElement.lang || 'en';
    }catch(e){ return (window.I18N&&window.I18N.current)||'en'; }
  }
  function normalizeLang(lang){
    const v=String(lang||'en').trim().replace('_','-');
    if(/^zh(-|$)/i.test(v)) return 'zh';
    return (v.split('-')[0]||'en').toLowerCase();
  }
  function currentLang(){ return normalizeLang(rawLang()); }
  function uiText(key,fallbackText){try{const v=window.I18N&&I18N.t?I18N.t(key):'';return v&&v!==key?v:fallbackText}catch(e){return fallbackText}}

  function translationFor(item,lang){
    const all=item&&item.translations&&typeof item.translations==='object'?item.translations:{};
    if(all[lang]) return all[lang];
    const raw=String(rawLang()||'');
    if(all[raw]) return all[raw];
    const short=normalizeLang(raw);
    if(all[short]) return all[short];
    const key=Object.keys(all).find(k=>normalizeLang(k)===short);
    return key?all[key]:null;
  }
  function localizedItem(item,lang){
    const out=Object.assign({},item||{}), tr=translationFor(item,lang);
    if(tr&&typeof tr==='object') ['tabLabel','title','contentHtml','lastUpdated'].forEach(k=>{
      if(tr[k]!==undefined && tr[k]!==null && String(tr[k]).trim()!=='') out[k]=tr[k];
    });
    return out;
  }

  function bind(){
    const tabs=Array.from(document.querySelectorAll('.policy-tab')),panels=Array.from(document.querySelectorAll('.policy-panel'));
    function center(t){if(!t||!tabsWrap)return;tabsWrap.scrollTo({left:Math.max(0,t.offsetLeft-tabsWrap.clientWidth/2+t.clientWidth/2),behavior:'smooth'})}
    function show(t){tabs.forEach(x=>x.classList.toggle('active',x===t));panels.forEach(p=>p.classList.toggle('active',p.id===t.dataset.target));center(t);window.scrollTo({top:0,behavior:'smooth'})}
    tabs.forEach(t=>t.addEventListener('click',()=>show(t)));
    setTimeout(()=>center(document.querySelector('.policy-tab.active')),0);
  }

  function render(items,lang){
    if(!Array.isArray(items)||!items.length)return;
    const rows=items.map(x=>localizedItem(x,lang));
    tabsWrap.innerHTML=rows.map((x,i)=>`<button class="policy-tab ${i===0?'active':''}" type="button" role="tab" data-target="policy-${esc(x.policyKey)}">${esc(x.tabLabel)}</button>`).join('');
    content.innerHTML=rows.map((x,i)=>`<article class="policy-panel ${i===0?'active':''}" id="policy-${esc(x.policyKey)}"><h2>${esc(x.title)}</h2>${x.lastUpdated?`<p class="policy-muted">${esc(uiText('policy.last_updated','Last updated'))}: ${esc(x.lastUpdated)}</p>`:''}<div class="policy-managed-content">${x.contentHtml||''}</div></article>`).join('');
  }

  async function load(){
    const seq=++loadSeq;
    document.documentElement.classList.add('policy-data-loading');
    try{
      const base=window.NAGA_CONFIG.api.baseUrl.replace(/\/$/,'');
      const lang=currentLang();
      const raw=String(rawLang()||lang);
      const langs=[lang,raw].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
      const roots=[(window.NAGA_API&&NAGA_API.compliancePolicyList),base+'/api/compliance-policies',base+'/api/compliance-policy/list'].filter(Boolean);
      const stamp=Date.now();
      const urls=[];
      roots.forEach(root=>langs.forEach(l=>urls.push(root+(root.includes('?')?'&':'?')+'lang='+encodeURIComponent(l)+'&_ts='+stamp)));
      let lastError;
      let rendered=false;
      for(const u of [...new Set(urls)]){
        try{
          const r=await fetch(u,{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}}),j=await r.json();
          if(seq!==loadSeq)return;
          if(!r.ok||j.status==='error'||!Array.isArray(j.data))throw new Error(j.message||'Request failed');
          render(j.data,lang);
          rendered=true;
          lastError=null;
          break;
        }catch(err){
          if(seq!==loadSeq)return;
          lastError=err;
        }
      }
      if(lastError||!rendered)throw (lastError||new Error('No policy data'));
    }catch(e){
      if(seq!==loadSeq)return;
      tabsWrap.innerHTML=fallback.tabs;
      content.innerHTML=fallback.content;
    }
    if(seq!==loadSeq)return;
    bind();
    requestAnimationFrame(()=>{
      if(seq===loadSeq)revealPolicy();
    });
  }

  function scrollTop(){let b=document.getElementById('nagaScrollTopBtn');if(!b){b=document.createElement('button');b.id='nagaScrollTopBtn';b.className='naga-scroll-top-btn';b.type='button';b.setAttribute('aria-label','Back to top');b.innerHTML='<i class="fa-solid fa-arrow-up"></i>';document.body.appendChild(b)}const u=()=>b.classList.toggle('show',(window.pageYOffset||0)>160);b.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});window.addEventListener('scroll',u,{passive:true});u()}
  document.addEventListener('DOMContentLoaded',()=>{load();scrollTop()});
  document.addEventListener('i18n:changed',()=>{load();});
})();
