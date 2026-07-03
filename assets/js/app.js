const API = window.NAGA_API || {};
const GAME_CATEGORY_API_URL =
  API.gameCategoryList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-category/list' : 'https://bo.titanxgaming.com/api/admin/game-category/list');
const GAME_SUB_CATEGORY_API_URL =
  API.gameSubCategoryList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-sub-category/list' : 'https://bo.titanxgaming.com/api/admin/game-sub-category/list');
const GAME_API_URL =
  API.gameList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game/list' : 'https://bo.titanxgaming.com/api/admin/game/list');
const GAME_PROVIDER_API_URL =
  API.gameProviderList || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) ? window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-provider/list' : 'https://bo.titanxgaming.com/api/admin/game-provider/list');

let categories = [];
let subCategories = [];
let providers = [];
let activeCategoryId = null;
let activeSubCategoryId = null;
let activeProviderCode = null;
let currentGameList = [];
let showingProviderList = true;
let gameLoadSequence = 0;
let subCategoryLoadSequence = 0;
const DEFAULT_GAME_SECTION_KEYWORD = 'slot';


function tr(key, fallback){
  return (window.I18N && window.I18N.t && window.I18N.t(key) !== key) ? window.I18N.t(key) : (fallback || key);
}

function currentLangCode(){
  return (window.I18N && window.I18N.current) || localStorage.getItem('site_lang') || localStorage.getItem('lang') || document.documentElement.lang || 'en';
}

function isZhLang(){
  const lang = currentLangCode();
  return String(lang).toLowerCase().startsWith('zh') || String(lang).toLowerCase().startsWith('cn');
}

function transValue(item, field){
  const lang = currentLangCode();
  if(!item || !item.translations) return '';
  const direct = item.translations[lang] || item.translations[String(lang).toLowerCase()];
  if(direct && direct[field]) return direct[field];
  const shortLang = String(lang).toLowerCase().split('-')[0];
  return item.translations[shortLang] && item.translations[shortLang][field] ? item.translations[shortLang][field] : '';
}

function langText(item, field, fallback){
  const dynamicValue = transValue(item, field);
  if(dynamicValue) return dynamicValue;
  return item?.[field] || fallback || '';
}

function uploadBaseUrl(){
  const cfg = window.NAGA_CONFIG && window.NAGA_CONFIG.api;
  return ((cfg && cfg.uploadBaseUrl) || 'https://static.titanxgaming.com/uploads').replace(/\/+$/, '');
}

function isFullImageUrl(value){
  return /^(https?:)?\/\//i.test(String(value || '')) || String(value || '').startsWith('data:') || String(value || '').startsWith('assets/');
}

