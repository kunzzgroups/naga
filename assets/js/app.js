const API = window.NAGA_API || {};
const GAME_CATEGORY_API_URL =
  API.gameCategoryList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-category/list' : 'https://bo.corepayx.com/api/admin/game-category/list');
const GAME_SUB_CATEGORY_API_URL =
  API.gameSubCategoryList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-sub-category/list' : 'https://bo.corepayx.com/api/admin/game-sub-category/list');
const GAME_API_URL =
  API.gameList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game/list' : 'https://bo.corepayx.com/api/admin/game/list');

let categories = [];
let subCategories = [];
let activeCategoryId = null;
let activeSubCategoryId = null;

function tr(key, fallback){
  return (window.I18N && window.I18N.t && window.I18N.t(key) !== key) ? window.I18N.t(key) : (fallback || key);
}

const categoryRow=document.getElementById('categoryRow');
const gameGrid=document.getElementById('gameGrid');
const subTabRow=document.getElementById('subTabRow');

const catPrev=document.querySelector('.cat-prev');
const catNext=document.querySelector('.cat-next');
if(catPrev && catNext && categoryRow){
  function scrollCategoryPage(direction){
    const firstCat = categoryRow.querySelector('.cat');
    const gap = parseFloat(getComputedStyle(categoryRow).gap) || 0;
    const step = firstCat ? (firstCat.offsetWidth + gap) * 3 : categoryRow.clientWidth;
    categoryRow.scrollBy({left: direction * step, behavior:'smooth'});
  }
  catPrev.addEventListener('click',()=>scrollCategoryPage(-1));
  catNext.addEventListener('click',()=>scrollCategoryPage(1));
}

