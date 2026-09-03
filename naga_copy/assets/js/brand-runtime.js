(function(){
  'use strict';
  const originalFetch=window.fetch.bind(window);
  const host=(location.hostname||'').toLowerCase();
  const configuredBase=(window.NAGA_CONFIG&&NAGA_CONFIG.api&&NAGA_CONFIG.api.baseUrl)||'';
  function requestUrl(raw){
    try{ return new URL(typeof raw==='string'?raw:(raw&&raw.url)||'', location.href); }
    catch(e){ return null; }
  }
  function legacyPublicUrl(raw){
    const u=requestUrl(raw);
    if(!u) return null;
    const path=u.pathname;
    let changed=false;
    if(path==='/api/admin/slider/list'){ u.pathname='/api/public/slider/list'; changed=true; }
    else if(path==='/api/admin/language/translation'){ u.pathname='/api/public/translation'; changed=true; }
    else if(/^\/api\/admin\/game\/(?:category|sub-category|provider|list)/.test(path)) {
      u.pathname='/api/public/game-catalog';
      ['page','size','status','providerCode','categoryId','subCategoryId'].forEach(k=>u.searchParams.delete(k));
      changed=true;
    }
    return changed ? u.href : null;
  }
  function isCentralApiRequest(raw){
    try{
      const u=new URL(typeof raw==='string'?raw:(raw&&raw.url)||'', location.href);
      const bases=[];
      if(configuredBase){ try{ bases.push(new URL(configuredBase, location.href).origin); }catch(e){} }
      const cfg=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';
      if(cfg){ try{ bases.push(new URL(cfg, location.href).origin); }catch(e){} }
      return u.pathname.indexOf('/api/')===0 && bases.indexOf(u.origin)!==-1;
    }catch(e){ return false; }
  }
  window.fetch=function(input,init){
    // IMPORTANT: Firebase/Firestore passes a Request object containing the POST
    // method/body used by its WebChannel transport. Converting that Request to
    // only a URL changes the call into a GET and causes /Write/channel 400.
    // External requests must therefore pass through byte-for-byte untouched.
    const rewritten=legacyPublicUrl(input);
    const effective=rewritten || input;
    if(!isCentralApiRequest(effective)){
      return originalFetch(input,init);
    }

    const nextInit=init?Object.assign({},init):{};
    const baseHeaders=(nextInit.headers || (input instanceof Request ? input.headers : null) || {});
    const h=new Headers(baseHeaders);
    if(host&&!h.has('X-Brand-Domain'))h.set('X-Brand-Domain',host);
    nextInit.headers=h;

    if(input instanceof Request){
      // Clone the Request so method/body/credentials/mode/signal are preserved.
      // Use the rewritten URL only for legacy calls to our own API.
      const req=rewritten ? new Request(rewritten,input) : input;
      return originalFetch(req,nextInit);
    }
    return originalFetch(rewritten || input,nextInit);
  };
  window.NAGA_BRAND={domain:host,data:null,ready:null};

  function rewriteApiBase(newBase){
    if(!newBase||!window.NAGA_CONFIG||!window.NAGA_CONFIG.api)return;
    const old=String(window.NAGA_CONFIG.api.baseUrl||'');
    window.NAGA_CONFIG.api.baseUrl=newBase;
    if(window.NAGA_API&&old&&old!==newBase){
      Object.keys(window.NAGA_API).forEach(function(k){
        const v=window.NAGA_API[k];
        if(typeof v==='string'&&v.indexOf(old)===0)window.NAGA_API[k]=newBase+v.slice(old.length);
      });
    }
  }

  async function bootstrap(){
    const sameOrigin=location.origin.replace(/\/$/,'');
    const candidates=[];
    if(configuredBase)candidates.push(configuredBase.replace(/\/$/,''));
    if(!candidates.length)candidates.push(sameOrigin);
    let payload=null,usedBase='';
    for(const base of candidates){
      try{
        const r=await originalFetch(base+'/api/public/brand/bootstrap',{headers:{'X-Brand-Domain':host},cache:'no-store'});
        const j=await r.json();
        if(r.ok&&j&&j.status!=='error'&&j.data){payload=j.data;usedBase=base;break;}
      }catch(ignore){}
    }
    if(!payload)return null;
    window.NAGA_BRAND.data=payload;
    document.documentElement.dataset.brandId=String(payload.id||1);
    document.documentElement.dataset.brandCode=String(payload.code||'');
    // All brands use the central API. Brand identity is carried by X-Brand-Domain/Origin.
    rewriteApiBase(payload.apiBaseUrl||configuredBase||usedBase);
    if(payload.name)document.title=document.title.replace(/TitanX Gaming|TitanX/gi,payload.name);
    window.dispatchEvent(new CustomEvent('naga:brand-ready',{detail:payload}));
    return payload;
  }
  window.NAGA_BRAND.ready=bootstrap();
})();