function resolveUploadImage(value, folder, fallback){
  const img = String(value || '').trim();
  if(!img) return fallback || '';
  if(isFullImageUrl(img) || img.startsWith('/')) return img;
  return uploadBaseUrl() + '/' + folder + '/' + img.replace(/^\/+/, '');
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


function safeLower(value){
  return String(value == null ? '' : value).toLowerCase();
}

function getItemNameForMatch(item){
  return [
    item && item.name,
    item && item.title,
    item && item.code,
    item && item.categoryCode,
    item && item.category_code,
    item && item.type,
    transValue(item, 'name'),
    transValue(item, 'title')
  ].map(safeLower).join(' ');
}

function normalizeKey(value){
  return String(value == null ? '' : value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function categoryTypeKey(cat){
  const raw = cat?.code || cat?.categoryCode || cat?.type || cat?.name || transValue(cat, 'name') || '';
  const key = normalizeKey(raw);
  if(key.includes('SLOT')) return 'SLOT';
  if(key.includes('LIVE')) return 'LIVE';
  if(key.includes('SPORT')) return 'SPORT';
  if(key.includes('FISH')) return 'FISHING';
  if(key.includes('OTHER')) return 'OTHER';
  if(key.includes('HOT')) return 'HOT';
  return key;
}

function activeCategoryTypeKey(){
  const cat = categories.find(c => String(c.id) === String(activeCategoryId));
  return categoryTypeKey(cat);
}

function activeCategory(){
  return categories.find(c => String(c.id) === String(activeCategoryId));
}

function activeCategoryDisplayMode(){
  const cat = activeCategory();
  const mode = String(cat?.displayMode || cat?.display_mode || '').trim().toUpperCase();
  return mode === 'DIRECT_GAME' ? 'DIRECT_GAME' : 'PROVIDER';
}

function isDirectGameCategory(){
  return activeCategoryDisplayMode() === 'DIRECT_GAME';
}

function providerTypeOf(provider){
  return normalizeKey(provider?.providerType || provider?.provider_type || provider?.type || '');
}

function providersForActiveCategory(){
  const key = activeCategoryTypeKey();
  if(!key) return providers;
  return providers.filter(p => providerTypeOf(p) === key);
}

function pickDefaultCategoryId(list){
  if(!Array.isArray(list) || !list.length) return null;
  return list[0].id;
}

function pickDefaultSubCategoryId(list){
  if(!Array.isArray(list) || !list.length) return null;
  const slot = list.find(item => getItemNameForMatch(item).includes(DEFAULT_GAME_SECTION_KEYWORD));
  return (slot || list[0]).id;
}

function setGamesLoading(){
  if(gameGrid){
    gameGrid.innerHTML = '<div class="empty-state">Loading games...</div>';
  }
}

function getImageUrl(item, fallback, folder){
  let value;
  const dynamicImageUrl = transValue(item, 'imageUrl') || transValue(item, 'imageImageUrl');
  const dynamicImage = transValue(item, 'image') || transValue(item, 'imageImage');
  if(dynamicImageUrl || dynamicImage){
    value = dynamicImageUrl || dynamicImage;
  }else{
    value = item.imageUrl || item.image_url || item.image;
  }
  if(!folder) return value || fallback || '';
  return resolveUploadImage(value, folder, fallback);
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
    const icon = getImageUrl(cat, 'assets/images/nav1.png', 'game-category');
    const catName = langText(cat, 'name', 'Category');
    el.innerHTML=`<img src="${icon}" class="cat-icon" alt="${catName}"><span>${catName}</span>`;
    categoryRow.appendChild(el);
  });
}

function renderSubTabs(){
  if(!subTabRow) return;
  subTabRow.innerHTML = '';

  if(!activeProviderCode || !subCategories.length){
    subTabRow.style.display = 'none';
    if(!activeProviderCode) activeSubCategoryId = null;
    return;
  }

  subTabRow.style.display = '';

  subCategories.forEach((sub, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.id = sub.id;
    btn.textContent = langText(sub, 'name', 'Sub Category');

    if(String(sub.id) === String(activeSubCategoryId) || (!activeSubCategoryId && index === 0)){
      btn.classList.add('active');
      activeSubCategoryId = sub.id;
    }

    subTabRow.appendChild(btn);
  });
}

function providerCodeOf(item){
  return String(item?.providerCode || item?.provider_code || item?.code || '').trim().toUpperCase();
}

function providerNameOf(provider){
  return provider?.name || provider?.title || providerCodeOf(provider) || 'Provider';
}

function providerForCode(code){
  const clean = String(code || '').trim().toUpperCase();
  return providers.find(p => providerCodeOf(p) === clean) || { code: clean, name: clean };
}

function providerInitials(name){
  const words = String(name || 'P').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'P';
}

function providerImageOf(provider){
  const value = provider?.imageUrl || provider?.image_url || provider?.providerImageUrl || provider?.provider_image_url || provider?.logoUrl || provider?.logo_url || provider?.logo || provider?.image;
  return resolveUploadImage(value, 'provider', '');
}

function renderProviderCards(games){
  if(!gameGrid) return;
  showingProviderList = true;
  activeProviderCode = null;
  currentGameList = Array.isArray(games) ? games : [];
  if(subTabRow){
    subTabRow.innerHTML = '';
    subTabRow.style.display = 'none';
  }
  gameGrid.innerHTML = '';
  gameGrid.classList.add('provider-grid', 'provider-first-grid');

  const countByProvider = new Map();
  currentGameList.forEach(game => {
    const code = providerCodeOf(game);
    if(code) countByProvider.set(code, (countByProvider.get(code) || 0) + 1);
  });

  const rows = providersForActiveCategory().sort((a, b) => {
    const ao = Number(a.sortOrder || a.sort_order || 0);
    const bo = Number(b.sortOrder || b.sort_order || 0);
    return (ao - bo) || providerNameOf(a).localeCompare(providerNameOf(b));
  }).map(provider => ({ code: providerCodeOf(provider), provider, count: countByProvider.get(providerCodeOf(provider)) || 0 }))
    .filter(row => row.code);

  if(!rows.length){
    gameGrid.innerHTML = '<div class="empty-state">No provider available for this category</div>';
    return;
  }

  rows.forEach(row => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'game-card provider-card';
    card.dataset.providerCode = row.code;
    const name = providerNameOf(row.provider);
    const imageUrl = providerImageOf(row.provider);
    card.innerHTML = `
      <div class="provider-card-face ${imageUrl ? 'has-provider-image' : ''}">
        ${imageUrl ? `<img class="provider-card-img" src="${imageUrl}" alt="${name}" loading="lazy">` : `<div class="provider-card-glow">${providerInitials(name)}</div><b>${name}</b><span>${row.count} Games</span>`}
      </div>`;
    card.addEventListener('click', () => {
      activeProviderCode = row.code;
      setGamesLoading();
      loadSubCategories();
    });
    gameGrid.appendChild(card);
  });
}

