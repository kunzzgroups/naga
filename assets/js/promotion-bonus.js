(function(){
  const api = () => window.NAGA_API || {};
  const money = v => (v == null || v === '') ? '' : Number(v).toFixed(2);
  const token = () => localStorage.getItem('member_token') || '';
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const strip = v => String(v || '').replace(/<[^>]*>/g,'').trim();

  function toast(msg){
    let t = document.getElementById('promoToast');
    if(!t){
      t = document.createElement('div');
      t.id = 'promoToast';
      t.className = 'promo-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(window.__promoToastTimer);
    window.__promoToastTimer = setTimeout(() => t.hidden = true, 2600);
  }

  function safeDetailHtml(raw){
    const v = String(raw || '').trim();
    if(!v) return '';
    return v
      .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi,'')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'')
      .replace(/javascript:/gi,'');
  }

  function amountText(p){
    if(p.bonusType === 'PERCENTAGE') return (p.bonusPercentage || 0) + '% Bonus';
    if(p.bonusType === 'RANDOM') return money(p.bonusRandomMin) + ' - ' + money(p.bonusRandomMax);
    return money(p.bonusFixedAmount);
  }

  function defaultDetail(p){
    const rows = [];
    if(p.minTopupAmount) rows.push('✅ Min Deposit ' + money(p.minTopupAmount));
    if(p.maxTopupAmount) rows.push('✅ Max Deposit ' + money(p.maxTopupAmount));
    if(p.claimLimit != null) rows.push('✅ Claim Limit ' + p.claimLimit + ' / ' + (p.claimReset || 'NONE'));
    if(p.rollover) rows.push('✅ Rollover X' + p.rollover);
    if(p.turnover) rows.push('✅ Turnover X' + p.turnover);
    if(p.maxWithdraw) rows.push('✅ Max Withdraw ' + money(p.maxWithdraw));
    if(p.allowedGames) rows.push('✅ Allowed Game / Provider: ' + esc(p.allowedGames));
    const rowHtml = rows.length ? rows.map(x => `<p>${x}</p>`).join('') : '<p>Check with customer service for requirement.</p>';
    return `<h2>${esc(p.name || 'Promotion')}</h2><p><b>Bonus:</b> ${esc(amountText(p))}</p><p><b>Requirements:</b></p>${rowHtml}${p.description ? '<hr><div>' + esc(p.description).replace(/\n/g,'<br>') + '</div>' : ''}`;
  }

  function closeDetail(){
    const overlay = document.getElementById('bonusDetailOverlay');
    if(!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }

  function openDetail(p){
    const overlay = document.getElementById('bonusDetailOverlay');
    const title = document.getElementById('bonusDetailTitle');
    const content = document.querySelector('.bonus-detail-content');
    if(!overlay || !content) return;

    if(title) title.textContent = p.name || 'Promotion Bonus';
    const html = safeDetailHtml(p.detailText) || defaultDetail(p);
    const needsBase = p.claimCondition === 'DEPOSIT' || p.claimCondition === 'FIRST_DEPOSIT' || p.claimCondition === 'DAILY_FIRST_DEPOSIT' || p.bonusType === 'PERCENTAGE';

    content.innerHTML = `
      <div class="promo-detail-admin-content">${html}</div>
      <div class="promo-modal-claim-line"></div>
      ${needsBase ? '<input class="promo-modal-base-input" id="promoModalBaseAmount" type="number" step="0.01" placeholder="Deposit amount">' : ''}
      <div class="promo-detail-actions">
        <button class="promo-modal-claim-btn" id="promoModalClaimBtn" type="button" data-id="${esc(p.id)}">CLAIM NOW</button>
        <button class="bonus-close-btn" id="promoModalCloseBtn" type="button">Close</button>
      </div>`;

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');

    const closeBtn = document.getElementById('promoModalCloseBtn');
    if(closeBtn) closeBtn.onclick = closeDetail;
  }

  function clsNum(prefix, n, def, max){
    n = Number(n || def);
    if(!n || n < 1) n = def;
    if(max && n > max) n = max;
    return prefix + n;
  }

  function titleHtml(group){
    const img = group.titleImageUrl || group.titleImage;
    if(img) return `<img class="bonus-title-img" src="${esc(img)}" alt="${esc(group.title)}">`;
    return `<h2 class="bonus-text-title">${esc(group.title || 'Promotion')}</h2>`;
  }

  function cardHtml(p){
    const cls = ['bonus-card','promo-image-card','promo-card'];
    if(Number(p.desktopSpan) > 1) cls.push('d-span-' + Number(p.desktopSpan));
    if(Number(p.mobileSpan) > 1) cls.push('m-span-' + Number(p.mobileSpan));
    const img = p.bonusImageUrl || 'assets/images/bonus/bonus.png';
    const href = p.linkUrl || '#';
    const linkAttr = p.linkUrl ? ' data-external="1"' : '';
    return `<a class="${cls.join(' ')}" href="${esc(href)}" data-id="${esc(p.id)}" data-title="${esc(p.name || 'Promotion')}"${linkAttr}><img src="${esc(img)}" alt="${esc(p.name || 'Promotion')}"></a>`;
  }

  function groupRows(rows){
    const map = new Map();
    rows.forEach(p => {
      const key = String(p.bonusCategoryTitleId || 'uncategorized');
      if(!map.has(key)) map.set(key, {
        title: p.bonusCategoryTitleName || 'Promotion Bonus',
        titleImageUrl: p.bonusCategoryTitleImageUrl || '',
        titleImage: p.bonusCategoryTitleImage || '',
        sortOrder: Number(p.bonusCategorySortOrder || 0),
        items: []
      });
      map.get(key).items.push(p);
    });
    return Array.from(map.values())
      .map(g => { g.items.sort((a,b)=>Number(a.displayOrder||0)-Number(b.displayOrder||0)); return g; })
      .sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0));
  }

  async function claimPromotion(id, btn){
    if(!token()){
      location.href = 'login.html';
      return;
    }
    const p = (window.__promotionRows || []).find(x => String(x.id) === String(id));
    const baseInput = document.getElementById('promoModalBaseAmount');
    if(btn){ btn.disabled = true; btn.textContent = 'CLAIMING...'; }
    try{
      const r = await fetch(api().playerPromotionClaim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: JSON.stringify({ id: Number(id), baseAmount: baseInput && baseInput.value ? Number(baseInput.value) : 0 })
      });
      const j = await r.json();
      if(j.status === 'error') throw new Error(j.message || 'Claim failed');
      const d = j.data || {};
      const extra = (d.requiredTurnover && Number(d.requiredTurnover) > 0) ? (' | Required Turnover: ' + money(d.requiredTurnover)) : ((d.requiredRollover && Number(d.requiredRollover) > 0) ? (' | Required Rollover: ' + money(d.requiredRollover)) : '');
      toast('Claim success. Bonus: ' + money(d.bonusAmount) + extra);
      closeDetail();
      if(window.MemberAuth && window.MemberAuth.refreshWalletBalance) window.MemberAuth.refreshWalletBalance();
    }catch(err){
      toast(err.message || 'Claim failed');
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = 'CLAIM NOW'; }
    }
  }

  async function load(){
    const boxes = Array.from(document.querySelectorAll('#dynamicPromotionBox, [data-promotion-box]'));
    if(!boxes.length || !api().playerPromotionList) return;
    try{
      const r = await fetch(api().playerPromotionList);
      const j = await r.json();
      const rows = Array.isArray(j.data) ? j.data : [];
      if(!rows.length) return;
      window.__promotionRows = rows;
      const groups = groupRows(rows);
      const html = groups.map(g => {
        const first = g.items[0] || {};
        const gridCls = 'bonus-grid ' + clsNum('d-cols-', first.desktopColumns, 2, 6) + ' ' + clsNum('m-cols-', first.mobileColumns, 1, 3) + (Number(first.singleLeft) === 1 ? ' single-left' : '');
        return `<div class="bonus-section promo-dynamic-section">${titleHtml(g)}<div class="${gridCls}">${g.items.map(cardHtml).join('')}</div></div>`;
      }).join('');

      boxes.forEach(box => {
        box.innerHTML = html;
        const container = box.closest('.bonus-container');
        if(container) Array.from(container.children).forEach(el => { if(el !== box && el.classList && el.classList.contains('bonus-section')) el.style.display = 'none'; });
      });
      const loading = document.getElementById('bonusLoading');
      if(loading) loading.style.display = 'none';
    }catch(e){
      console.warn('Promotion load failed', e);
    }
  }

  document.addEventListener('click', e => {
    const claimBtn = e.target.closest('#promoModalClaimBtn');
    if(claimBtn){ claimPromotion(claimBtn.dataset.id, claimBtn); return; }

    const card = e.target.closest('.promo-card[data-id]');
    if(card){
      if(card.dataset.external === '1') return;
      e.preventDefault();
      const p = (window.__promotionRows || []).find(x => String(x.id) === String(card.dataset.id));
      if(p) openDetail(p);
    }
  });

  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeDetail(); });
  const overlay = document.getElementById('bonusDetailOverlay');
  if(overlay) overlay.addEventListener('click', e => { if(e.target === overlay) closeDetail(); });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
