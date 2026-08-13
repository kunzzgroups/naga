(function(){
  'use strict';

  var SETTINGS_CACHE_KEY='naga.animation.settings.v5';
  var SETTINGS_CACHE_TTL=60000;
  var CUSTOM_CODE_CACHE_KEY='naga.animation.custom.registry.v3';
  var CUSTOM_CODE_CACHE_TTL=60000;
  var deviceMemory=Number(navigator.deviceMemory||0),cpuCount=Number(navigator.hardwareConcurrency||0);
  var MAX_ACTIVE_ANIMATIONS=(deviceMemory&&deviceMemory<=4)||(cpuCount&&cpuCount<=4)?10:16;
  var settings=[];
  var customEffects=Object.create(null);
  var registryEffectNames=new Set();
  var managed=new Set();
  var visible=new Set();
  var active=new Set();
  var pendingRoots=new Set();
  var rafId=0;
  var idleScanId=0;
  var scopedObservers=[];
  var elementQueue=[];
  var queuedElements=new Set();
  var elementWorkId=0;
  var engineActivated=false;
  var ruleBuckets={CATEGORY:[],PROVIDER:[],GAME:[],SITE_ASSET:[]};
  var lastCustomJs='';
  var customJsGeneration=0;
  var customLoadPromise=null;

  var baseClasses=[
    'naga-effect-managed','naga-effect-none','naga-effect-float','naga-effect-glow','naga-effect-pulse',
    'naga-effect-bounce','naga-effect-shake','naga-effect-sway','naga-effect-zoom','naga-effect-float-glow',
    'naga-effect-speed-slow','naga-effect-speed-normal','naga-effect-speed-fast',
    'naga-effect-intensity-low','naga-effect-intensity-medium','naga-effect-intensity-high',
    'naga-effect-paused'
  ];

  function norm(v){return String(v||'').trim().toUpperCase()}
  function slug(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')}
  function endpoint(){var base=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';return String(base).replace(/\/$/,'')+'/api/public/animation-settings'}
  function earlyApiPromise(url){
    try{
      var store=window.__NAGA_EARLY_API__;
      if(!store)return null;
      var key=new URL(url,location.href).toString();
      return store[key]&&typeof store[key].then==='function'?store[key]:null;
    }catch(_e){return null}
  }
  function fetchJsonFresh(url,timeoutMs){
    var controller=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=controller?setTimeout(function(){try{controller.abort()}catch(_e){}},timeoutMs||1800):0;
    return fetch(url,{cache:'no-store',credentials:'same-origin',signal:controller?controller.signal:undefined})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .finally(function(){if(timer)clearTimeout(timer)});
  }
  var SITE_FILE_TO_FIELD={
    'logo.png':'logoUrl','logo.jpg':'logoUrl','logo.jpeg':'logoUrl','logo.webp':'logoUrl','logo.gif':'logoUrl',
    'referral.png':'referralUrl','share.png':'shareUrl','downline.png':'downlineUrl','copylink.png':'copylinkUrl',
    'login.png':'loginUrl','login.jpg':'loginUrl','login.jpeg':'loginUrl','login.webp':'loginUrl','login.gif':'loginUrl',
    'register.png':'registerUrl','register.jpg':'registerUrl','register.jpeg':'registerUrl','register.webp':'registerUrl','register.gif':'registerUrl',
    'deposit.png':'depositUrl','withdraw.png':'withdrawUrl','refresh.png':'refreshUrl','home.png':'homeUrl','history.png':'historyUrl',
    'bonus.png':'bonusUrl','livechat.png':'livechatUrl','setting.png':'settingUrl',
    'provider-all.png':'providerAllUrl','provider-all.jpg':'providerAllUrl','provider-all.jpeg':'providerAllUrl','provider-all.webp':'providerAllUrl','provider-all.gif':'providerAllUrl'
  };
  function fileName(url){var clean=String(url||'').split('?')[0].split('#')[0].replace(/\\/g,'/');return clean.substring(clean.lastIndexOf('/')+1).toLowerCase()}
  function siteAssetField(el){
    if(!el||!el.getAttribute)return '';
    var explicit=el.getAttribute('data-naga-site-asset')||el.getAttribute('data-custom-asset-src-field');
    if(explicit)return explicit;
    if(el.tagName==='IMG'||el.tagName==='INPUT'){var raw=String(el.getAttribute('data-default-custom-src')||el.getAttribute('src')||'');if(raw.indexOf('assets/custom/images/')===-1)return '';return SITE_FILE_TO_FIELD[fileName(raw)]||'';}
    return '';
  }
  function appliesTo(el){if(el.matches('.cat'))return 'CATEGORY';if(el.matches('.provider-rail-card,.category-provider-card'))return 'PROVIDER';if(el.matches('.game-card'))return 'GAME';if(siteAssetField(el))return 'SITE_ASSET';return ''}
  function categoryIds(el){var raw=String(el.dataset.categoryIds||el.dataset.categoryId||el.dataset.id||'');return raw.split(',').map(function(v){return v.trim()}).filter(Boolean)}
  function match(rule,el,type){if(norm(rule.applyTo)!==type)return false;var scope=norm(rule.scopeType);if(scope==='GLOBAL')return true;if(scope==='ASSET')return norm(siteAssetField(el))===norm(rule.targetCode);if(scope==='CATEGORY')return categoryIds(el).indexOf(String(rule.targetId))>=0;if(scope==='PROVIDER')return norm(el.dataset.providerCode)===norm(rule.targetCode);if(scope==='GAME')return String(el.dataset.gameId||'')===String(rule.targetId||'');return false}
  function priority(rule){var s=norm(rule.scopeType);return s==='GAME'?40:s==='PROVIDER'?30:s==='CATEGORY'?20:s==='ASSET'?20:10}
  function isRuleEnabled(v){if(v===true||v===1||v==='1')return true;var n=norm(v);return !(n===''||n==='0'||n==='FALSE'||n==='OFF'||n==='DISABLED'||n==='NO')}
  function rebuildRuleBuckets(){
    ruleBuckets={CATEGORY:[],PROVIDER:[],GAME:[],SITE_ASSET:[]};
    settings.forEach(function(r){
      if(!isRuleEnabled(r&&r.enabled))return;
      var type=norm(r&&r.applyTo);
      if(ruleBuckets[type])ruleBuckets[type].push(r);
    });
    Object.keys(ruleBuckets).forEach(function(type){
      ruleBuckets[type].sort(function(a,b){return priority(b)-priority(a)||(Number(b.sortOrder||0)-Number(a.sortOrder||0))||(Number(b.id||0)-Number(a.id||0))});
    });
  }
  function best(el){
    var type=appliesTo(el);if(!type)return null;
    var bucket=ruleBuckets[type]||[];
    for(var i=0;i<bucket.length;i++){if(match(bucket[i],el,type))return bucket[i];}
    return null;
  }

  function customTypeName(animationType){
    var t=norm(animationType);
    return t.indexOf('CUSTOM_')===0?t.substring(7):'';
  }


  function builtInAnimationValue(type){
    var duration='var(--naga-effect-duration)';
    switch(norm(type)){
      case 'FLOAT': return 'nagaCfgFloat '+duration+' ease-in-out infinite';
      case 'GLOW': return 'nagaCfgGlow '+duration+' ease-in-out infinite';
      case 'PULSE': return 'nagaCfgPulse '+duration+' ease-in-out infinite';
      case 'BOUNCE': return 'nagaCfgBounce '+duration+' cubic-bezier(.28,.84,.42,1) infinite';
      case 'SHAKE': return 'nagaCfgShake '+duration+' ease-in-out infinite';
      case 'SWAY': return 'nagaCfgSway '+duration+' ease-in-out infinite';
      case 'ZOOM': return 'nagaCfgZoom '+duration+' ease-in-out infinite';
      case 'FLOAT_GLOW': return 'nagaCfgFloatGlow '+duration+' ease-in-out infinite';
      case 'NONE': return 'none';
      default: return '';
    }
  }

  function customEffectsEndpoint(){
    var base=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';
    return String(base).replace(/\/$/,'')+'/api/public/custom-animation-effects';
  }

  function readCustomCodeCache(){
    try{
      var cached=JSON.parse(sessionStorage.getItem(CUSTOM_CODE_CACHE_KEY)||'null');
      if(cached&&Array.isArray(cached.data)&&Date.now()-Number(cached.at||0)<CUSTOM_CODE_CACHE_TTL)return cached.data;
    }catch(_e){}
    return null;
  }

  function saveCustomCodeCache(data){
    try{sessionStorage.setItem(CUSTOM_CODE_CACHE_KEY,JSON.stringify({at:Date.now(),data:Array.isArray(data)?data:[]}))}catch(_e){}
  }

  function applyCustomCode(rows){
    rows=Array.isArray(rows)?rows:[];
    registryEffectNames.forEach(function(name){
      var oldConfig=customEffects[name];
      if(oldConfig&&typeof oldConfig.onRemove==='function'){
        managed.forEach(function(el){if(el.dataset.animationCustomType===name){try{oldConfig.onRemove(el)}catch(_e){}}});
      }
      delete customEffects[name];
    });
    registryEffectNames.clear();
    var cssParts=[],jsParts=[];
    rows.forEach(function(row){
      var name=norm(row&&row.effectName);
      if(!name)return;
      var css=String(row.cssCode||'').trim();
      var js=String(row.jsCode||'').trim();
      if(css)cssParts.push('/* BO custom effect: '+name+' */\n'+css);
      if(js)jsParts.push('try{\n'+js+'\n}catch(e){console.warn("Custom animation '+name+' failed",e)}');
      if(!customEffects[name])customEffects[name]={className:'naga-custom-effect-'+slug(name),animation:'',onApply:null,onRemove:null};
      registryEffectNames.add(name);
    });
    var cssAll=cssParts.join('\n\n');
    var jsAll=jsParts.join('\n\n');
    var style=document.getElementById('naga-bo-animation-custom-css');
    if(cssAll){
      if(!style){style=document.createElement('style');style.id='naga-bo-animation-custom-css';document.head.appendChild(style)}
      if(style.textContent!==cssAll)style.textContent=cssAll;
    }else if(style){style.remove()}

    if(jsAll!==lastCustomJs){
      var generation=++customJsGeneration;
      var old=document.getElementById('naga-bo-animation-custom-js');
      if(old)old.remove();
      lastCustomJs=jsAll;
      var runJs=function(){
        if(generation!==customJsGeneration)return;
        if(jsAll){
          var script=document.createElement('script');
          script.id='naga-bo-animation-custom-js';
          script.textContent=jsAll+'\n//# sourceURL=bo-custom-animation-registry.js';
          (document.body||document.documentElement).appendChild(script);
        }
        managed.forEach(function(el){enqueueElement(el)});
        document.dispatchEvent(new CustomEvent('naga:animation-custom-code-applied'));
      };
      if(window.requestIdleCallback)requestIdleCallback(runJs,{timeout:500});else setTimeout(runJs,0);
    }else{
      managed.forEach(function(el){enqueueElement(el)});
      document.dispatchEvent(new CustomEvent('naga:animation-custom-code-applied'));
    }
  }

  function loadCustomCode(force){
    var cached=readCustomCodeCache();
    // Custom definitions are requested only when a CUSTOM_* rule is enabled.
    // Revalidate them once per page load so BO edits are visible immediately;
    // the session copy is fallback-only and never causes an old effect to flash first.
    return fetchJsonFresh(customEffectsEndpoint(),1800)
      .then(function(j){var data=Array.isArray(j&&j.data)?j.data:[];saveCustomCodeCache(data);if(hasEnabledCustomRules())applyCustomCode(data);return data})
      .catch(function(){var data=cached||[];if(hasEnabledCustomRules())applyCustomCode(data);return data});
  }

  function clean(el){
    if(!el||!el.classList)return;
    baseClasses.forEach(function(c){el.classList.remove(c)});
    Array.from(el.classList).forEach(function(c){if(c.indexOf('naga-custom-effect-')===0)el.classList.remove(c)});
    var previous=el.dataset.animationCustomType;
    if(previous&&customEffects[previous]&&typeof customEffects[previous].onRemove==='function'){
      try{customEffects[previous].onRemove(el)}catch(_e){}
    }
    delete el.dataset.animationCustomType;
    if(el.dataset.nagaManagedInlineAnimation==='1'){el.style.removeProperty('animation');delete el.dataset.nagaManagedInlineAnimation;}
    // Built-in category effects are rendered on the visible category icon (not
    // the button wrapper) so they cannot be cancelled by legacy child rules.
    // Always clean the child inline override when a BO rule changes/deletes.
    if(el.classList.contains('cat')){
      el.style.removeProperty('--naga-category-animation');
      var managedIcon=el.querySelector('.cat-icon');
      if(managedIcon&&managedIcon.dataset.nagaManagedInlineAnimation==='1'){
        managedIcon.style.removeProperty('animation');
        managedIcon.style.removeProperty('animation-name');
        delete managedIcon.dataset.nagaManagedInlineAnimation;
      }
    }
    delete el.dataset.animationRuleId;
    managed.delete(el);
    visible.delete(el);
    active.delete(el);
    try{visibilityObserver.unobserve(el)}catch(_e){}
  }

  function rebalance(){
    active.forEach(function(el){el.classList.add('naga-effect-paused')});
    active.clear();
    if(document.hidden)return;
    var count=0;
    visible.forEach(function(el){
      if(count>=MAX_ACTIVE_ANIMATIONS||!managed.has(el))return;
      el.classList.remove('naga-effect-paused');
      active.add(el);
      count++;
    });
  }

  var visibilityObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting&&entry.intersectionRatio>0)visible.add(entry.target);else visible.delete(entry.target);
    });
    rebalance();
  },{root:null,rootMargin:'80px 0px',threshold:0.01});

  function apply(el){
    if(!el||!el.matches)return;
    clean(el);
    var rule=best(el);
    if(!rule)return;
    var rawType=norm(rule.animationType||'NONE');
    var speed=norm(rule.speed||'NORMAL').toLowerCase();
    var intensity=norm(rule.intensity||'MEDIUM').toLowerCase();
    var isCategory=el.classList.contains('cat');
    // Category buttons are only a tiny fixed set (normally 5). Apply their BO
    // effect immediately and never put them through the viewport animation budget.
    // This avoids the visible bug where a freshly loaded CATEGORY rule had the
    // right class/inline animation but was still paused waiting for IntersectionObserver.
    el.classList.add('naga-effect-managed','naga-effect-speed-'+speed,'naga-effect-intensity-'+intensity);
    if(!isCategory)el.classList.add('naga-effect-paused');

    var customName=customTypeName(rawType);
    if(customName){
      var key=norm(customName);
      var config=customEffects[key];
      var cssName=(config&&config.className)?config.className:'naga-custom-effect-'+slug(customName);
      if(cssName)el.classList.add(cssName);
      el.dataset.animationCustomType=key;
      if(config&&typeof config.onApply==='function'){
        try{config.onApply(el,rule)}catch(_e){}
      }
      // For category buttons, legacy Naga CSS contains !important animation rules.
      // A custom effect can guarantee BO precedence by defining --naga-custom-animation
      // in its CSS, or by supplying `animation` in NAGA_ANIMATION_EFFECTS.register().
      var customAnimation=(config&&config.animation)||'';
      if(!customAnimation){
        try{customAnimation=getComputedStyle(el).getPropertyValue('--naga-custom-animation').trim()}catch(_e){}
      }
      if(customAnimation){
        if(isCategory){
          // CATEGORY is special: only the currently active category is allowed to
          // animate. Store the BO-selected animation as a CSS variable; CSS applies
          // it to .cat.active .cat-icon only. Inactive category icons stay still.
          el.style.setProperty('--naga-category-animation',customAnimation);
          el.style.setProperty('animation','none','important');
          el.dataset.nagaManagedInlineAnimation='1';
        }else{
          el.style.setProperty('animation',customAnimation,'important');
          el.dataset.nagaManagedInlineAnimation='1';
        }
      }
    }else{
      el.classList.add('naga-effect-'+rawType.toLowerCase().replace(/_/g,'-'));
      var managedAnimation=builtInAnimationValue(rawType);
      if(managedAnimation){
        // Category visuals live in .cat-icon. Animate that visible image directly
        // and keep the wrapper stable. This avoids the old legacy .cat-icon
        // `animation:none/activeCatImagePulse !important` rules cancelling the BO
        // effect, while NONE still suppresses everything deterministically.
        if(isCategory){
          // Preserve the original Naga UX: only the ACTIVE category animates.
          // Every category still receives the BO rule metadata, but the selected
          // animation is exposed through a variable and CSS applies it exclusively
          // to .cat.active .cat-icon. This avoids animating all category buttons.
          el.style.setProperty('--naga-category-animation',managedAnimation);
          el.style.setProperty('animation','none','important');
          el.dataset.nagaManagedInlineAnimation='1';
        }else{
          // Inline !important wins normal frontend declarations; stylesheet rules
          // that previously hard-disabled Site Customize image transforms are now
          // scoped to non-managed images in style.css.
          el.style.setProperty('animation',managedAnimation,'important');
          el.dataset.nagaManagedInlineAnimation='1';
        }
      }
    }

    el.dataset.animationRuleId=String(rule.id||'');
    managed.add(el);
    if(isCategory){
      // CATEGORY rules must be visible immediately on first paint after BO settings
      // resolve. There are only a handful of categories, so keeping them outside
      // the active-animation budget is both deterministic and negligible for CPU/GPU.
      el.classList.remove('naga-effect-paused');
    }else{
      visibilityObserver.observe(el);
    }
  }

  function activeSelector(){
    var parts=[];
    if(ruleBuckets.CATEGORY.length)parts.push('.cat');
    if(ruleBuckets.PROVIDER.length)parts.push('.provider-rail-card','.category-provider-card');
    if(ruleBuckets.GAME.length)parts.push('.game-card');
    if(ruleBuckets.SITE_ASSET.length)parts.push('img[data-custom-asset-src-field]','img[data-naga-site-asset]','img[src*="assets/custom/images/"]','input[type="image"][src*="assets/custom/images/"]');
    return parts.join(',');
  }
  function scheduleElementWork(){
    if(elementWorkId||!elementQueue.length)return;
    var run=function(deadline){
      elementWorkId=0;
      var processed=0;
      var canContinue=function(){
        if(processed>=12)return false;
        return !deadline||typeof deadline.timeRemaining!=='function'||deadline.timeRemaining()>2||deadline.didTimeout;
      };
      while(elementQueue.length&&canContinue()){
        var el=elementQueue.shift();queuedElements.delete(el);
        if(el&&el.isConnected)apply(el);
        processed++;
      }
      if(elementQueue.length)scheduleElementWork();
    };
    if(window.requestIdleCallback)elementWorkId=requestIdleCallback(run,{timeout:180});
    else elementWorkId=setTimeout(function(){run(null)},24);
  }
  function enqueueElement(el){
    if(!el||!el.matches||queuedElements.has(el))return;
    queuedElements.add(el);elementQueue.push(el);scheduleElementWork();
  }
  function scanRoot(root){
    if(!engineActivated||!settings.length||!root||root.nodeType!==1&&root!==document)return;
    var selector=activeSelector();
    if(!selector)return;
    if(root!==document&&root.matches&&root.matches(selector))enqueueElement(root);
    if(root.querySelectorAll){
      var nodes=root.querySelectorAll(selector);
      for(var i=0;i<nodes.length;i++)enqueueElement(nodes[i]);
    }
  }

  function flushPending(){
    rafId=0;
    if(idleScanId)return;
    var run=function(deadline){
      idleScanId=0;
      var roots=Array.from(pendingRoots);pendingRoots.clear();
      // Deliberately keep this linear. Older code compared every root with every
      // other root; a render of hundreds of game cards could therefore create an
      // O(n^2) main-thread spike during refresh. Scoped observers now queue only
      // the changed container, so de-duplication by Set is enough.
      for(var i=0;i<roots.length;i++){
        scanRoot(roots[i]);
        if(deadline&&deadline.timeRemaining&&deadline.timeRemaining()<2&&!deadline.didTimeout){
          for(var j=i+1;j<roots.length;j++)pendingRoots.add(roots[j]);
          if(pendingRoots.size){if(!rafId)rafId=requestAnimationFrame(flushPending);}
          break;
        }
      }
    };
    if(window.requestIdleCallback){idleScanId=requestIdleCallback(run,{timeout:250});}
    else{idleScanId=setTimeout(function(){run(null)},24);}
  }

  function queueRoot(root){
    if(!engineActivated||!settings.length||!root||root.nodeType!==1)return;
    pendingRoots.add(root);
    if(!rafId)rafId=requestAnimationFrame(flushPending);
  }

  function readCached(){
    try{
      var cached=JSON.parse(sessionStorage.getItem(SETTINGS_CACHE_KEY)||'null');
      if(cached&&Array.isArray(cached.data)&&Date.now()-Number(cached.at||0)<SETTINGS_CACHE_TTL)return cached.data;
    }catch(_e){}
    return null;
  }

  function saveCached(data){try{sessionStorage.setItem(SETTINGS_CACHE_KEY,JSON.stringify({at:Date.now(),data:data}))}catch(_e){}}

  function hasEnabledCustomRules(){return settings.some(function(r){return isRuleEnabled(r.enabled)&&norm(r.animationType).indexOf('CUSTOM_')===0})}

  function ensureCustomCode(){
    if(!hasEnabledCustomRules()){applyCustomCode([]);customLoadPromise=null;return Promise.resolve([])}
    if(customLoadPromise)return customLoadPromise;
    customLoadPromise=loadCustomCode().finally(function(){customLoadPromise=null});
    return customLoadPromise;
  }

  function installSettings(data){
    settings=Array.isArray(data)?data:[];
    rebuildRuleBuckets();
    // Never block lobby startup with a full DOM scan. Existing managed nodes are
    // refreshed only after the lobby has rendered and the browser gets idle time.
    if(engineActivated){queueRoot(document.documentElement);ensureCustomCode();}
  }

  function load(force){
    var cached=readCached();
    var url=endpoint();
    var early=!force?earlyApiPromise(url):null;
    var request=early||fetchJsonFresh(url,1800);
    return request
      .then(function(j){var data=Array.isArray(j&&j.data)?j.data:[];saveCached(data);installSettings(data);return data})
      .catch(function(){
        // Cache is recovery only. It never skips the fresh BO request, so a refresh
        // after Save Rule always sees the newest animation setting when API is healthy.
        var data=cached||[];installSettings(data);return data;
      });
  }

  function releaseAnimationPreflight(){
    document.documentElement.classList.remove('naga-animation-preflight');
  }
  function applyCategoryPreflightNow(){
    var cats=document.querySelectorAll('.cat');
    if(!cats.length)return false;
    // There are only a handful of category buttons. Apply them synchronously once
    // so legacy animation never flashes before the BO rule (including NONE) wins.
    for(var i=0;i<cats.length;i++)apply(cats[i]);
    releaseAnimationPreflight();
    return true;
  }

  function disconnectScopedObservers(){
    scopedObservers.forEach(function(o){try{o.disconnect()}catch(_e){}});
    scopedObservers=[];
  }

  function observeContainer(el){
    if(!el||!window.MutationObserver)return;
    var obs=new MutationObserver(function(mutations){
      // Queue mutation.target only once. Never queue every added child.
      if(el.id==='categoryRow'&&document.documentElement.classList.contains('naga-animation-preflight')){
        applyCategoryPreflightNow();
      }
      var targets=new Set();
      mutations.forEach(function(m){if(m&&m.target&&m.target.nodeType===1)targets.add(m.target)});
      targets.forEach(queueRoot);
    });
    obs.observe(el,{childList:true,subtree:true});
    scopedObservers.push(obs);
  }

  function installScopedObservers(){
    disconnectScopedObservers();
    // Only the two lobby containers that actually create categories/providers/games
    // are observed. We intentionally do NOT observe documentElement/body.
    observeContainer(document.getElementById('categoryRow'));
    observeContainer(document.getElementById('gameGrid'));
  }

  function register(name,options){
    var key=norm(name);
    if(!key)return false;
    options=options||{};
    customEffects[key]={
      className:options.className||('naga-custom-effect-'+slug(key)),
      animation:typeof options.animation==='string'?options.animation.trim():'',
      onApply:typeof options.onApply==='function'?options.onApply:null,
      onRemove:typeof options.onRemove==='function'?options.onRemove:null
    };
    // Refresh only elements already using this custom effect, in small idle chunks.
    managed.forEach(function(el){if(el.dataset.animationCustomType===key)enqueueElement(el)});
    return true;
  }

  function applyImmediateSmallTargets(){
    // CATEGORY and SITE_ASSET are tiny UI sets. Apply them synchronously as soon as
    // the fresh BO settings resolve so there is no visible multi-second delay.
    // Provider/game cards stay on the idle/chunked path for performance.
    if(ruleBuckets.CATEGORY.length)applyCategoryPreflightNow();
    if(ruleBuckets.SITE_ASSET.length){
      var selector='img[data-custom-asset-src-field],img[data-naga-site-asset],img[src*="assets/custom/images/"],input[type="image"][src*="assets/custom/images/"]';
      var nodes=document.querySelectorAll(selector);
      var limit=Math.min(nodes.length,64);
      for(var i=0;i<limit;i++)apply(nodes[i]);
    }
  }

  function activateEngine(){
    if(engineActivated)return;
    engineActivated=true;
    installScopedObservers();
    ensureCustomCode();
    // Small, user-visible targets are immediate. If categories are not rendered yet,
    // the scoped #categoryRow observer applies them synchronously when they appear.
    applyImmediateSmallTargets();
    if(document.documentElement.classList.contains('naga-animation-preflight')){
      // Keep the first-frame guard only briefly if category DOM has not appeared yet.
      // This timer is a safety release, not an activation delay.
      setTimeout(releaseAnimationPreflight,700);
    }
    // Provider/game cards remain idle + chunked and viewport-limited.
    queueRoot(document.documentElement);
    document.dispatchEvent(new CustomEvent('naga:animation-engine-ready'));
  }

  function start(){
    document.addEventListener('visibilitychange',rebalance);
    document.addEventListener('naga:custom-assets-ready',function(){if(ruleBuckets.SITE_ASSET.length&&engineActivated)applyImmediateSmallTargets()});
    document.addEventListener('naga:layout-sections-loaded',function(){if(ruleBuckets.SITE_ASSET.length&&engineActivated)applyImmediateSmallTargets()});
    document.addEventListener('naga:layout-section-applied',function(){if(ruleBuckets.SITE_ASSET.length&&engineActivated)applyImmediateSmallTargets()});
    document.addEventListener('i18n:changed',function(){if(ruleBuckets.SITE_ASSET.length&&engineActivated)applyImmediateSmallTargets()});

    // A fresh settings request is already started in <head>. Do NOT wait for
    // naga:lobby-ready or requestIdleCallback here: that old gate was the cause of
    // the ~3.5-5s animation delay after refresh. Activation itself is tiny; heavy
    // provider/game work remains deferred and chunked.
    var settingsReady=load(false);
    settingsReady.finally(function(){
      activateEngine();
    });
  }

  window.NAGA_ANIMATION_EFFECTS={
    reload:function(){try{sessionStorage.removeItem(SETTINGS_CACHE_KEY)}catch(_e){}return load(true)},
    applyAll:function(root){scanRoot(root||document)},
    register:register,
    getSettings:function(){return settings.slice()},
    reloadCustomCode:function(){try{sessionStorage.removeItem(CUSTOM_CODE_CACHE_KEY)}catch(_e){}return loadCustomCode(true)},
    performance:{maxActiveAnimations:MAX_ACTIVE_ANIMATIONS,cacheTtlMs:SETTINGS_CACHE_TTL}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