function renderGames(list){
  if(!gameGrid) return;
  showingProviderList = false;
  const provider = providerForCode(activeProviderCode);
  gameGrid.innerHTML='';
  gameGrid.classList.add('provider-grid');
  gameGrid.classList.remove('provider-first-grid');

  if(activeProviderCode){
    // provider header removed
  }

  const gameList = Array.isArray(list) ? list : [];
  if(!gameList.length){
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No game available';
    gameGrid.appendChild(empty);
    return;
  }

  gameList.forEach(item=>{
    const card=document.createElement('div');
    card.className='game-card provider-launch-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const imageUrl = getImageUrl(item, 'assets/images/game.png', 'game');
    const gameName = langText(item, 'name', 'Game');
    const targetUrl = item.gameUrl || item.game_url || '';

    const launchGameId = item.gameId || item.game_id || item.id || '';
    const launchProviderCode = item.providerCode || item.provider_code || item.provider_code_name || item.vendorCode || item.vendor_code || (item.provider && (item.provider.providerCode || item.provider.provider_code || item.provider.code)) || '';
    const launchGameCode = item.gameCode || item.game_code || item.launchCode || item.launch_code || item.providerGameCode || item.provider_game_code || item.code || '';

    if(launchGameId) card.dataset.gameId = launchGameId;
    if(launchProviderCode) card.dataset.providerCode = launchProviderCode;
    if(launchGameCode) card.dataset.gameCode = launchGameCode;
    if(gameName) card.dataset.gameName = gameName;

    card.innerHTML=`
      <div class="game-card-img-wrap">
        <img class="provider-launch-img"
             src="${imageUrl}"
             alt="${gameName}"
             data-game-id="${launchGameId}"
             data-provider-code="${launchProviderCode}"
             data-game-code="${launchGameCode}"
             data-game-name="${gameName}">
      </div>
      <button class="play-btn provider-launch-btn"
              type="button"
              data-game-id="${launchGameId}"
              data-provider-code="${launchProviderCode}"
              data-game-code="${launchGameCode}"
              data-game-name="${gameName}">${tr('play','PLAY')}</button>`;

    const playBtn = card.querySelector('.play-btn');
    const img = card.querySelector('.provider-launch-img');

    function fallbackOpen(){
      if(targetUrl){
        window.location.href = targetUrl;
      }else{
        window.location.href = 'game-detail.html?id=' + encodeURIComponent(item.id || '');
      }
    }

    if(window.NAGA_PROVIDER_LAUNCH && typeof window.NAGA_PROVIDER_LAUNCH.bindElement === 'function'){
      window.NAGA_PROVIDER_LAUNCH.bindElement(card, item, { transferAmount: 0, gameName: gameName });
      window.NAGA_PROVIDER_LAUNCH.bindElement(img, item, { transferAmount: 0, gameName: gameName });
      window.NAGA_PROVIDER_LAUNCH.bindButton(playBtn, item, { transferAmount: 0, gameName: gameName });
    }else{
      card.addEventListener('click', fallbackOpen);
      playBtn.addEventListener('click', e=>{ e.stopPropagation(); fallbackOpen(); });
    }

    card.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        card.click();
      }
    });

    gameGrid.appendChild(card);
  });
}

