(function(){
  var levels=[], cards=[], index=0, state={experience:0,currentLevelIndex:0,nextRequiredExperience:0,progressPercent:0};
  var slider=document.getElementById('vipLevelSlider'), dotsWrap=document.getElementById('vipDots');
  var tabs=[].slice.call(document.querySelectorAll('[data-vip-tab]')), panels=[].slice.call(document.querySelectorAll('[data-vip-panel]'));
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function money(v){return 'MYR '+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
  function theme(x){return String(x.themeKey||x.levelKey||'bronze').toLowerCase()}
  function levelVisual(x,fallback){var url=String(x.imageUrl||'').trim();return url?'<img class="vip-level-image" src="'+esc(url)+'" alt="'+esc(x.name||'VIP')+'">':'<i class="'+esc(x.iconClass||fallback||'fa-solid fa-crown')+'"></i>'}
  function renderHero(){
    if(!slider)return; slider.innerHTML=levels.map(function(x,i){return '<article class="vip-level-card '+(i===index?'active':'')+'" data-level="'+esc(theme(x))+'" data-index="'+i+'"><div class="vip-orbit"><span></span><span></span><span></span></div><div class="vip-medal '+esc(theme(x))+'">'+levelVisual(x,'fa-solid fa-crown')+'</div><h2>'+esc(x.name)+'</h2><p>'+(i===state.currentLevelIndex?'Current Level':Number(x.requiredExperience||0).toLocaleString()+' EXP Required')+'</p></article>'}).join(''); cards=[].slice.call(slider.querySelectorAll('.vip-level-card'));
    if(dotsWrap)dotsWrap.innerHTML=levels.map(function(x,i){return '<button type="button" aria-label="Go to '+esc(x.name)+'" data-vip-dot="'+i+'" class="'+(i===index?'active':'')+'"></button>'}).join(''); position();
  }
  function renderLevelPanel(){
    var panel=document.querySelector('[data-vip-panel="level"]'); if(!panel||!levels.length)return; var current=levels[Math.min(state.currentLevelIndex,levels.length-1)], next=levels[state.currentLevelIndex+1];
    var remain=next?Math.max(0,Number(next.requiredExperience)-Number(state.experience)):0;
    function levelStatus(i){if(i<state.currentLevelIndex)return {cls:'unlocked',icon:'fa-solid fa-lock-open',text:'Unlocked'};if(i===state.currentLevelIndex)return {cls:'current',icon:'fa-solid fa-circle-check',text:'Current'};return {cls:'locked',icon:'fa-solid fa-lock',text:'Locked'}}
    panel.innerHTML='<div class="vip-progress-card"><div><b>'+esc(current.name)+'</b><span>'+(next?remain.toLocaleString()+' EXP until '+esc(next.name):'Maximum VIP level')+' <i class="fa-regular fa-circle-question"></i></span></div><button type="button" class="vip-status-current" disabled><i class="fa-solid fa-circle-check"></i> Current</button><div class="vip-progress-line"><span style="width:'+Number(state.progressPercent||0)+'%"></span></div></div><div class="vip-level-list">'+levels.map(function(x,i){var st=levelStatus(i);return '<article class="vip-reward-row '+(i===state.currentLevelIndex?'active ':'')+'vip-level-'+st.cls+'"><div class="vip-timeline-dot"></div><h3>'+esc(x.name)+'</h3><button class="vip-status-'+st.cls+'" disabled><i class="'+st.icon+'"></i> '+st.text+'</button><div class="vip-reward-box"><span class="vip-coin-stack">VIP</span><strong>'+money(x.oneTimeBonus)+'</strong></div></article>'}).join('')+'</div>';
  }
  function renderPerks(){var panel=document.querySelector('[data-vip-panel="perks"]');if(!panel)return;panel.innerHTML='<div class="vip-perk-grid">'+levels.map(function(x){return '<article><span class="vip-perk-icon">'+levelVisual(x,'fa-solid fa-gift')+'</span><b>'+esc(x.name)+' Benefits</b><span>Monthly '+money(x.monthlyBonus)+' · Birthday '+money(x.birthdayBonus)+' · Rebates: Live '+Number(x.rebateLiveCasino||0)+'%, Sports '+Number(x.rebateSportsbook||0)+'%, Slots '+Number(x.rebateSlots||0)+'%. Withdrawal '+Number(x.withdrawalFrequency||0)+' time(s), up to '+money(x.withdrawalAmount)+'. Weekly bonus '+money(x.weeklyBonus)+'. Deposit requirement '+money(x.depositRequirement)+'.</span></article>'}).join('')+'</div>'}
  function renderFaq(){var p=document.querySelector('[data-vip-panel="faq"]');if(!p)return;p.innerHTML='<div class="vip-faq-list"><details open><summary>How to upgrade VIP?</summary><p>Collect EXP from valid gameplay and activities. Your level is automatically calculated from the EXP requirement configured by the platform.</p></details><details><summary>What is the one-time bonus?</summary><p>The one-time upgrade bonus is the reward configured for reaching each VIP level.</p></details><details><summary>Can VIP rewards change?</summary><p>VIP levels, rebates, bonuses and withdrawal benefits can be updated by the platform.</p></details><section class="vip-exp-history"><div class="vip-exp-history-head"><b>My EXP History</b><span>Latest audited EXP changes</span></div><div id="vipExpHistoryRows"><div class="vip-exp-empty">Loading...</div></div></section><section class="vip-exp-history"><div class="vip-exp-history-head"><b>My VIP Rewards</b><span>Rebates and recurring rewards</span></div><div id="vipRewardHistoryRows"><div class="vip-exp-empty">Loading...</div></div></section></div>';loadExpHistory();loadRewardHistory()}
  function circularOffset(i){
    var total=levels.length, offset=i-index;
    if(total>1){
      var half=total/2;
      if(offset>half)offset-=total;
      if(offset<-half)offset+=total;
    }
    return offset;
  }
  function position(){
    cards.forEach(function(c,i){
      var offset=circularOffset(i);
      c.classList.remove('active','prev','next','far-prev','far-next');
      c.style.removeProperty('transform');
      c.style.removeProperty('opacity');
      c.style.removeProperty('z-index');
      c.setAttribute('aria-hidden',offset===0?'false':'true');
      if(offset===0)c.classList.add('active');
      else if(offset===-1)c.classList.add('prev');
      else if(offset===1)c.classList.add('next');
      else if(offset===-2)c.classList.add('far-prev');
      else if(offset===2)c.classList.add('far-next');
    });
    if(dotsWrap)[].slice.call(dotsWrap.children).forEach(function(d,i){d.classList.toggle('active',i===index)});
  }
  function setIndex(i){if(!levels.length)return;index=(i+levels.length)%levels.length;position()}
  function bind(){var prev=document.querySelector('.vip-prev'),next=document.querySelector('.vip-next');if(prev)prev.onclick=function(){setIndex(index-1)};if(next)next.onclick=function(){setIndex(index+1)};if(dotsWrap)dotsWrap.onclick=function(e){var b=e.target.closest('[data-vip-dot]');if(b)setIndex(Number(b.dataset.vipDot))};tabs.forEach(function(tab){tab.onclick=function(){var key=tab.dataset.vipTab;tabs.forEach(function(t){t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',t===tab?'true':'false')});panels.forEach(function(p){p.classList.toggle('active',p.dataset.vipPanel===key)})}});var startX=0;if(slider){slider.addEventListener('click',function(e){var card=e.target.closest('.vip-level-card');if(card&&!card.classList.contains('active'))setIndex(Number(card.dataset.index))});slider.addEventListener('touchstart',function(e){startX=e.touches[0].clientX},{passive:true});slider.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>40)setIndex(index+(dx<0?1:-1))},{passive:true})}}

  async function loadExpHistory(){var wrap=document.getElementById('vipExpHistoryRows');if(!wrap)return;try{var token=localStorage.getItem('member_token')||localStorage.getItem('token')||'';if(!token){wrap.innerHTML='<div class="vip-exp-empty">Log in to view your EXP history.</div>';return}var base=(window.NAGA_CONFIG&&NAGA_CONFIG.api&&NAGA_CONFIG.api.baseUrl)||'';var r=await fetch(base+'/api/player/vip/experience-logs?page=1&size=20',{headers:{'Authorization':'Bearer '+token}}),j=await r.json();var rows=j.data&&j.data.content||[];wrap.innerHTML=rows.length?rows.map(function(x){var n=Number(x.experienceChange||0);return '<div class="vip-exp-history-row"><span class="vip-exp-source">'+esc(String(x.sourceType||'EXP').replaceAll('_',' '))+'</span><div><b class="'+(n>=0?'positive':'negative')+'">'+(n>=0?'+':'')+n.toLocaleString()+' EXP</b><small>'+esc(x.remark||x.referenceId||'VIP experience update')+'</small></div><time>'+new Date(x.createdAt).toLocaleString()+'</time></div>'}).join(''):'<div class="vip-exp-empty">No EXP activity yet.</div>'}catch(e){wrap.innerHTML='<div class="vip-exp-empty">Unable to load EXP history.</div>'}}

  async function loadRewardHistory(){var wrap=document.getElementById('vipRewardHistoryRows');if(!wrap)return;try{var token=localStorage.getItem('member_token')||localStorage.getItem('token')||'';if(!token){wrap.innerHTML='<div class="vip-exp-empty">Log in to view your VIP rewards.</div>';return}var base=(window.NAGA_CONFIG&&NAGA_CONFIG.api&&NAGA_CONFIG.api.baseUrl)||'';var r=await fetch(base+'/api/player/vip/rewards?page=1&size=20',{headers:{'Authorization':'Bearer '+token}}),j=await r.json();var rows=j.data&&j.data.content||[];wrap.innerHTML=rows.length?rows.map(function(x){return '<div class="vip-exp-history-row"><span class="vip-exp-source">'+esc(String(x.rewardType||'REWARD').replaceAll('_',' '))+'</span><div><b class="positive">MYR '+Number(x.rewardAmount||0).toFixed(2)+'</b><small>'+esc(x.remark||x.periodKey||'VIP reward')+'</small></div><time>'+new Date(x.createdAt).toLocaleString()+'</time></div>'}).join(''):'<div class="vip-exp-empty">No VIP rewards yet.</div>'}catch(e){wrap.innerHTML='<div class="vip-exp-empty">Unable to load VIP rewards.</div>'}}
  async function load(){try{var token=localStorage.getItem('member_token')||localStorage.getItem('token')||'';var r=await fetch((window.NAGA_API&&NAGA_API.playerVip)||((window.NAGA_CONFIG.api.baseUrl||'')+'/api/player/vip'),{headers:token?{'Authorization':'Bearer '+token}:{}});var j=await r.json();if(!r.ok||j.status==='error'||!j.data)throw new Error(j.message||'VIP unavailable');levels=Array.isArray(j.data.levels)?j.data.levels:[];state=j.data;index=Math.min(Number(state.currentLevelIndex||0),Math.max(0,levels.length-1));renderHero();renderLevelPanel();renderPerks();renderFaq()}catch(e){console.error(e);var p=document.querySelector('[data-vip-panel="level"]');if(p)p.innerHTML='<div class="vip-progress-card"><div><b>VIP unavailable</b><span>Please refresh and try again.</span></div></div>'}}
  bind();load();
})();
