(function(){
  var overlay=document.getElementById('luckyOverlay');
  var panel=document.getElementById('luckyPanel');
  var boxes=document.querySelectorAll('.lucky-box');
  var closeBtn=document.getElementById('luckyClose');
  var amount=17.91;
  var spinButton=document.getElementById('spinButton');
  var spinWheel=document.getElementById('spinWheelImg');
  var spinPointer=document.getElementById('spinPointerImg');
  var recordAmount=document.getElementById('recordAmount');
  var spinCount=1;
  var toast=document.getElementById('spinResultToast');
  var spinning=false;
  var currentDeg=0;

  var boxRewards=[];
  function randomMoney(min,max){
    var v=min + Math.random()*(max-min);
    return Math.round(v*100)/100;
  }
  function formatMoneyLabel(v){ return 'MYR '+Number(v).toFixed(2); }
  function shuffleRewards(){
    // Option 2: every time the Lucky Bonus popup opens, create 4 different random box amounts.
    var used={};
    boxRewards=[];
    while(boxRewards.length<4){
      var v=randomMoney(1.00,17.99);
      var key=v.toFixed(2);
      if(used[key]) continue;
      used[key]=true;
      boxRewards.push({label:formatMoneyLabel(v), type:'amount', value:v});
    }
    return boxRewards.sort(function(){ return Math.random()-0.5; });
  }
  shuffleRewards();
  function applyBlindBoxReward(reward){
    if(!reward) return;
    var strong=document.querySelector('#luckyResult strong');
    if(strong) strong.textContent=reward.label;
    if(reward.type==='amount'){
      amount=reward.value;
      updateAmount();
    }else if(reward.type==='spin'){
      spinCount += reward.value;
      updateSpinCount();
    }else if(reward.type==='lucky'){
      amount += reward.value;
      updateAmount();
    }
  }
  // The pointer image's sharp V tip faces DOWN at 0deg.
  // We calculate the final rotation from the real sharp-tip angle, so the shown result
  // always matches where the visual pointer lands. Angle convention: 0=right, 90=down, 180=left, 270=up.
  var pointerTipOffsetDeg=90;
  function normalizeDeg(v){ return ((v%360)+360)%360; }
  function rotationForTip(tipDeg){ return normalizeDeg(tipDeg-pointerTipOffsetDeg); }
  var rewards=[
    {label:'1× Free Spin', tipDeg:270, type:'spin', addSpin:1},
    {label:'MYR 88.00', tipDeg:330, type:'amount', add:88},
    {label:'Cash Out', tipDeg:30, type:'cashout'},
    {label:'Lucky Bonus MYR 0.00 - 9.99', tipDeg:90, type:'lucky', add:1.28},
    {label:'2× Free Spin', tipDeg:150, type:'spin', addSpin:2},
    {label:'MYR 3.00', tipDeg:210, type:'amount', add:3}
  ];
  rewards.forEach(function(r){ r.targetDeg=rotationForTip(r.tipDeg); });

  if(overlay){
    setTimeout(function(){ overlay.classList.remove('loading'); }, 1150);
  }

  function money(v){ return 'MYR'+Number(v).toFixed(2); }
  function updateAmount(){
    var el=document.getElementById('treasureAmount');
    if(el) el.textContent=money(amount);
    if(recordAmount) recordAmount.textContent=money(amount);
    var target=18;
    var pct=Math.max(0, Math.min(99.9, (amount/target)*100));
    var bar=document.querySelector('.treasure-progress span');
    var pctEl=document.querySelector('.treasure-progress em');
    var note=document.querySelector('.cashout-note');
    if(bar) bar.style.width=pct.toFixed(1)+'%';
    if(pctEl) pctEl.textContent=pct.toFixed(1)+'%';
    if(note){
      var need=Math.max(0, target-amount);
      note.innerHTML='Only <b>MYR '+need.toFixed(2)+'</b> to cash out <strong>MYR 18.00</strong>';
    }
  }
  function updateSpinCount(){
    var pill=document.getElementById('spinCountPill');
    var top=document.getElementById('topSpinCount');
    var btnLabel=document.getElementById('spinButtonLabel');
    var text=spinCount+'×Spin';
    if(pill){ var b=pill.querySelector('b'); if(b) b.textContent=spinCount; }
    if(top) top.textContent=spinCount+'× Spin';
    if(btnLabel) btnLabel.textContent=text;
    if(spinButton){
      spinButton.setAttribute('aria-label', spinCount>0 ? ('Spin now, '+spinCount+' spin available') : 'No spin available');
      spinButton.disabled=spinCount<=0;
      spinButton.classList.toggle('disabled', spinCount<=0);
    }
  }
  function showToast(text){
    if(!toast) return;
    toast.textContent=text;
    toast.classList.add('show');
    setTimeout(function(){ toast.classList.remove('show'); }, 2200);
  }
  function showMain(){
    if(!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.add('spin-ready');
    updateAmount();
  }

  function revealBoxRewardLabels(selectedIndex){
    boxes.forEach(function(b,i){
      var reward=boxRewards[i] || boxRewards[0];

      // Remove the temporary flash image first. This prevents the selected box
      // from showing two treasure boxes on top of each other after it opens.
      b.querySelectorAll('.lucky-box-open-flash').forEach(function(f){ f.remove(); });

      var img=b.querySelector('img');
      if(img){
        img.src='assets/images/spin/lucky-box-open-reveal.png';
        img.alt=reward.label;
      }

      b.classList.add('revealed');
      b.classList.toggle('selected-result', i===selectedIndex);
      b.classList.remove('chosen');
      b.style.opacity = i===selectedIndex ? '1' : '.72';
      b.style.filter = i===selectedIndex ? 'none' : 'saturate(.9) brightness(.82)';

      var label=b.querySelector('.lucky-box-reward-label');
      if(!label){
        label=document.createElement('span');
        label.className='lucky-box-reward-label';
        b.appendChild(label);
      }
      label.textContent=reward.label;
      label.style.display='block';
      label.style.opacity='1';
    });
  }

  function openBox(btn){
    if(!panel || panel.classList.contains('opened') || panel.classList.contains('revealing')) return;
    var index=Array.prototype.indexOf.call(boxes, btn);
    var reward=boxRewards[index] || boxRewards[0];
    panel.classList.add('revealing');
    btn.classList.add('chosen');

    var fx=document.createElement('img');
    fx.className='lucky-box-open-flash';
    fx.src='assets/images/spin/lucky-box-open-flash.png';
    fx.alt='';
    fx.setAttribute('aria-hidden','true');
    btn.appendChild(fx);

    // First show all four opened treasure boxes with each random amount.
    setTimeout(function(){ revealBoxRewardLabels(index); }, 560);

    // Keep the four amount results visible a bit longer before switching to
    // the single selected-result screen.
    setTimeout(function(){
      applyBlindBoxReward(reward);
      panel.classList.add('opened');
      panel.classList.remove('revealing');
    }, 2600);
    setTimeout(showMain, 4550);
  }

  function spinNow(){
    if(spinning || !spinPointer || spinCount<=0) return;
    spinning=true;
    spinCount--;
    updateSpinCount();
    if(spinButton) spinButton.classList.add('pressed');
    var reward=rewards[Math.floor(Math.random()*rewards.length)];
    var rounds=1440;
    var currentBase=((currentDeg%360)+360)%360;
    var target=reward.targetDeg;
    var delta=(target-currentBase+360)%360;
    currentDeg += rounds + delta;
    spinPointer.classList.add('spinning');
    spinPointer.style.setProperty('--pointer-deg', currentDeg+'deg');
    setTimeout(function(){
      spinning=false;
      if(spinButton) spinButton.classList.remove('pressed');
      if(spinPointer) spinPointer.classList.remove('spinning');
      var resultLabel=reward.label;
      if(reward.type==='lucky'){
        var luckyAmount=randomMoney(0.01,9.99);
        amount += luckyAmount;
        updateAmount();
        resultLabel='Lucky Bonus MYR '+luckyAmount.toFixed(2);
      }else{
        if(reward.add){ amount += reward.add; updateAmount(); }
        if(reward.type==='spin'){ spinCount += reward.addSpin || 1; updateSpinCount(); }
      }
      showToast('You got '+resultLabel+'!');
    },3300);
  }




  // Rule / help popup
  var ruleOpen=document.getElementById('spinRuleOpen');
  var ruleOverlay=document.getElementById('spinRuleOverlay');
  var ruleClose=document.getElementById('spinRuleClose');
  function openRule(){
    if(!ruleOverlay) return;
    ruleOverlay.classList.add('show');
    ruleOverlay.setAttribute('aria-hidden','false');
    document.body.classList.add('spin-rule-open');
  }
  function closeRule(){
    if(!ruleOverlay) return;
    ruleOverlay.classList.remove('show');
    ruleOverlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('spin-rule-open');
  }
  if(ruleOpen) ruleOpen.addEventListener('click', openRule);
  if(ruleClose) ruleClose.addEventListener('click', closeRule);
  if(ruleOverlay) ruleOverlay.addEventListener('click', function(e){ if(e.target===ruleOverlay) closeRule(); });

  // Record / Helper tabs
  document.querySelectorAll('[data-spin-tab]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var key=btn.getAttribute('data-spin-tab');
      document.querySelectorAll('[data-spin-tab]').forEach(function(b){
        var active=b===btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      document.querySelectorAll('[data-spin-panel]').forEach(function(panel){
        panel.classList.toggle('active', panel.getAttribute('data-spin-panel')===key);
      });
    });
  });

  boxes.forEach(function(btn){ btn.addEventListener('click', function(){ openBox(btn); }); });
  if(closeBtn) closeBtn.addEventListener('click', showMain);
  if(spinButton) spinButton.addEventListener('click', spinNow);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ if(ruleOverlay && ruleOverlay.classList.contains('show')) closeRule(); else showMain(); } });

  var countdown=document.getElementById('spinCountdown');
  var total=(2*24*60*60)+(23*60*60)+(52*60)+2;
  function tick(){
    if(!countdown) return;
    var d=Math.floor(total/86400), h=Math.floor(total%86400/3600), m=Math.floor(total%3600/60), s=total%60;
    countdown.textContent=String(d).padStart(2,'0')+' d '+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
    if(total>0) total--;
  }
  updateSpinCount();
  tick(); setInterval(tick,1000);
})();
