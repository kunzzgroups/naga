(function(){
  var levels = [
    { key:'bronze', name:'Bronze', exp:'50 EXP until VIP 1', required:'Current Level', progress:18, bonus:['MYR 4.07','MYR 10.17','MYR 20.35','MYR 40.70','MYR 81.40'], monthly:'MYR 3.00', cashback:'0.20%', desc:'Entry VIP level with basic bonus and standard member benefits.' },
    { key:'silver', name:'Silver', exp:'500 EXP until VIP 2', required:'500 EXP Required', progress:0, bonus:['MYR 10.17','MYR 20.35','MYR 40.70','MYR 81.40','MYR 122.10'], monthly:'MYR 8.00', cashback:'0.30%', desc:'Unlock higher level bonus and better monthly perks.' },
    { key:'gold', name:'Gold', exp:'1,500 EXP until VIP 3', required:'1,500 EXP Required', progress:0, bonus:['MYR 20.35','MYR 40.70','MYR 81.40','MYR 122.10','MYR 203.50'], monthly:'MYR 18.00', cashback:'0.45%', desc:'Gold members receive stronger rewards and faster support.' },
    { key:'platinum', name:'Platinum', exp:'5,000 EXP until VIP 4', required:'5,000 EXP Required', progress:0, bonus:['MYR 40.70','MYR 81.40','MYR 122.10','MYR 203.50','MYR 407.00'], monthly:'MYR 38.00', cashback:'0.60%', desc:'Premium VIP level with larger rewards and exclusive benefits.' },
    { key:'diamond', name:'Diamond', exp:'12,000 EXP until VIP 5', required:'12,000 EXP Required', progress:0, bonus:['MYR 81.40','MYR 122.10','MYR 203.50','MYR 407.00','MYR 814.00'], monthly:'MYR 88.00', cashback:'0.80%', desc:'Top VIP level with maximum level bonus and priority service.' }
  ];

  var cards = Array.prototype.slice.call(document.querySelectorAll('.vip-level-card'));
  var dotsWrap = document.getElementById('vipDots');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-vip-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-vip-panel]'));
  var index = 0;

  function renderDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML = cards.map(function(_,i){
      return '<button type="button" aria-label="Go to '+levels[i].name+'" data-vip-dot="'+i+'"></button>';
    }).join('');
    dotsWrap.addEventListener('click', function(e){
      var btn = e.target.closest('[data-vip-dot]');
      if(!btn) return;
      setIndex(Number(btn.getAttribute('data-vip-dot')) || 0);
    });
  }

  function updateLevelInfo(){
    var level = levels[index] || levels[0];
    cards.forEach(function(card,i){
      var l = levels[i];
      var subtitle = card.querySelector('p');
      if(subtitle) subtitle.textContent = l.required;
    });

    var progressCard = document.querySelector('.vip-progress-card');
    if(progressCard){
      var b = progressCard.querySelector('b');
      var span = progressCard.querySelector('span');
      var line = progressCard.querySelector('.vip-progress-line span');
      if(b) b.textContent = 'VIP ' + (index + 1);
      if(span) span.innerHTML = level.exp + ' <i class="fa-regular fa-circle-question"></i>';
      if(line) line.style.width = level.progress + '%';
    }

    var rewardRows = Array.prototype.slice.call(document.querySelectorAll('.vip-reward-row'));
    rewardRows.forEach(function(row,i){
      var title = row.querySelector('h3');
      var amount = row.querySelector('.vip-reward-box strong');
      if(title) title.textContent = 'VIP ' + (index + i + 1);
      if(amount) amount.textContent = level.bonus[i] || level.bonus[level.bonus.length-1];
      row.classList.toggle('active', i === 0);
    });

    var perkGrid = document.querySelector('.vip-perk-grid');
    if(perkGrid){
      perkGrid.innerHTML = [
        '<article><i class="fa-solid fa-gift"></i><b>Monthly Gift</b><span>'+level.monthly+' monthly perk for '+level.name+' members.</span></article>',
        '<article><i class="fa-solid fa-percent"></i><b>Cashback</b><span>Up to '+level.cashback+' cashback based on the selected VIP level.</span></article>',
        '<article><i class="fa-solid fa-bolt"></i><b>Upgrade Info</b><span>'+level.required+' to unlock this level benefits.</span></article>',
        '<article><i class="fa-solid fa-headset"></i><b>VIP Service</b><span>'+level.desc+'</span></article>'
      ].join('');
    }
  }

  function setIndex(next){
    if(!cards.length) return;
    index = (next + cards.length) % cards.length;
    cards.forEach(function(card,i){
      card.classList.toggle('active', i === index);
      card.classList.toggle('prev', i === (index - 1 + cards.length) % cards.length);
      card.classList.toggle('next', i === (index + 1) % cards.length);
      card.classList.toggle('far-prev', i === (index - 2 + cards.length) % cards.length);
      card.classList.toggle('far-next', i === (index + 2) % cards.length);
    });
    Array.prototype.slice.call(document.querySelectorAll('[data-vip-dot]')).forEach(function(dot,i){
      dot.classList.toggle('active', i === index);
    });
    updateLevelInfo();
  }

  var startX = 0;
  var currentX = 0;
  var dragging = false;
  var moved = false;
  var slider = document.getElementById('vipLevelSlider');

  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function startDrag(x){
    startX = x;
    currentX = x;
    dragging = true;
    moved = false;
    if(slider) slider.classList.add('dragging');
  }
  function moveDrag(x){
    if(!dragging || !slider) return;
    currentX = x;
    var dx = clamp(currentX - startX, -90, 90);
    if(Math.abs(dx) > 6) moved = true;
    slider.style.setProperty('--vip-drag-x', dx + 'px');
  }
  function endDrag(){
    if(!dragging || !slider) return;
    var dx = currentX - startX;
    dragging = false;
    slider.classList.remove('dragging');
    slider.style.setProperty('--vip-drag-x', '0px');
    // Higher threshold prevents accidental auto-jump while swiping slowly.
    if(Math.abs(dx) > 95){
      setIndex(index + (dx < 0 ? 1 : -1));
    }
  }

  if(slider){
    slider.addEventListener('touchstart', function(e){ startDrag(e.touches[0].clientX); }, {passive:true});
    slider.addEventListener('touchmove', function(e){ moveDrag(e.touches[0].clientX); }, {passive:true});
    slider.addEventListener('touchend', function(){ endDrag(); });
    slider.addEventListener('touchcancel', function(){ endDrag(); });
    slider.addEventListener('mousedown', function(e){ startDrag(e.clientX); });
    window.addEventListener('mousemove', function(e){ moveDrag(e.clientX); });
    window.addEventListener('mouseup', function(){ endDrag(); });
    slider.addEventListener('click', function(e){
      if(moved) return;
      var card = e.target.closest('.vip-level-card');
      if(!card) return;
      var i = cards.indexOf(card);
      if(i >= 0 && i !== index) setIndex(i);
    });
  }

  var prev = document.querySelector('.vip-prev');
  var next = document.querySelector('.vip-next');
  if(prev) prev.addEventListener('click', function(){ setIndex(index - 1); });
  if(next) next.addEventListener('click', function(){ setIndex(index + 1); });

  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      var key = tab.getAttribute('data-vip-tab');
      tabs.forEach(function(t){ t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
      panels.forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-vip-panel') === key); });
    });
  });

  renderDots();
  setIndex(0);
})();
