const categories=[
  {key:'hot',icon:'assets/images/nav1.png',label:'HOT GAME'},
  {key:'slot',icon:'assets/images/nav2.png',label:'SLOT GAME'},
  {key:'live',icon:'assets/images/nav3.png',label:'LIVE GAME'},
  {key:'sport',icon:'assets/images/nav4.png',label:'SPORT'},
  {key:'other',icon:'assets/images/nav5.png',label:'OTHER'}
];

const games={
  hot:{
    slots:[['FC26','⚽','#22d3ee','#2563eb',true],['The White Muse II','🧙‍♀️','#facc15','#06b6d4'],['Prosperity Bloom','💎','#22c55e','#f97316'],['Empress Glory','👸','#f97316','#dc2626'],['Bankin Banker','🧓','#facc15','#84cc16'],['Aztec Riches','🏺','#eab308','#16a34a'],['Mythical Creatures','🐯','#14b8a6','#1e3a8a'],['Money Bang Bang','🧧','#ef4444','#eab308'],['Fortune Splash','🐟','#38bdf8','#fb923c'],['Candy Fantasy','🍭','#ec4899','#8b5cf6'],['Neko Blessing','🐱','#f59e0b','#ec4899'],['Great Prosperity','💰','#facc15','#f97316']],
    mini:[['JDB','🤖','#334155','#0f172a'],['CQ9','🐉','#0f766e','#1e1b4b'],['CROWD PLAY','🧙','#854d0e','#292524'],['DRAGONSOFT','💀','#581c87','#1f2937'],['SPADE GAMING','🧔','#92400e','#1f2937'],['WF GAMING','🦁','#b45309','#292524'],['FUNKY GAME','🔥','#ea580c','#18181b'],['MONEY KING','👾','#6d28d9','#111827'],['FAST SPIN','🧌','#16a34a','#1f2937'],['AI GAMING','🧊','#0284c7','#0f172a']]
  },
  slot:{
    slots:[['JDB','🤖','#334155','#0f172a'],['CQ9','🐉','#0f766e','#1e1b4b'],['CROWD PLAY','🧙','#854d0e','#292524'],['DRAGONSOFT','💀','#581c87','#1f2937'],['SPADE GAMING','🧔','#92400e','#1f2937'],['WF GAMING','🦁','#b45309','#292524'],['FUNKY GAME','🔥','#ea580c','#18181b'],['MONEY KING','👾','#6d28d9','#111827'],['FAST SPIN','🧌','#16a34a','#1f2937'],['AI GAMING','🧊','#0284c7','#0f172a'],['ACEWIN','👹','#dc2626','#292524'],['RICH GAMING','🦏','#78716c','#1c1917']],
    mini:[['BIG POT','🧝','#f97316','#422006'],['FA CHAI','💧','#06b6d4','#083344'],['IMPERIUM','👺','#166534','#111827'],['EVO888','🐷','#c084fc','#292524'],['CLOTCPLAY','🛡️','#38bdf8','#1e3a8a'],['LUCKY365','🪙','#facc15','#78350f']]
  },
  live:{
    slots:[['Sexy Baccarat','💃','#dc2626','#4c0519'],['Dream Gaming','🎲','#7c3aed','#111827'],['Evolution','♠️','#2563eb','#020617'],['Asia Gaming','🀄','#16a34a','#052e16'],['Pragmatic Live','🎥','#f97316','#451a03'],['Big Gaming','👑','#eab308','#7f1d1d']],
    mini:[['Roulette','🎡','#dc2626','#111827'],['Sic Bo','🎲','#16a34a','#111827'],['Dragon Tiger','🐲','#ea580c','#0f172a'],['Win Three Cards','🃏','#9333ea','#111827']]
  },
  sport:{
    slots:[['CMD368','⚽','#22c55e','#052e16'],['SBO Sport','🏆','#f59e0b','#111827'],['IBC Sport','🏀','#fb923c','#1e293b'],['Horse Racing','🐎','#a16207','#1c1917'],['ESport','🎮','#2563eb','#111827'],['Virtual Sport','🏁','#64748b','#020617']],
    mini:[['Football','⚽','#22c55e','#052e16'],['Basketball','🏀','#f97316','#111827'],['Tennis','🎾','#84cc16','#1f2937'],['Fighting','🥊','#dc2626','#111827']]
  },
  other:{
    slots:[['Fishing','🐟','#06b6d4','#083344'],['Lottery','🎟️','#f97316','#111827'],['Keno','🔢','#a855f7','#111827'],['Promotion','🎁','#ef4444','#1f2937'],['VIP Club','👑','#eab308','#451a03'],['Event','🔥','#f97316','#7f1d1d']],
    mini:[['Lucky Wheel','🎡','#f59e0b','#111827'],['Bonus Hunt','💰','#22c55e','#052e16'],['Daily Mission','🛡️','#38bdf8','#1e3a8a'],['Referrer','🤝','#14b8a6','#052e16']]
  }
};

let activeCategory='hot';
let activeTab='slots';


const categoryRow=document.getElementById('categoryRow');
const gameGrid=document.getElementById('gameGrid');
const subTabRow=document.getElementById('subTabRow');

