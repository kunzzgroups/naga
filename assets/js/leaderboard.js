(function(){
  'use strict';
  var API=(window.NAGA_API&&window.NAGA_API.publicLeaderboard)||
    (((window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'').replace(/\/+$/,'')+'/api/public/leaderboard');
  var tbody=document.getElementById('leaderboardBody');
  var gameSelect=document.getElementById('leaderboardGame');
  var status=document.getElementById('leaderboardStatus');
  var refreshBtn=document.getElementById('leaderboardRefresh');
  var period='today';
  var requestId=0;

  function t(key,fallback){
    try{var v=window.I18N&&window.I18N.t&&window.I18N.t(key);return v&&v!==key?v:fallback}catch(_e){return fallback}
  }
  function money(v,currency){
    var n=Number(v||0);return (currency||'MYR')+' '+(Number.isFinite(n)?n:0).toFixed(2);
  }
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
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
          '<td>'+esc(r.game||r.provider||'-')+'</td>'+
          '<td class="leaderboard-money">'+esc(money(r.bet,currency))+'</td>'+
          '<td class="leaderboard-money">'+esc(money(r.win,currency))+'</td>'+
          '<td class="leaderboard-ratio">'+Number(r.payoutRatio||0).toFixed(2)+'</td>'+
          '</tr>';
      }).join('');
    }
    var selected=String(data.game||'ALL');
    var games=Array.isArray(data.games)?data.games:[];
    var opts=['<option value="ALL">'+esc(t('leaderboard_all_game','All Game'))+'</option>'];
    games.forEach(function(g){opts.push('<option value="'+esc(g)+'">'+esc(g)+'</option>')});
    gameSelect.innerHTML=opts.join('');
    gameSelect.value=games.indexOf(selected)>=0?selected:'ALL';
  }

  function load(){
    var id=++requestId;
    setBusy(true);
    var game=gameSelect&&gameSelect.value?gameSelect.value:'ALL';
    var url=API+'?period='+encodeURIComponent(period)+'&game='+encodeURIComponent(game)+'&limit=50';
    fetch(url,{headers:{Accept:'application/json'}})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
      .then(function(j){
        if(id!==requestId)return;
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
      btn.classList.add('active');period=btn.getAttribute('data-leaderboard-period')||'today';load();
    });
  });
  gameSelect&&gameSelect.addEventListener('change',load);
  refreshBtn&&refreshBtn.addEventListener('click',load);
  document.addEventListener('i18n:changed',function(){load()});
  load();
})();