function normalizeApiList(response){
  if(Array.isArray(response)) return response;
  if(response && Array.isArray(response.data)) return response.data;
  if(response && response.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
}

function isActiveItem(item){
  return Number(item.status == null ? 1 : item.status) === 1;
}

function sortByOrder(a, b){
  return (Number(a.sortOrder || a.sort_order || 0) - Number(b.sortOrder || b.sort_order || 0))
      || (Number(a.id || 0) - Number(b.id || 0));
}

function getImageUrl(item, fallback){
  return item.imageUrl || item.image_url || item.image || fallback || '';
}

function renderCategories(){
  if(!categoryRow) return;
  categoryRow.innerHTML='';

  if(!categories.length){
    categoryRow.innerHTML = '<div class="empty-state">No category available</div>';
    return;
  }

  categories.forEach(cat=>{
    const el=document.createElement('button');
    el.className=`cat ${String(cat.id)===String(activeCategoryId)?'active':''}`;
    el.type='button';
    el.dataset.id=cat.id;
    const icon = getImageUrl(cat, 'assets/images/nav1.png');
    el.innerHTML=`<img src="${icon}" class="cat-icon" alt="${cat.name || 'Category'}"><span>${cat.name || 'Category'}</span>`;
    categoryRow.appendChild(el);
  });
}

function renderSubTabs(){
  if(!subTabRow) return;
  subTabRow.innerHTML = '';

  if(!subCategories.length){
    const btn = document.createElement('button');
    btn.className = 'active';
    btn.type = 'button';
    btn.dataset.id = '';
    btn.textContent = 'ALL';
    subTabRow.appendChild(btn);
    activeSubCategoryId = null;
    return;
  }

  subCategories.forEach((sub, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.id = sub.id;
    btn.textContent = sub.name || 'Sub Category';
    if(String(sub.id) === String(activeSubCategoryId) || (!activeSubCategoryId && index === 0)){
      btn.classList.add('active');
      activeSubCategoryId = sub.id;
    }
    subTabRow.appendChild(btn);
  });
}

function renderGames(list){
  if(!gameGrid) return;
  gameGrid.innerHTML='';
  gameGrid.classList.add('provider-grid');

  if(!list.length){
    gameGrid.innerHTML = '<div class="empty-state">No game available</div>';
    return;
  }

  list.forEach(item=>{
    const card=document.createElement('div');
    card.className='game-card';
    const imageUrl = getImageUrl(item, 'assets/images/game.png');
    const gameName = item.name || 'Game';
    const targetUrl = item.gameUrl || item.game_url || '';
    card.innerHTML=`
      <div class="game-card-img-wrap">
        <img src="${imageUrl}" alt="${gameName}">
      </div>
      <button class="play-btn">${tr('play','PLAY')}</button>`;

    card.querySelector('.play-btn').addEventListener('click', () => {
      if(targetUrl){
        window.location.href = targetUrl;
      }else{
        window.location.href = 'game-detail.html?id=' + encodeURIComponent(item.id || '');
      }
    });

    gameGrid.appendChild(card);
  });
}

function fetchJson(url){
  return fetch(url, { cache: 'no-store' }).then(res => {
    if(!res.ok) throw new Error('API error: ' + url);
    return res.json();
  });
}

function buildUrl(url, params){
  const fullUrl = new URL(url, window.location.href);
  Object.keys(params || {}).forEach(key => {
    if(params[key] !== null && params[key] !== undefined && params[key] !== ''){
      fullUrl.searchParams.set(key, params[key]);
    }
  });
  return fullUrl.toString();
}

function loadCategories(){
  if(!categoryRow || !subTabRow || !gameGrid) return Promise.resolve();

  return fetchJson(GAME_CATEGORY_API_URL)
    .then(response => {
      categories = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      activeCategoryId = categories[0] ? categories[0].id : null;
      renderCategories();
      return loadSubCategories();
    })
    .catch(err => {
      console.warn('Game category API failed:', err.message);
      categories = [];
      subCategories = [];
      renderCategories();
      renderSubTabs();
      renderGames([]);
    });
}

function loadSubCategories(){
  if(!activeCategoryId){
    subCategories = [];
    renderSubTabs();
    return loadGames();
  }

  const url = buildUrl(GAME_SUB_CATEGORY_API_URL, { categoryId: activeCategoryId });
  return fetchJson(url)
    .then(response => {
      subCategories = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      activeSubCategoryId = subCategories[0] ? subCategories[0].id : null;
      renderSubTabs();
      return loadGames();
    })
    .catch(err => {
      console.warn('Game sub category API failed:', err.message);
      subCategories = [];
      activeSubCategoryId = null;
      renderSubTabs();
      return loadGames();
    });
}

function loadGames(){
  const params = { categoryId: activeCategoryId };
  if(activeSubCategoryId) params.subCategoryId = activeSubCategoryId;

  const url = buildUrl(GAME_API_URL, params);
  return fetchJson(url)
    .then(response => {
      const list = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      renderGames(list);
    })
    .catch(err => {
      console.warn('Game API failed:', err.message);
      renderGames([]);
    });
}

if(categoryRow){
  categoryRow.addEventListener('click',e=>{
    const btn=e.target.closest('.cat');
    if(!btn)return;
    activeCategoryId=btn.dataset.id;
    activeSubCategoryId=null;
    renderCategories();
    loadSubCategories();
  });
}

if(subTabRow){
  subTabRow.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-id]');
    if(!btn)return;
    activeSubCategoryId=btn.dataset.id || null;
    subTabRow.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
    loadGames();
  });
}

loadCategories();
document.addEventListener('i18n:changed', () => {
  renderCategories();
  renderSubTabs();
});