const catPrev=document.querySelector('.cat-prev');
const catNext=document.querySelector('.cat-next');
if(catPrev && catNext){
  function scrollCategoryPage(direction){
    const firstCat = categoryRow.querySelector('.cat');
    const gap = parseFloat(getComputedStyle(categoryRow).gap) || 0;
    const step = firstCat ? (firstCat.offsetWidth + gap) * 3 : categoryRow.clientWidth;
    categoryRow.scrollBy({left: direction * step, behavior:'smooth'});
  }
  catPrev.addEventListener('click',()=>scrollCategoryPage(-1));
  catNext.addEventListener('click',()=>scrollCategoryPage(1));
}


function renderCategories(){
  categoryRow.innerHTML='';
  categories.forEach(cat=>{
    const el=document.createElement('button');
    el.className=`cat ${cat.key===activeCategory?'active':''}`;
    el.type='button';
    el.dataset.key=cat.key;
    el.innerHTML=`<img src="${cat.icon}" class="cat-icon" alt="${cat.label}"><span>${cat.label}</span>`;
    categoryRow.appendChild(el);
  });
}

function renderGames(){
  gameGrid.innerHTML='';
  const list=games[activeCategory][activeTab] || [];
  const isProvider = activeTab === 'mini' || activeCategory === 'slot';
  gameGrid.classList.toggle('provider-grid', isProvider);

  list.forEach(item=>{
    const [title,emoji,c1,c2,isNew]=item;
    const card=document.createElement('div');
    card.className='game-card';
    card.innerHTML=`
      <div class="game-card-img-wrap">
        ${isNew?'<div class="new-badge">NEW!</div>':''}
        <img src="assets/images/game.png" alt="${title}">
      </div>
      <button class="play-btn">PLAY</button>`;
    gameGrid.appendChild(card);
  });
}
categoryRow.addEventListener('click',e=>{
  const btn=e.target.closest('.cat');
  if(!btn)return;
  activeCategory=btn.dataset.key;
  activeTab='slots';
  document.querySelectorAll('.sub-tab-row button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='slots'));
  renderCategories();
  renderGames();
});

subTabRow.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-tab]');
  if(!btn)return;
  activeTab=btn.dataset.tab;
  document.querySelectorAll('.sub-tab-row button').forEach(b=>b.classList.toggle('active',b===btn));
  renderGames();
});

renderCategories();
renderGames();

function initSlider(slider){
  let slideIndex=0;
  let slideTimer;
  const slides=slider.querySelectorAll('.slide');
  const dots=slider.querySelectorAll('.dots span');
  if(!slides.length)return;

  function showSlide(index){
    slides[slideIndex].classList.remove('active');
    if(dots[slideIndex])dots[slideIndex].classList.remove('active');
    slideIndex=index;
    slides[slideIndex].classList.add('active');
    if(dots[slideIndex])dots[slideIndex].classList.add('active');
  }

  function startSlider(){
    clearInterval(slideTimer);
    slideTimer=setInterval(()=>showSlide((slideIndex+1)%slides.length),3000);
  }

  dots.forEach((dot,index)=>{
    dot.addEventListener('click',e=>{
      e.stopPropagation();
      showSlide(index);
      startSlider();
    });
  });

  slider.addEventListener('click',()=>{
    showSlide((slideIndex+1)%slides.length);
    startSlider();
  });

  startSlider();
}

document.querySelectorAll('.side-slider').forEach(initSlider);


// Language popup
const langBtn = document.getElementById('langBtn');
const langOverlay = document.getElementById('langOverlay');

function openLangPopup(){
  if(!langOverlay) return;
  langOverlay.classList.add('show');
  langOverlay.setAttribute('aria-hidden','false');
}

function closeLangPopup(){
  if(!langOverlay) return;
  langOverlay.classList.remove('show');
  langOverlay.setAttribute('aria-hidden','true');
}

if(langBtn && langOverlay){
  langBtn.addEventListener('click', openLangPopup);

  langOverlay.addEventListener('click', e => {
    if(e.target === langOverlay) closeLangPopup();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeLangPopup();
  });

  langOverlay.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      langOverlay.querySelectorAll('.lang-option').forEach(item => {
        item.classList.remove('active');
        const check = item.querySelector('span');
        if(check) check.remove();
      });

      btn.classList.add('active');
      if(!btn.querySelector('span')){
        btn.insertAdjacentHTML('beforeend', ' <span>✔</span>');
      }

      closeLangPopup();
    });
  });
}

// Share + copy modal
(function(){
  const shareOverlay=document.getElementById('shareOverlay');
  const copyOverlay=document.getElementById('copyOverlay');
  const copyText=document.getElementById('copyText');

  function show(el){ if(el){ el.classList.add('show'); el.setAttribute('aria-hidden','false'); } }
  function hide(el){ if(el){ el.classList.remove('show'); el.setAttribute('aria-hidden','true'); } }

  document.querySelectorAll('.share-trigger').forEach(btn=>{
    btn.addEventListener('click',()=>show(shareOverlay));
  });

  document.querySelectorAll('.copy-trigger').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const text=(copyText && copyText.textContent.trim()) || 'https://d2aud.com/RF1A850A95';
      if(navigator.clipboard){ navigator.clipboard.writeText(text).catch(()=>{}); }
      show(copyOverlay);
    });
  });

  document.querySelectorAll('.modal-x,.copy-ok').forEach(btn=>{
    btn.addEventListener('click',()=>{ hide(shareOverlay); hide(copyOverlay); });
  });

  [shareOverlay,copyOverlay].forEach(overlay=>{
    if(!overlay) return;
    overlay.addEventListener('click',e=>{ if(e.target===overlay) hide(overlay); });
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ hide(shareOverlay); hide(copyOverlay); }
  });
})();
