const bonusContainer = document.getElementById('bonusContainer');
const bonusDetailOverlay = document.getElementById('bonusDetailOverlay');
const bonusCloseBtn = document.getElementById('bonusCloseBtn');
const bonusDetailTitle = document.getElementById('bonusDetailTitle');

const BONUS_API = (window.NAGA_API || {});
const BONUS_TITLE_API = BONUS_API.bonusCategoryTitleList || ((window.NAGA_CONFIG?.api?.baseUrl || 'http://localhost:8080') + '/api/bonus-category-title');
const BONUS_ITEM_API = BONUS_API.bonusCategoryItemList || ((window.NAGA_CONFIG?.api?.baseUrl || 'http://localhost:8080') + '/api/bonus-category-item');

function openBonusDetail(title){
  if(!bonusDetailOverlay) return;
  if(bonusDetailTitle && title) bonusDetailTitle.textContent = title + ' Bonus To Win';
  bonusDetailOverlay.classList.add('show');
  bonusDetailOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeBonusDetail(){
  if(!bonusDetailOverlay) return;
  bonusDetailOverlay.classList.remove('show');
  bonusDetailOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeUrl(value, fallback = '#'){
  const url = String(value || '').trim();
  if(!url) return fallback;
  if(url.startsWith('javascript:')) return fallback;
  return url;
}

function normalizeClass(value, fallback){
  return String(value || fallback).replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || fallback;
}

function getResponseData(json){
  if(Array.isArray(json)) return json;
  if(Array.isArray(json?.data)) return json.data;
  if(Array.isArray(json?.result)) return json.result;
  return [];
}

function sortBySortOrderThenId(a, b){
  const sortA = Number(a?.sortOrder ?? 0);
  const sortB = Number(b?.sortOrder ?? 0);
  if(sortA !== sortB) return sortA - sortB;
  return Number(a?.id ?? 0) - Number(b?.id ?? 0);
}

async function fetchJson(url){
  const response = await fetch(url, { method: 'GET' });
  if(!response.ok) throw new Error('API error: ' + response.status);
  return response.json();
}

async function loadBonusData(){
  if(!bonusContainer) return;

  try{
    bonusContainer.innerHTML = '<div class="bonus-loading">Loading bonus...</div>';

    const [titleJson, itemJson] = await Promise.all([
      fetchJson(BONUS_TITLE_API + '?page=1&size=100'),
      fetchJson(BONUS_ITEM_API)
    ]);

    const titles = getResponseData(titleJson)
      .filter(item => Number(item.status ?? 1) === 1)
      .sort(sortBySortOrderThenId);

    const items = getResponseData(itemJson)
      .filter(item => Number(item.status ?? 1) === 1)
      .sort(sortBySortOrderThenId);

    renderBonusSections(titles, items);
  }catch(error){
    console.error('Bonus API load failed:', error);
    bonusContainer.innerHTML = `
      <div class="bonus-empty">
        <div>Unable to load bonus list.</div>
        <button type="button" class="bonus-retry-btn" id="bonusRetryBtn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('bonusRetryBtn');
    if(retryBtn) retryBtn.addEventListener('click', loadBonusData);
  }
}

function renderBonusSections(titles, items){
  if(!bonusContainer) return;

  if(!titles.length){
    bonusContainer.innerHTML = '<div class="bonus-empty">No bonus category found.</div>';
    return;
  }

  const itemsByTitle = new Map();
  items.forEach(item => {
    const titleId = Number(item.bonusCategoryTitleId);
    if(!itemsByTitle.has(titleId)) itemsByTitle.set(titleId, []);
    itemsByTitle.get(titleId).push(item);
  });

  const html = titles.map(title => {
    const titleItems = itemsByTitle.get(Number(title.id)) || [];
    if(!titleItems.length) return '';

    const groups = groupItemsByGridClass(titleItems);
    const titleImage = title.imageUrl || title.image || 'assets/images/bonus/bonus_text.png';
    const titleName = title.name || 'Bonus';

    return `
      <div class="bonus-section" data-title-id="${escapeHtml(title.id)}">
        <img class="bonus-title-img" src="${escapeHtml(titleImage)}" alt="${escapeHtml(titleName)}">
        ${groups.map(group => renderBonusGrid(group)).join('')}
      </div>
    `;
  }).join('');

  bonusContainer.innerHTML = html || '<div class="bonus-empty">No bonus item found.</div>';
  bindBonusCards();
}

function groupItemsByGridClass(items){
  const groups = [];

  items.forEach(item => {
    const gridClass = normalizeClass(item.gridClass, 'bonus-grid d-cols-2 m-cols-1');
    const lastGroup = groups[groups.length - 1];

    if(lastGroup && lastGroup.gridClass === gridClass){
      lastGroup.items.push(item);
    }else{
      groups.push({ gridClass, items: [item] });
    }
  });

  return groups;
}

function renderBonusGrid(group){
  return `
    <div class="${escapeHtml(group.gridClass)}">
      ${group.items.map(renderBonusCard).join('')}
    </div>
  `;
}

function renderBonusCard(item){
  const cardClass = normalizeClass(item.cardClass, 'bonus-card');
  const imageUrl = item.imageUrl || item.image || 'assets/images/bonus/bonus.png';
  const title = item.name || item.bonusCategoryTitleName || 'Bonus';
  const linkUrl = safeUrl(item.linkUrl, '#');

  return `
    <a class="${escapeHtml(cardClass)}" href="${escapeHtml(linkUrl)}" data-title="${escapeHtml(title)}">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">
    </a>
  `;
}

function bindBonusCards(){
  document.querySelectorAll('.bonus-card').forEach(card => {
    card.addEventListener('click', e => {
      const href = card.getAttribute('href') || '#';
      const hasRealLink = href && href !== '#';

      if(!hasRealLink){
        e.preventDefault();
        const title = card.getAttribute('data-title') || card.querySelector('img')?.alt || 'OP7';
        openBonusDetail(title);
      }
    });
  });
}

if(bonusCloseBtn){
  bonusCloseBtn.addEventListener('click', closeBonusDetail);
}

if(bonusDetailOverlay){
  bonusDetailOverlay.addEventListener('click', e => {
    if(e.target === bonusDetailOverlay) closeBonusDetail();
  });
}

document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeBonusDetail();
});

document.addEventListener('DOMContentLoaded', loadBonusData);
