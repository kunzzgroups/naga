const categories=[
  {key:'hot',icon:'assets/images/nav1.png',label:'HOT GAME'},
  {key:'slot',icon:'assets/images/nav2.png',label:'SLOT GAME'},
  {key:'live',icon:'assets/images/nav3.png',label:'LIVE GAME'},
  {key:'sport',icon:'assets/images/nav4.png',label:'SPORT'},
  {key:'other',icon:'assets/images/nav5.png',label:'OTHER'}
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