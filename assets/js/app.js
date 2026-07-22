// Normalize root home URL so / and /index.html run exactly the same home initialization.
(function(){
  try{
    var path = window.location.pathname || '';
    if(path === '/' || /\/$/.test(path)){
      var normalized = path.replace(/\/$/, '/') + 'index.html' + (window.location.search || '') + (window.location.hash || '');
      window.history.replaceState(window.history.state, document.title, normalized);
    }
  }catch(e){}
})();

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
const ALL_PROVIDER_CODE = '__ALL__';
let subCategoryAutoTriedIds = new Set();

function isAllProviderCode(code){
  return String(code || '') === ALL_PROVIDER_CODE;
}


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

  // HOT GAME must honour its provider rules first. When two or more providers
  // are assigned, always show the provider landing cards before any games,
  // even if an older/stale display_mode value still says DIRECT_GAME.
  if(categoryTypeKey(cat) === 'HOT' && categoryProviderRules(cat).length > 1){
    return 'PROVIDER';
  }

  return mode === 'DIRECT_GAME' ? 'DIRECT_GAME' : 'PROVIDER';
}

function isDirectGameCategory(){
  return activeCategoryDisplayMode() === 'DIRECT_GAME';
}

// HOT GAME uses provider cards as its first screen when more than one provider
// is configured. After a provider is chosen, show only that provider's games;
// do not repeat the normal left-side provider rail inside the game view.
function isHotMultiProviderGameView(){
  return activeCategoryTypeKey() === 'HOT'
    && categoryProviderRules().length > 1
    && activeProviderCode
    && !isAllProviderCode(activeProviderCode);
}

function providerTypesOf(provider){
  const raw = provider?.providerTypes || provider?.provider_types || provider?.providerType || provider?.provider_type || provider?.type || '';
  const values = Array.isArray(raw) ? raw : String(raw).split(/[,|]/);
  return [...new Set(values.map(value => normalizeKey(value)).filter(Boolean))];
}

function providerTypeOf(provider){
  return providerTypesOf(provider)[0] || '';
}

function providerCategoryIdsOf(provider){
  const raw = provider?.categoryIds || provider?.category_ids || '';
  const values = Array.isArray(raw) ? raw : String(raw).split(/[,|]/);
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function categoryProviderRules(cat = activeCategory()){
  try{
    const raw = cat?.providerRules || cat?.provider_rules || '{"providers":[]}';
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed?.providers) ? parsed.providers : [];
  }catch(e){ return []; }
}

function providerRuleForCode(code){
  const clean = String(code || '').trim().toUpperCase();
  return categoryProviderRules().find(r => String(r.providerCode || '').trim().toUpperCase() === clean) || null;
}

function providersForActiveCategory(){
  const activeId = String(activeCategoryId || '').trim();
  if(!activeId) return providers;
  const configuredCodes = categoryProviderRules().map(r => String(r.providerCode || '').trim().toUpperCase()).filter(Boolean);
  if(configuredCodes.length) return providers.filter(p => configuredCodes.includes(providerCodeOf(p)));
  const byIds = providers.filter(p => providerCategoryIdsOf(p).includes(activeId));
  if(byIds.length) return byIds;
  const key = activeCategoryTypeKey();
  return key ? providers.filter(p => providerTypesOf(p).includes(key)) : providers;
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
  if(!gameGrid) return;

  // Keep the provider rail mounted while only the selected provider's games reload.
  // This preserves its scroll position and avoids the sidebar flashing/rebuilding.
  const existingLobby = gameGrid.querySelector('.provider-lobby-shell');
  const existingPanel = existingLobby && existingLobby.querySelector('.provider-games-panel');
  const keepProviderRail = existingPanel && activeProviderCode && !isDirectGameCategory() && !isHotMultiProviderGameView();

  if(keepProviderRail){
    existingPanel.innerHTML = '<div class="games-loading-indicator" role="status" aria-label="Loading games"><span class="games-loading-spinner" aria-hidden="true"></span></div>';
    existingPanel.scrollTop = 0;
    return;
  }

  gameGrid.innerHTML = '<div class="games-loading-indicator" role="status" aria-label="Loading games"><span class="games-loading-spinner" aria-hidden="true"></span></div>';
}