function fetchJson(url){
  const requestUrl = new URL(url, window.location.href);
  requestUrl.searchParams.set('_t', Date.now().toString());
  return fetch(requestUrl.toString(), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }).then(res => {
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

function currentLang(){
  return currentLangCode();
}

function loadCategories(){
  if(!categoryRow || !subTabRow || !gameGrid) return Promise.resolve();

  return Promise.all([fetchJson(GAME_CATEGORY_API_URL), fetchJson(GAME_PROVIDER_API_URL).catch(() => ({data: []}))])
    .then(([response, providerResponse]) => {
      providers = normalizeApiList(providerResponse).filter(isActiveItem).sort(sortByOrder);
      categories = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      activeCategoryId = pickDefaultCategoryId(categories);
      activeSubCategoryId = null;
      renderCategories();
      setGamesLoading();
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
  const sequence = ++subCategoryLoadSequence;

  if(!activeCategoryId){
    subCategories = [];
    renderSubTabs();
    return loadGames();
  }

  if(!activeProviderCode || isDirectGameCategory()){
    subCategories = [];
    activeSubCategoryId = null;
    renderSubTabs();
    return loadGames();
  }

  setGamesLoading();
  const categoryIdForRequest = activeCategoryId;
  const url = buildUrl(GAME_SUB_CATEGORY_API_URL, {
    categoryId: categoryIdForRequest,
    providerCode: activeProviderCode,
    lang: currentLang()
  });

  return fetchJson(url)
    .then(response => {
      if(sequence !== subCategoryLoadSequence || String(categoryIdForRequest) !== String(activeCategoryId)) return;
      subCategories = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      activeSubCategoryId = pickDefaultSubCategoryId(subCategories);
      renderSubTabs();
      return loadGames();
    })
    .catch(err => {
      if(sequence !== subCategoryLoadSequence || String(categoryIdForRequest) !== String(activeCategoryId)) return;
      console.warn('Game sub category API failed:', err.message);
      subCategories = [];
      activeSubCategoryId = null;
      renderSubTabs();
      return loadGames();
    });
}

function loadGames(){
  const sequence = ++gameLoadSequence;
  const categoryIdForRequest = activeCategoryId;
  const subCategoryIdForRequest = activeSubCategoryId;
  const params = { categoryId: categoryIdForRequest, lang: currentLang() };
  if(activeProviderCode) params.providerCode = activeProviderCode;
  if(activeProviderCode && subCategoryIdForRequest) params.subCategoryId = subCategoryIdForRequest;

  setGamesLoading();
  const url = buildUrl(GAME_API_URL, params);
  return fetchJson(url)
    .then(response => {
      if(sequence !== gameLoadSequence) return;
      if(String(categoryIdForRequest || '') !== String(activeCategoryId || '')) return;
      if(String(subCategoryIdForRequest || '') !== String(activeSubCategoryId || '')) return;
      const list = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      if(isDirectGameCategory()){
        currentGameList = list;
        activeProviderCode = null;
        if(subTabRow){ subTabRow.innerHTML = ''; subTabRow.style.display = 'none'; }
        renderGames(list);
      }else if(activeProviderCode){
        renderGames(list.filter(item => providerCodeOf(item) === activeProviderCode));
      }else{
        currentGameList = list;
        renderProviderCards(list);
      }
    })
    .catch(err => {
      if(sequence !== gameLoadSequence) return;
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
    activeProviderCode=null;
    renderCategories();
    setGamesLoading();
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
  loadGames();
  if(sliderBannerCache.length){
    document.querySelectorAll('.side-slider').forEach(slider => renderSliderBanners(slider, sliderBannerCache));
    document.querySelectorAll('.side-slider').forEach(initSlider);
  }
});

function initSlider(slider){
  if(typeof slider._nagaSliderCleanup === 'function') slider._nagaSliderCleanup();
  const sliderAbort = new AbortController();
  const sliderEventOptions = { signal: sliderAbort.signal };

  let slideIndex=0;
  let slideTimer;
  let startX=0;
  let currentX=0;
  let isDragging=false;
  let pointerId=null;
  let suppressClick=false;
  const slideDuration=4000;
  const slides=[...slider.querySelectorAll('.slide')];
  const dots=slider.querySelectorAll('.dots span');
  const timerBar=slider.querySelector('.slider-timer span');
  if(!slides.length)return;

  let track=slider.querySelector('.slider-track');
  if(!track){
    track=document.createElement('div');
    track.className='slider-track';
    slider.insertBefore(track, slides[0]);
    slides.forEach(slide=>track.appendChild(slide));
  }

  function resetTimerBar(){
    if(!timerBar)return;
    timerBar.style.animation='none';
    timerBar.offsetHeight;
    timerBar.style.animation=`sliderTimer ${slideDuration}ms linear forwards`;
  }

  function setTrack(offsetPx=0){
    track.style.transform=`translate3d(calc(${-slideIndex * 100}% + ${offsetPx}px),0,0)`;
  }

  function showSlide(index){
    slides[slideIndex].classList.remove('active');
    if(dots[slideIndex])dots[slideIndex].classList.remove('active');
    slideIndex=(index+slides.length)%slides.length;
    slides[slideIndex].classList.add('active');
    if(dots[slideIndex])dots[slideIndex].classList.add('active');
    setTrack(0);
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
    }, sliderEventOptions);
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
  }, sliderEventOptions);

  slider.addEventListener('pointermove',e=>{
    if(!isDragging || e.pointerId!==pointerId)return;
    currentX=e.clientX;
    const diff=currentX-startX;
    if(Math.abs(diff)>8)suppressClick=true;
    setTrack(diff);
  }, sliderEventOptions);

  function finishDrag(e){
    if(!isDragging || (e && e.pointerId!==pointerId))return;
    isDragging=false;
    slider.classList.remove('is-dragging');
    try{ slider.releasePointerCapture(pointerId); }catch(err){}
    const diff=currentX-startX;
    const changeDistance=slider.clientWidth * 0.45;

    if(Math.abs(diff)>=changeDistance){
      diff>0 ? prevSlide() : nextSlide();
    }else{
      setTrack(0);
      if(timerBar)timerBar.style.animationPlayState='running';
    }
    startSlider();
    setTimeout(()=>{ suppressClick=false; },0);
  }

  slider.addEventListener('pointerup',finishDrag, sliderEventOptions);
  slider.addEventListener('pointercancel',finishDrag, sliderEventOptions);
  slider.addEventListener('lostpointercapture',finishDrag, sliderEventOptions);

  slider.addEventListener('click',e=>{
    if(e.target.closest('.dots'))return;
    if(suppressClick){
      e.preventDefault();
      return;
    }
    nextSlide();
    startSlider();
  }, sliderEventOptions);

  setTrack(0);
  startSlider();
  slider._nagaSliderCleanup = () => {
    clearInterval(slideTimer);
    sliderAbort.abort();
  };
}


// app.js
const SLIDER_API_URL =
  (window.NAGA_API && window.NAGA_API.sliderList)
  || 'https://bo.titanxgaming.com/api/admin/slider/list';
function normalizeSliderResponse(response){
  if(Array.isArray(response)) return response;
  if(response && Array.isArray(response.data)) return response.data;
  if(response && response.data && Array.isArray(response.data.data)) return response.data.data;
  return [];
}

let sliderBannerCache = [];

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
    img.src = getImageUrl(item, '', 'slider');
    img.alt = langText(item, 'title', 'Slider Banner');
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

      sliderBannerCache = banners;
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
  try{ const member=JSON.parse(localStorage.getItem('member_info')||'{}'); const code=member.referralCode||member.referrerCode||'RF1A850A95'; document.querySelectorAll('.share-head strong').forEach(el=>el.textContent=code); if(copyText) copyText.textContent=location.origin + '/register.html?ref=' + code; }catch(e){}

  function show(el){ if(el){ el.classList.add('show'); el.setAttribute('aria-hidden','false'); } }
  function hide(el){ if(el){ el.classList.remove('show'); el.setAttribute('aria-hidden','true'); } }

  document.querySelectorAll('.share-trigger').forEach(btn=>{
    btn.addEventListener('click',()=>show(shareOverlay));
  });

  document.querySelectorAll('.copy-trigger').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const member=JSON.parse(localStorage.getItem('member_info')||'{}');
      const code=member.referralCode||member.referrerCode||'RF1A850A95';
      const text=location.origin + '/register.html?ref=' + code;
      if(copyText) copyText.textContent=text;
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
