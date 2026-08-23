(function(){
  'use strict';
  var API=(window.NAGA_API&&window.NAGA_API.publicLeaderboard)||
    (((window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'').replace(/\/+$/,'')+'/api/public/leaderboard');
  var CATALOG_API=(window.NAGA_API&&window.NAGA_API.publicGameCatalog)||
    (((window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'').replace(/\/+$/,'')+'/api/public/game-catalog');
  var tbody=document.getElementById('leaderboardBody');
  var status=document.getElementById('leaderboardStatus');
  var refreshBtn=document.getElementById('leaderboardRefresh');
  var period='today';
  var requestId=0;
  var gameNameByCode=new Map();
  var catalogPromise=null;

  function t(key,fallback){
    try{var v=window.I18N&&window.I18N.t&&window.I18N.t(key);return v&&v!==key?v:fallback}catch(_e){return fallback}
  }
  function money(v,currency){
    var n=Number(v||0);return (currency||'MYR')+' '+(Number.isFinite(n)?n:0).toFixed(2);
  }
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
  }
  function normalizeKey(v){
    return String(v==null?'':v).trim().toUpperCase();
  }
  function currentLang(){
    return (window.I18N&&window.I18N.current)||localStorage.getItem('site_lang')||localStorage.getItem('lang')||document.documentElement.lang||'en';
  }
  function translatedName(item){
    if(!item||typeof item!=='object')return '';
    var lang=String(currentLang()||'en').toLowerCase();
    var shortLang=lang.split('-')[0];
    var translations=item.translations&&typeof item.translations==='object'?item.translations:null;
    var tr=translations&&(translations[lang]||translations[shortLang]);
    return String((tr&&(tr.name||tr.title))||item.gameName||item.game_name||item.name||item.title||'').trim();
  }
  function gameCodes(item){
    if(!item||typeof item!=='object')return [];
    return [item.gameCode,item.game_code,item.providerGameCode,item.provider_game_code,item.launchCode,item.launch_code,item.code,item.id]
      .map(normalizeKey).filter(Boolean);
  }
  function buildGameNameMap(payload){
    var data=payload&&payload.data&&typeof payload.data==='object'?payload.data:payload;
    var games=data&&Array.isArray(data.games)?data.games:[];
    gameNameByCode=new Map();
    games.forEach(function(game){
      var name=translatedName(game);
      if(!name)return;
      gameCodes(game).forEach(function(code){if(!gameNameByCode.has(code))gameNameByCode.set(code,name)});
    });
  }
  function loadGameCatalog(force){
    if(catalogPromise&&!force)return catalogPromise;
    var url=CATALOG_API+'?lang='+encodeURIComponent(currentLang());
    catalogPromise=fetch(url,{headers:{Accept:'application/json'},cache:force?'no-store':'default'})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(function(j){buildGameNameMap(j);return gameNameByCode})
      .catch(function(){gameNameByCode=new Map();return gameNameByCode})
      .finally(function(){catalogPromise=null});
    return catalogPromise;
  }
  function displayGameName(record){
    var direct=record&&(record.gameName||record.game_name||record.displayGameName||record.display_game_name);
    if(direct&&String(direct).trim())return String(direct).trim();
    var raw=record&&(record.game||record.gameCode||record.game_code);
    var key=normalizeKey(raw);
    return (key&&gameNameByCode.get(key))||String(raw||record&&record.provider||'-');
  }
  function setBusy(on){
    if(refreshBtn)refreshBtn.disabled=on;
    if(on&&status){status.hidden=false;status.className='leaderboard-loading';status.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'+esc(t('leaderboard_loading','Loading leaderboard...'))}
  }
  function render(data){
    var records=Array.isArray(data.records)?data.records:[];
    var currency=data.currency||'MYR';
    if(!records.length){
      tbody.innerHTML='';
      status.hidden=false;status.className='leaderboard-empty';status.textContent=t('leaderboard_empty','No qualifying casino records for this period.');
    }else{
      status.hidden=true;
      tbody.innerHTML=records.map(function(r){
        var rank=Number(r.rank||0);
        return '<tr>'+ 
          '<td><span class="leaderboard-rank '+(rank<=3?'top-'+rank:'')+'">'+rank+'</span></td>'+ 
          '<td>'+esc(r.player||'******')+'</td>'+ 
          '<td>'+esc(displayGameName(r))+'</td>'+ 
          '<td class="leaderboard-money">'+esc(money(r.bet,currency))+'</td>'+ 
          '<td class="leaderboard-money">'+esc(money(r.win,currency))+'</td>'+ 
          '<td class="leaderboard-ratio">'+Number(r.payoutRatio||0).toFixed(2)+'</td>'+ 
          '</tr>';
      }).join('');
    }
  }

  function load(forceCatalog){
    var id=++requestId;
    setBusy(true);
    var url=API+'?period='+encodeURIComponent(period)+'&limit=50';
    Promise.all([
      fetch(url,{headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}),
      loadGameCatalog(!!forceCatalog)
    ])
      .then(function(results){
        if(id!==requestId)return;
        var j=results[0];
        if(!j||j.status==='error')throw new Error((j&&j.message)||'Unable to load leaderboard');
        render(j.data||{});
      })
      .catch(function(){
        if(id!==requestId)return;
        tbody.innerHTML='';
        status.hidden=false;status.className='leaderboard-empty';status.textContent=t('leaderboard_error','Unable to load leaderboard. Please try again.');
      })
      .finally(function(){if(id===requestId)setBusy(false)});
  }

  document.querySelectorAll('[data-leaderboard-period]').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('[data-leaderboard-period]').forEach(function(x){x.classList.remove('active')});
      btn.classList.add('active');period=btn.getAttribute('data-leaderboard-period')||'today';load(false);
    });
  });
  refreshBtn&&refreshBtn.addEventListener('click',function(){load(true)});
  document.addEventListener('i18n:changed',function(){load(true)});
  load(false);
})();