function syncProviderRailActiveState(rail){
  if(!rail) return;
  rail.querySelectorAll('.provider-rail-card').forEach(btn => {
    const code = btn.dataset.providerCode || '';
    const active = isAllProviderCode(activeProviderCode)
      ? isAllProviderCode(code)
      : String(code) === String(activeProviderCode || '');
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
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


function centerActiveMobileCategory(){
  if(!categoryRow || !window.matchMedia || !window.matchMedia('(max-width: 768px)').matches) return;
  const active = categoryRow.querySelector('.cat.active') || categoryRow.querySelector('.cat');
  if(!active || typeof active.scrollIntoView !== 'function') return;
  window.requestAnimationFrame(() => {
    active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}



function centerActiveMobileSubCategory(){
  if(!subTabRow || !window.matchMedia || !window.matchMedia('(max-width: 768px)').matches) return;
  const active = subTabRow.querySelector('button.active') || subTabRow.querySelector('button');
  if(!active || typeof active.scrollIntoView !== 'function') return;
  window.requestAnimationFrame(() => {
    active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}

function renderCategories(){
  if(!categoryRow) return;
  categoryRow.innerHTML='';

  if(!categories.length){
    categoryRow.innerHTML = '<div class="empty-state">No category available</div>';
    return;
  }

  const allEl=document.createElement('button');
  allEl.className=`cat mobile-all-cat ${!activeCategoryId?'active':''}`;
  allEl.type='button';
  allEl.dataset.id='';
  allEl.innerHTML='<span class="mobile-cat-emoji">🏠</span><span>All</span>';
  categoryRow.appendChild(allEl);

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
  centerActiveMobileCategory();
}

function renderSubTabs(){
  if(!subTabRow) return;
  subTabRow.innerHTML = '';

  if(!activeProviderCode || isAllProviderCode(activeProviderCode) || !subCategories.length){
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
  centerActiveMobileSubCategory();
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

function frontendGameFallbackImageOf(game){
  const provider = providerForCode(providerCodeOf(game));
  const configured = provider?.frontendGameFallbackImageUrl || provider?.frontend_game_fallback_image_url || '';
  return resolveUploadImage(configured, 'game', 'assets/images/game.png');
}

function bindGameImageFallback(img, game){
  if(!img) return;
  const fallbackUrl = frontendGameFallbackImageOf(game);
  img.dataset.fallbackSrc = fallbackUrl;
  img.addEventListener('error', function handleBrokenGameImage(){
    if(this.dataset.fallbackApplied === '1') return;
    this.dataset.fallbackApplied = '1';
    this.src = fallbackUrl;
  }, { once: false });
}



function categoryIdForProviderCode(providerCode){
  const provider = providerForCode(providerCode);
  const categoryIds = providerCategoryIdsOf(provider);
  if(categoryIds.length){
    const matched = categories.find(cat => categoryIds.includes(String(cat.id)));
    if(matched && matched.id != null) return matched.id;
  }
  const providerTypes = providerTypesOf(provider);
  if(providerTypes.length){
    const matched = categories.find(cat => providerTypes.includes(categoryTypeKey(cat)));
    if(matched && matched.id != null) return matched.id;
  }
  const slot = categories.find(cat => categoryTypeKey(cat) === 'SLOT');
  return slot && slot.id != null ? slot.id : (categories[0] && categories[0].id != null ? categories[0].id : null);
}

function ensureCategoryForSelectedProvider(){
  if(activeCategoryId || !activeProviderCode || isAllProviderCode(activeProviderCode)) return false;
  const inferredId = categoryIdForProviderCode(activeProviderCode);
  if(inferredId == null) return false;
  activeCategoryId = inferredId;
  renderCategories();
  return true;
}

function providerRowsForActiveCategory(games){
  const sourceGames = Array.isArray(games) ? games : currentGameList;
  const countByProvider = new Map();
  sourceGames.forEach(game => {
    const code = providerCodeOf(game);
    if(code) countByProvider.set(code, (countByProvider.get(code) || 0) + 1);
  });

  return providersForActiveCategory().sort((a, b) => {
    const ao = Number(a.sortOrder || a.sort_order || 0);
    const bo = Number(b.sortOrder || b.sort_order || 0);
    return (ao - bo) || providerNameOf(a).localeCompare(providerNameOf(b));
  }).map(provider => ({
    code: providerCodeOf(provider),
    provider,
    count: countByProvider.get(providerCodeOf(provider)) || 0
  })).filter(row => row.code);
}

function buildProviderRail(rows){
  const rail = document.createElement('div');
  rail.className = 'provider-side-rail';

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'provider-rail-card provider-rail-all' + (isAllProviderCode(activeProviderCode) ? ' active' : '');
  allBtn.dataset.providerCode = ALL_PROVIDER_CODE;
  allBtn.innerHTML = '<div class="provider-rail-all-icon">All</div>';
  allBtn.addEventListener('click', () => {
    if(isAllProviderCode(activeProviderCode)) return;
    activeProviderCode = ALL_PROVIDER_CODE;
    activeSubCategoryId = null;
    subCategories = [];
    renderSubTabs();
    setGamesLoading();
    loadGames();
  });
  rail.appendChild(allBtn);

  rows.forEach(row => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'provider-rail-card' + (String(row.code) === String(activeProviderCode) ? ' active' : '');
    btn.dataset.providerCode = row.code;
    const name = providerNameOf(row.provider);
    const imageUrl = providerImageOf(row.provider);
    btn.innerHTML = imageUrl
      ? `<img src="${imageUrl}" alt="${name}" loading="lazy">`
      : `<div class="provider-rail-initial">${providerInitials(name)}</div>`;
    btn.addEventListener('click', () => {
      if(String(activeProviderCode) === String(row.code)) return;
      activeProviderCode = row.code;
      activeSubCategoryId = null;
      subCategoryAutoTriedIds = new Set();
      ensureCategoryForSelectedProvider();
      setGamesLoading();
      loadSubCategories();
    });
    rail.appendChild(btn);
  });
  return rail;
}

function renderMixedCategoryLanding(games){
  if(!gameGrid) return;
  showingProviderList = true;
  activeProviderCode = null;
  currentGameList = Array.isArray(games) ? games : [];
  gameGrid.innerHTML = '';
  gameGrid.classList.remove('provider-with-rail', 'provider-grid');
  gameGrid.classList.add('provider-first-grid');

  const providerRows = providerRowsForActiveCategory(currentGameList);
  const selectedCodes = new Set(providerRows.map(row => row.code));
  const directGames = currentGameList.filter(game => !selectedCodes.has(providerCodeOf(game)));

  const shell = document.createElement('div');
  shell.className = 'category-mixed-shell';

  if(providerRows.length){
    const providerSection = document.createElement('section');
    providerSection.className = 'category-provider-section';
    providerSection.innerHTML = '<div class="category-section-title">Providers</div>';
    const cards = document.createElement('div');
    cards.className = 'category-provider-cards';
    providerRows.forEach(row => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-provider-card';
      btn.dataset.providerCode = row.code;
      const image = providerImageOf(row.provider);
      btn.innerHTML = image
        ? `<img src="${image}" alt="${providerNameOf(row.provider)}"><span>${providerNameOf(row.provider)}</span>`
        : `<span class="provider-letter">${providerInitials(providerNameOf(row.provider))}</span><span>${providerNameOf(row.provider)}</span>`;
      btn.addEventListener('click', () => {
        activeProviderCode = row.code;
        activeSubCategoryId = null;
        subCategoryAutoTriedIds = new Set();
        setGamesLoading();
        loadSubCategories();
      });
      cards.appendChild(btn);
    });
    providerSection.appendChild(cards);
    shell.appendChild(providerSection);
  }

  if(directGames.length){
    const gamesSection = document.createElement('section');
    gamesSection.className = 'category-direct-section';
    gamesSection.innerHTML = '<div class="category-section-title">Games</div>';
    const list = document.createElement('div');
    list.className = 'direct-games-list';
    directGames.forEach(game => list.appendChild(createGameCard(game)));
    gamesSection.appendChild(list);
    shell.appendChild(gamesSection);
  }

  if(!providerRows.length && !directGames.length){
    shell.innerHTML = '<div class="empty-state">No provider or game available for this category</div>';
  }
  gameGrid.appendChild(shell);
}

function renderProviderCards(games){
  if(!gameGrid) return;
  showingProviderList = true;
  activeProviderCode = ALL_PROVIDER_CODE;
  currentGameList = Array.isArray(games) ? games : [];
  if(subTabRow){
    subTabRow.innerHTML = '';
    subTabRow.style.display = 'none';
  }
  gameGrid.innerHTML = '';
  gameGrid.classList.remove('provider-grid', 'provider-first-grid');
  gameGrid.classList.add('provider-with-rail');

  const rows = providerRowsForActiveCategory(currentGameList);
  if(!rows.length){
    gameGrid.innerHTML = '<div class="empty-state">No provider available for this category</div>';
    return;
  }

  renderGames(currentGameList);
}

const GAME_RENDER_BATCH_DESKTOP = 48;
const GAME_RENDER_BATCH_MOBILE = 30;
let gameBatchObserver = null;
let gameBatchToken = 0;

function disconnectGameBatchObserver(){
  if(gameBatchObserver){
    gameBatchObserver.disconnect();
    gameBatchObserver = null;
  }
}

function gameRenderBatchSize(){
  return (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
    ? GAME_RENDER_BATCH_MOBILE
    : GAME_RENDER_BATCH_DESKTOP;
}

function createGameCard(item){
  const card=document.createElement('div');
  card.className='game-card provider-launch-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  const imageUrl = getImageUrl(item, frontendGameFallbackImageOf(item), 'game');
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
      <img loading="lazy" decoding="async" fetchpriority="low" class="provider-launch-img"
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
  bindGameImageFallback(img, item);

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

  return card;
}

function renderGames(list){
  if(!gameGrid) return;
  disconnectGameBatchObserver();
  const renderToken = ++gameBatchToken;
  showingProviderList = false;
  gameGrid.classList.remove('provider-grid', 'provider-first-grid');

  const gameList = Array.isArray(list) ? list : [];
  const shouldShowProviderRail = !!activeProviderCode && !isDirectGameCategory() && !isHotMultiProviderGameView();
  const targetGrid = document.createElement('div');
  targetGrid.className = shouldShowProviderRail ? 'provider-games-list' : 'direct-games-list';

  let scrollRoot = null;
  if(shouldShowProviderRail){
    gameGrid.classList.add('provider-with-rail');

    // Reuse the existing lobby so the provider sidebar never refreshes when
    // switching providers/subcategories. Only the right game panel is replaced.
    let lobby = gameGrid.querySelector('.provider-lobby-shell');
    let rail = lobby && lobby.querySelector('.provider-side-rail');
    let panel = lobby && lobby.querySelector('.provider-games-panel');

    if(!lobby || !rail || !panel){
      gameGrid.innerHTML = '';
      const rows = providerRowsForActiveCategory(currentGameList);
      lobby = document.createElement('div');
      lobby.className = 'provider-lobby-shell';
      rail = buildProviderRail(rows);
      lobby.appendChild(rail);
      panel = document.createElement('div');
      panel.className = 'provider-games-panel';
      lobby.appendChild(panel);
      gameGrid.appendChild(lobby);
    }

    syncProviderRailActiveState(rail);
    panel.innerHTML = '';
    panel.appendChild(targetGrid);
    panel.scrollTop = 0;
    scrollRoot = panel;
  }else{
    gameGrid.innerHTML = '';
    gameGrid.classList.remove('provider-with-rail');
    gameGrid.appendChild(targetGrid);
  }

  if(!gameList.length){
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No game available';
    targetGrid.appendChild(empty);
    return;
  }

  let renderedCount = 0;
  const batchSize = gameRenderBatchSize();
  const sentinel = document.createElement('div');
  sentinel.className = 'game-load-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');

  function appendNextBatch(){
    if(renderToken !== gameBatchToken) return;
    const endIndex = Math.min(renderedCount + batchSize, gameList.length);
    const fragment = document.createDocumentFragment();
    for(; renderedCount < endIndex; renderedCount++){
      fragment.appendChild(createGameCard(gameList[renderedCount]));
    }
    targetGrid.insertBefore(fragment, sentinel);
    if(renderedCount >= gameList.length){
      disconnectGameBatchObserver();
      sentinel.remove();
    }
  }

  targetGrid.appendChild(sentinel);
  appendNextBatch();

  if(renderedCount < gameList.length){
    gameBatchObserver = new IntersectionObserver(entries => {
      if(entries.some(entry => entry.isIntersecting)) appendNextBatch();
    }, {
      root: scrollRoot,
      rootMargin: '700px 0px',
      threshold: 0.01
    });
    gameBatchObserver.observe(sentinel);
  }
}

const API_MEMORY_CACHE = new Map();
const API_CACHE_TTL_MS = 2 * 60 * 1000;

function apiCacheKey(url){
  const parsed = new URL(url, window.location.href);
  parsed.searchParams.delete('_t');
  return parsed.toString();
}

function fetchJson(url, options = {}){
  const key = apiCacheKey(url);
  const bypassCache = options && options.bypassCache === true;
  const now = Date.now();
  const memoryHit = API_MEMORY_CACHE.get(key);
  if(!bypassCache && memoryHit && now - memoryHit.time < API_CACHE_TTL_MS){
    return Promise.resolve(memoryHit.data);
  }

  try{
    const stored = bypassCache ? null : sessionStorage.getItem('naga_api_cache:' + key);
    if(stored){
      const parsed = JSON.parse(stored);
      if(parsed && now - Number(parsed.time || 0) < API_CACHE_TTL_MS){
        API_MEMORY_CACHE.set(key, parsed);
        return Promise.resolve(parsed.data);
      }
    }
  }catch(e){}

  return fetch(key, { cache: bypassCache ? 'no-store' : 'default' }).then(res => {
    if(!res.ok) throw new Error('API error: ' + url);
    return res.json();
  }).then(data => {
    const entry = { time: Date.now(), data: data };
    API_MEMORY_CACHE.set(key, entry);
    try{ sessionStorage.setItem('naga_api_cache:' + key, JSON.stringify(entry)); }catch(e){}
    return data;
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

  // Category/provider configuration controls the whole lobby layout, so always
  // fetch it fresh. This prevents an old session cache from treating a newly
  // configured multi-provider HOT category as a direct game list.
  return Promise.all([
    fetchJson(GAME_CATEGORY_API_URL, { bypassCache: true }),
    fetchJson(GAME_PROVIDER_API_URL, { bypassCache: true }).catch(() => ({data: []}))
  ])
    .then(([response, providerResponse]) => {
      providers = normalizeApiList(providerResponse).filter(isActiveItem).sort(sortByOrder);
      categories = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      activeCategoryId = null;
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
    ensureCategoryForSelectedProvider();
  }

  if(!activeCategoryId){
    subCategories = [];
    renderSubTabs();
    return loadGames();
  }

  if(!activeProviderCode || isAllProviderCode(activeProviderCode) || isDirectGameCategory()){
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
      subCategoryAutoTriedIds = new Set();
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
  const params = { lang: currentLang() };
  const hasSelectedProvider = activeProviderCode && !isAllProviderCode(activeProviderCode);

  // The backend resolves both directly assigned games and category provider_rules.
  // Always include categoryId so ALL and SELECTED provider modes use the same
  // authoritative category assignment logic on every frontend request.
  if(categoryIdForRequest) params.categoryId = categoryIdForRequest;
  if(hasSelectedProvider) params.providerCode = activeProviderCode;
  if(activeProviderCode && !isAllProviderCode(activeProviderCode) && subCategoryIdForRequest) params.subCategoryId = subCategoryIdForRequest;

  setGamesLoading();
  const url = buildUrl(GAME_API_URL, params);
  return fetchJson(url)
    .then(response => {
      if(sequence !== gameLoadSequence) return;
      if(String(categoryIdForRequest || '') !== String(activeCategoryId || '')) return;
      if(String(subCategoryIdForRequest || '') !== String(activeSubCategoryId || '')) return;
      const list = normalizeApiList(response).filter(isActiveItem).sort(sortByOrder);
      const categoryProviders = providersForActiveCategory();
      const forceDirect = categoryProviders.length <= 1;
      if(forceDirect && categoryProviders.length === 1 && !activeProviderCode){
        const onlyCode = providerCodeOf(categoryProviders[0]);
        const providerUrl = buildUrl(GAME_API_URL, {categoryId: categoryIdForRequest, providerCode: onlyCode, lang: currentLang()});
        return fetchJson(providerUrl).then(providerResponse => {
          let providerGames = normalizeApiList(providerResponse).filter(isActiveItem).sort(sortByOrder);
          const seen = new Set();
          const combined = [...providerGames, ...list].filter(g => { const key=String(g.id || providerCodeOf(g)+':' +(g.gameCode||g.game_code||g.name)); if(seen.has(key)) return false; seen.add(key); return true; });
          currentGameList = combined; activeProviderCode = null;
          if(subTabRow){ subTabRow.innerHTML=''; subTabRow.style.display='none'; }
          renderGames(combined);
        });
      }else if(isDirectGameCategory() || forceDirect){
        currentGameList = list;
        activeProviderCode = null;
        if(subTabRow){ subTabRow.innerHTML = ''; subTabRow.style.display = 'none'; }
        renderGames(list);
      }else if(activeProviderCode){
        if(isAllProviderCode(activeProviderCode)){
          currentGameList = list;
          renderGames(list);
        }else{
          let providerList = list.filter(item => providerCodeOf(item) === activeProviderCode);
          const rule = providerRuleForCode(activeProviderCode);
          if(rule && String(rule.gameMode || 'ALL').toUpperCase() === 'SELECTED'){
            const allowed = new Set((rule.gameIds || []).map(String));
            providerList = providerList.filter(item => allowed.has(String(item.id)));
          }
          if(!providerList.length && activeSubCategoryId && subCategories.length){
            subCategoryAutoTriedIds.add(String(activeSubCategoryId));
            const nextSub = subCategories.find(sub => !subCategoryAutoTriedIds.has(String(sub.id)));
            if(nextSub){
              activeSubCategoryId = nextSub.id;
              renderSubTabs();
              return loadGames();
            }
          }
          renderGames(providerList);
        }
      }else{
        currentGameList = list;
        // Only the HOT category uses the provider-card landing page.
        // Every other multi-provider category opens directly in the normal
        // provider rail + game grid view, matching the previous frontend layout.
        if(activeCategoryTypeKey() === 'HOT'){
          renderMixedCategoryLanding(list);
        }else{
          renderProviderCards(list);
        }
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
    subCategoryAutoTriedIds = new Set();
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
    centerActiveMobileSubCategory();
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
  if(!slider || !Array.isArray(banners) || !banners.length) return;

  // Build the complete slider off-DOM, then swap once. This prevents the
  // visible slider from becoming empty for a frame while API banners replace
  // the fallback banners.
  const fragment = document.createDocumentFragment();
  const track = document.createElement('div');
  const dots = document.createElement('div');
  const timer = document.createElement('div');
  const timerSpan = document.createElement('span');

  track.className = 'slider-track';
  dots.className = 'dots';
  timer.className = 'slider-timer';
  timer.appendChild(timerSpan);

  banners.forEach((item, index) => {
    const img = document.createElement('img');
    img.className = 'slide' + (index === 0 ? ' active' : '');
    img.src = getImageUrl(item, '', 'slider');
    img.alt = langText(item, 'title', 'Slider Banner');
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';
    if(index === 0) img.fetchPriority = 'high';
    if(item.linkUrl || item.link_url){
      img.dataset.linkUrl = item.linkUrl || item.link_url;
    }
    track.appendChild(img);

    const dot = document.createElement('span');
    if(index === 0) dot.className = 'active';
    dots.appendChild(dot);
  });

  fragment.appendChild(track);
  fragment.appendChild(dots);
  fragment.appendChild(timer);
  slider.replaceChildren(fragment);
  slider.classList.add('slider-ready');
}

function preloadSliderBanners(banners){
  return Promise.all(banners.map(item => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = getImageUrl(item, '', 'slider');
    if(image.decode) image.decode().then(() => resolve(true)).catch(() => {});
  })));
}

function loadSliderBanners(){
  return fetch(SLIDER_API_URL, { cache: 'no-store' })
    .then(res => {
      if(!res.ok) throw new Error('Slider API error');
      return res.json();
    })
    .then(async data => {
      const banners = normalizeSliderResponse(data)
        .filter(item => Number(item.status || 1) === 1)
        .filter(item => item.imageUrl || item.image_url || item.image)
        .sort((a, b) => (Number(a.sortOrder || a.sort_order || 0) - Number(b.sortOrder || b.sort_order || 0)) || (Number(b.id || 0) - Number(a.id || 0)));

      if(!banners.length) return;

      const preloadResults = await preloadSliderBanners(banners);
      const readyBanners = banners.filter((_, index) => preloadResults[index] !== false);
      if(!readyBanners.length) return;
      sliderBannerCache = readyBanners;
      document.querySelectorAll('.side-slider').forEach(slider => {
        renderSliderBanners(slider, readyBanners);
      });
    })
    .catch(err => {
      console.warn('Using default slider banners:', err.message);
    });
}

loadSliderBanners().then(() => {
  document.querySelectorAll('.side-slider').forEach(initSlider);
});

// Referral sharing is handled by assets/js/referral-share.js.

// Final scroll container and back-to-top behaviour
(function(){
  function q(sel){ return document.querySelector(sel); }
  function getScrollTarget(){
    if (window.matchMedia('(min-width: 769px)').matches) {
      return q('.provider-games-panel') || q('.game-grid') || document.scrollingElement || document.documentElement;
    }
    return q('.provider-games-panel') || document.scrollingElement || document.documentElement;
  }
  function ensureBtn(){
    var btn = document.getElementById('nagaScrollTopBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'nagaScrollTopBtn';
      btn.className = 'naga-scroll-top-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label','Back to top');
      btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
      document.body.appendChild(btn);
    }
    return btn;
  }
  function bind(){
    var btn = ensureBtn();
    var currentTarget = null;
    function update(){
      var t = getScrollTarget();
      var st = t === document.scrollingElement || t === document.documentElement ? (window.pageYOffset || document.documentElement.scrollTop || 0) : t.scrollTop;
      btn.classList.toggle('show', st > 160);
      if(t !== currentTarget){
        if(currentTarget && currentTarget.removeEventListener) currentTarget.removeEventListener('scroll', update);
        currentTarget = t;
        if(currentTarget && currentTarget.addEventListener) currentTarget.addEventListener('scroll', update, {passive:true});
      }
    }
    btn.onclick = function(){
      var t = getScrollTarget();
      if(t === document.scrollingElement || t === document.documentElement){ window.scrollTo({top:0, behavior:'smooth'}); }
      else { t.scrollTo({top:0, behavior:'smooth'}); }
    };
    window.addEventListener('resize', function(){ setTimeout(update, 80); }, {passive:true});
    window.addEventListener('scroll', update, {passive:true});
    document.addEventListener('click', function(){ setTimeout(update, 180); }, true);
    setInterval(update, 1200);
    setTimeout(update, 300);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();

// Independent provider/game scrolling with a stable viewport height.
// This removes content auto-height jumps when game images finish loading.
(function(){
  var resizeTimer = 0;
  var observedShell = null;

  function viewportHeight(){
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  }

  function setLobbyHeight(){
    var shell = document.querySelector('.provider-lobby-shell');
    if(!shell){
      document.body.classList.remove('provider-lobby-active');
      observedShell = null;
      return;
    }

    document.body.classList.add('provider-lobby-active');
    var rect = shell.getBoundingClientRect();
    var bottomGap = window.matchMedia('(max-width: 768px)').matches ? 72 : 12;
    var available = Math.floor(viewportHeight() - rect.top - bottomGap);
    var minimum = window.matchMedia('(max-width: 768px)').matches ? 220 : 280;
    shell.style.setProperty('--provider-lobby-height', Math.max(minimum, available) + 'px');

    if(observedShell !== shell){
      observedShell = shell;
      bindScrollArea(shell.querySelector('.provider-side-rail'));
      bindScrollArea(shell.querySelector('.provider-games-panel'));
    }
  }

  function bindScrollArea(el){
    if(!el || el.dataset.independentScrollBound === '1') return;
    el.dataset.independentScrollBound = '1';

    // Keep wheel/trackpad input inside the hovered column.
    el.addEventListener('wheel', function(e){
      if(el.scrollHeight <= el.clientHeight) return;
      var atTop = el.scrollTop <= 0;
      var atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
      if((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)){
        e.preventDefault();
      }
      e.stopPropagation();
    }, {passive:false});

    // Stop touch gestures from bubbling to the page while preserving native momentum.
    el.addEventListener('touchstart', function(e){ e.stopPropagation(); }, {passive:true});
    el.addEventListener('touchmove', function(e){ e.stopPropagation(); }, {passive:true});
  }

  function schedule(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ requestAnimationFrame(setLobbyHeight); }, 40);
  }

  var observer = new MutationObserver(schedule);
  function start(){
    observer.observe(document.body, {childList:true, subtree:true});
    setLobbyHeight();
    window.addEventListener('resize', schedule, {passive:true});
    window.addEventListener('orientationchange', schedule, {passive:true});
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize', schedule, {passive:true});
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();


document.addEventListener('DOMContentLoaded',function(){
  document.querySelectorAll('img').forEach(function(img){
    if(!img.loading) img.loading='lazy';
  });
});