function initSlider(slider){
  let slideIndex=0;
  let slideTimer;
  let startX=0;
  let currentX=0;
  let isDragging=false;
  let pointerId=null;
  let suppressClick=false;
  const slideDuration=4000;
  const swipeDistance=45;
  const slides=slider.querySelectorAll('.slide');
  const dots=slider.querySelectorAll('.dots span');
  const timerBar=slider.querySelector('.slider-timer span');
  if(!slides.length)return;

  function resetTimerBar(){
    if(!timerBar)return;
    timerBar.style.animation='none';
    timerBar.offsetHeight;
    timerBar.style.animation=`sliderTimer ${slideDuration}ms linear forwards`;
  }

  function showSlide(index){
    slides[slideIndex].classList.remove('active');
    if(dots[slideIndex])dots[slideIndex].classList.remove('active');
    slideIndex=(index+slides.length)%slides.length;
    slides[slideIndex].classList.add('active');
    if(dots[slideIndex])dots[slideIndex].classList.add('active');
    resetTimerBar();
  }

  function nextSlide(){
    showSlide(slideIndex+1);
  }

  function prevSlide(){
    showSlide(slideIndex-1);
  }

  function startSlider(){
    clearInterval(slideTimer);
    resetTimerBar();
    slideTimer=setInterval(nextSlide,slideDuration);
  }

  dots.forEach((dot,index)=>{
    dot.addEventListener('click',e=>{
      e.stopPropagation();
      showSlide(index);
      startSlider();
    });
  });

  slider.addEventListener('pointerdown',e=>{
    if(e.target.closest('.dots'))return;
    isDragging=true;
    pointerId=e.pointerId;
    startX=e.clientX;
    currentX=e.clientX;
    suppressClick=false;
    clearInterval(slideTimer);
    if(timerBar)timerBar.style.animationPlayState='paused';
    slider.classList.add('is-dragging');
    try{ slider.setPointerCapture(pointerId); }catch(err){}
  });

  slider.addEventListener('pointermove',e=>{
    if(!isDragging || e.pointerId!==pointerId)return;
    currentX=e.clientX;
    if(Math.abs(currentX-startX)>8)suppressClick=true;
  });

  function finishDrag(e){
    if(!isDragging || (e && e.pointerId!==pointerId))return;
    isDragging=false;
    slider.classList.remove('is-dragging');
    try{ slider.releasePointerCapture(pointerId); }catch(err){}
    const diff=currentX-startX;
    if(Math.abs(diff)>swipeDistance){
      diff>0 ? prevSlide() : nextSlide();
    }else if(timerBar){
      timerBar.style.animationPlayState='running';
    }
    startSlider();
    setTimeout(()=>{ suppressClick=false; },0);
  }

  slider.addEventListener('pointerup',finishDrag);
  slider.addEventListener('pointercancel',finishDrag);
  slider.addEventListener('lostpointercapture',finishDrag);

  slider.addEventListener('click',e=>{
    if(e.target.closest('.dots'))return;
    if(suppressClick){
      e.preventDefault();
      return;
    }
    nextSlide();
    startSlider();
  });

  startSlider();
}


// app.js
const SLIDER_API_URL =
  (window.NAGA_API && window.NAGA_API.sliderList)
  || 'https://bo.corepayx.com/api/admin/slider/list';
function normalizeSliderResponse(response){
  if(Array.isArray(response)) return response;
  if(response && Array.isArray(response.data)) return response.data;
  if(response && response.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
}

function renderSliderBanners(slider, banners){
  const timer = slider.querySelector('.slider-timer') || document.createElement('div');
  const timerSpan = timer.querySelector('span') || document.createElement('span');
  const dots = slider.querySelector('.dots') || document.createElement('div');

  timer.className = 'slider-timer';
  dots.className = 'dots';
  if(!timerSpan.parentElement) timer.appendChild(timerSpan);

  slider.innerHTML = '';

  banners.forEach((item, index) => {
    const img = document.createElement('img');
    img.className = 'slide' + (index === 0 ? ' active' : '');
    img.src = item.imageUrl || item.image_url || item.image || '';
    img.alt = item.title || 'Slider Banner';
    if(item.linkUrl || item.link_url){
      img.dataset.linkUrl = item.linkUrl || item.link_url;
    }
    slider.appendChild(img);
  });

  dots.innerHTML = '';
  banners.forEach((_, index) => {
    const dot = document.createElement('span');
    if(index === 0) dot.className = 'active';
    dots.appendChild(dot);
  });

  slider.appendChild(dots);
  slider.appendChild(timer);
}

function loadSliderBanners(){
  return fetch(SLIDER_API_URL, { cache: 'no-store' })
    .then(res => {
      if(!res.ok) throw new Error('Slider API error');
      return res.json();
    })
    .then(data => {
      const banners = normalizeSliderResponse(data)
        .filter(item => Number(item.status || 1) === 1)
        .filter(item => item.imageUrl || item.image_url || item.image)
        .sort((a, b) => (Number(a.sortOrder || a.sort_order || 0) - Number(b.sortOrder || b.sort_order || 0)) || (Number(b.id || 0) - Number(a.id || 0)));

      if(!banners.length) return;

      document.querySelectorAll('.side-slider').forEach(slider => {
        renderSliderBanners(slider, banners);
      });
    })
    .catch(err => {
      console.warn('Using default slider banners:', err.message);
    });
}

loadSliderBanners().then(() => {
  document.querySelectorAll('.side-slider').forEach(initSlider);
});

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
