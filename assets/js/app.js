const categories=[
  {key:'hot',icon:'assets/images/nav1.png',label:'HOT GAME',i18n:'cat_hot'},
  {key:'slot',icon:'assets/images/nav2.png',label:'SLOT GAME',i18n:'cat_slot'},
  {key:'live',icon:'assets/images/nav3.png',label:'LIVE GAME',i18n:'cat_live'},
  {key:'sport',icon:'assets/images/nav4.png',label:'SPORT',i18n:'cat_sport'},
  {key:'other',icon:'assets/images/nav5.png',label:'OTHER',i18n:'cat_other'}
];

const games={
  hot:{
    slots:[[],[],[],[],[],[],[],[],[],[],[],[]],
    mini:[[],[],[],[],[],[],[],[]]
  },
  slot:{
    slots:[[],[],[],[],[],[],[],[],[],[]],
    mini:[[],[],[],[],[],[],[],[],[],[]]
  },
  live:{
    slots:[[],[],[],[],[],[],[],[],[]],
    mini:[[],[],[],[],[],[],[],[],[],[],[],[]]
  },
  sport:{
    slots:[[],[],[],[],[],[]],
    mini:[[],[],[],[],[],[],[],[],[]]
  },
  other:{
    slots:[[],[],[],[],[],[],[],[],[],[],[],[]],
    mini:[[],[],[],[],[],[],[],[],[]]
  }
};

let activeCategory='hot';
let activeTab='slots';

function tr(key, fallback){
  return (window.I18N && window.I18N.t && window.I18N.t(key) !== key) ? window.I18N.t(key) : (fallback || key);
}

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
    el.innerHTML=`<img src="${cat.icon}" class="cat-icon" alt="${tr(cat.i18n, cat.label)}"><span>${tr(cat.i18n, cat.label)}</span>`;
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
        ${isNew?'<div class="new-badge">'+tr('new','NEW!')+'</div>':''}
        <img src="assets/images/game.png" alt="${title}">
      </div>
      <button class="play-btn">${tr('play','PLAY')}</button>`;
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
document.addEventListener('i18n:changed', () => {
  renderCategories();
  renderGames();
});

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
