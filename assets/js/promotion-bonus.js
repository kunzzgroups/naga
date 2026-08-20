(function(){
  const api = () => window.NAGA_API || {};
  const money = v => (v == null || v === '') ? '' : Number(v).toFixed(2);
  const token = () => localStorage.getItem('member_token') || '';
  const esc = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const strip = v => String(v || '').replace(/<[^>]*>/g,'').trim();
  const tr = (key, fallback) => { const v=window.I18N && typeof window.I18N.t==='function' ? window.I18N.t(key) : ''; return (!v || v===key) ? fallback : v; };
  const currentLang = () => (window.I18N && window.I18N.current) || localStorage.getItem('site_lang') || 'en';

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
    if(p.bonusType === 'PERCENTAGE') return (p.bonusPercentage || 0) + '% ' + tr('promotion_bonus_word','Bonus');
    if(p.bonusType === 'RANDOM') return money(p.bonusRandomMin) + ' - ' + money(p.bonusRandomMax);
    return money(p.bonusFixedAmount);
  }

  function defaultDetail(p){
    const rows = [];
    const resetKey=String(p.claimReset||'NONE').toLowerCase();
    const resetLabel=tr('promotion_reset_'+resetKey, p.claimReset || 'NONE');
    if(p.minTopupAmount) rows.push('✅ ' + tr('promotion_min_deposit','Min Deposit') + ' ' + money(p.minTopupAmount));
    if(p.maxTopupAmount) rows.push('✅ ' + tr('promotion_max_deposit','Max Deposit') + ' ' + money(p.maxTopupAmount));
    if(p.claimLimit != null) rows.push('✅ ' + tr('promotion_claim_limit','Claim Limit') + ' ' + p.claimLimit + ' / ' + resetLabel);
    if(p.rollover) rows.push('✅ ' + tr('promotion_rollover','Rollover') + ' X' + p.rollover);
    if(p.turnover) rows.push('✅ ' + tr('promotion_turnover','Turnover') + ' X' + p.turnover);
    if(p.maxWithdraw) rows.push('✅ ' + tr('promotion_max_withdraw','Max Withdraw') + ' ' + money(p.maxWithdraw));
    if(p.allowedGames) rows.push('✅ ' + tr('promotion_allowed_game_provider','Allowed Game / Provider') + ': ' + esc(p.allowedGames));
    const rowHtml = rows.length ? rows.map(x => `<p>${x}</p>`).join('') : '<p>' + esc(tr('promotion_check_customer_service','Check with customer service for requirement.')) + '</p>';
    return `<h2>${esc(p.name || tr('promotion_default_title','Promotion'))}</h2><p><b>${esc(tr('promotion_bonus_label','Bonus:'))}</b> ${esc(amountText(p))}</p><p><b>${esc(tr('promotion_requirements_label','Requirements:'))}</b></p>${rowHtml}${p.description ? '<hr><div>' + esc(p.description).replace(/\n/g,'<br>') + '</div>' : ''}`;
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

    if(title) title.textContent = p.name || tr('promotion_default_section_title','Promotion Bonus');
    const html = safeDetailHtml(p.detailText) || defaultDetail(p);
    const needsBase = p.claimCondition === 'DEPOSIT' || p.claimCondition === 'FIRST_DEPOSIT' || p.claimCondition === 'DAILY_FIRST_DEPOSIT' || p.bonusType === 'PERCENTAGE';

    content.innerHTML = `
      <div class="promo-detail-admin-content">${html}</div>
      <div class="promo-modal-claim-line"></div>
      ${needsBase ? '<input class="promo-modal-base-input" id="promoModalBaseAmount" type="number" step="0.01" placeholder="' + esc(tr('promotion_deposit_amount','Deposit amount')) + '">' : ''}
      <div class="promo-detail-actions">
        <button class="promo-modal-claim-btn" id="promoModalClaimBtn" type="button" data-id="${esc(p.id)}">${esc(tr('promotion_claim_now','CLAIM NOW'))}</button>
        <button class="bonus-close-btn" id="promoModalCloseBtn" type="button">${esc(tr('promotion_close','Close'))}</button>
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
    return `<h2 class="bonus-text-title">${esc(group.title || tr('promotion_default_title','Promotion'))}</h2>`;
  }



  function promotionGridColumnCount(grid){
    const mobile = window.matchMedia('(max-width: 900px)').matches;
    const prefix = mobile ? 'm-cols-' : 'd-cols-';
    const max = mobile ? 3 : 6;
    for(let n=1;n<=max;n++) if(grid.classList.contains(prefix+n)) return n;
    return mobile ? 1 : 2;
  }

  function syncPromotionTitleSpacing(root){
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.promo-dynamic-section .bonus-title-img').forEach(img => {
      const apply = () => {
        const renderedHeight = img.getBoundingClientRect().height;
        if(!renderedHeight) return;
        // Keep the visual title-to-card spacing consistent even when a BO-uploaded
        // title image has a much taller transparent canvas than the built-in artwork.
        const normalTitleBlockHeight = 54;
        const normalBottomGap = 12;
        const transparentCanvasExcess = Math.max(0, renderedHeight - normalTitleBlockHeight);
        img.style.marginBottom = (normalBottomGap - transparentCanvasExcess).toFixed(3) + 'px';
      };
      apply();
      if(!img.complete) img.addEventListener('load', apply, {once:true});
    });
  }

  function syncPromotionGridHeights(root){
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.promo-dynamic-section .bonus-grid').forEach(grid => {
      const columns = promotionGridColumnCount(grid);
      const styles = getComputedStyle(grid);
      const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
      const width = grid.getBoundingClientRect().width;
      if(!width || columns < 1) return;
      const oneColumnWidth = (width - gap * (columns - 1)) / columns;
      // All uploaded promotion artwork is based on a 7:5 single-card canvas.
      const rowHeight = oneColumnWidth * 5 / 7;
      grid.style.setProperty('--promo-row-height', rowHeight.toFixed(3) + 'px');
    });
  }

  let promotionGridResizeTimer = 0;
  function schedulePromotionGridHeightSync(){
    clearTimeout(promotionGridResizeTimer);
    promotionGridResizeTimer = setTimeout(() => { syncPromotionTitleSpacing(document); syncPromotionGridHeights(document); }, 40);
  }

  function cardHtml(p){
    const cls = ['bonus-card','promo-image-card','promo-card'];
    if(Number(p.desktopSpan) > 1) cls.push('d-span-' + Number(p.desktopSpan));
    if(Number(p.mobileSpan) > 1) cls.push('m-span-' + Number(p.mobileSpan));
    const img = p.bonusImageUrl || 'assets/images/bonus/bonus.png';
    const href = p.linkUrl || '#';
    const linkAttr = p.linkUrl ? ' data-external="1"' : '';
    return `<a class="${cls.join(' ')}" href="${esc(href)}" data-id="${esc(p.id)}" data-title="${esc(p.name || tr('promotion_default_title','Promotion'))}"${linkAttr}><img src="${esc(img)}" alt="${esc(p.name || tr('promotion_default_title','Promotion'))}"></a>`;
  }

  function groupRows(rows){
    const map = new Map();
    // The player API is the source of truth for promotion visibility. Every row
    // returned by the API represents one BO promotion and must render exactly once.
    // Do not de-duplicate by name/code here, otherwise separate BO rows can silently
    // disappear from the frontend.
    rows.forEach(raw => {
      const p = Object.assign({}, raw || {});
      const key = String(p.bonusCategoryTitleId || 'uncategorized');
      if(!map.has(key)) map.set(key, {
        title: p.bonusCategoryTitleName || tr('promotion_default_section_title','Promotion Bonus'),
        titleImageUrl: p.bonusCategoryTitleImageUrl || '',
        titleImage: p.bonusCategoryTitleImage || '',
        sortOrder: Number(p.bonusCategorySortOrder || 0),
        items: []
      });
      map.get(key).items.push(p);
    });
    return Array.from(map.values())
      .map(g => { g.items.sort((a,b)=>Number(a.displayOrder||0)-Number(b.displayOrder||0) || Number(a.id||0)-Number(b.id||0)); return g; })
      .sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0));
  }

  async function claimPromotion(id, btn){
    if(!token()){
      location.href = 'login.html';
      return;
    }
    const p = (window.__promotionRows || []).find(x => String(x.id) === String(id));
    const baseInput = document.getElementById('promoModalBaseAmount');
    if(btn){ btn.disabled = true; btn.textContent = tr('promotion_claiming','CLAIMING...'); }
    try{
      const r = await fetch(api().playerPromotionClaim, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: JSON.stringify({ id: Number(id), baseAmount: baseInput && baseInput.value ? Number(baseInput.value) : 0 })
      });
      const j = await r.json();
      if(j.status === 'error') throw new Error(j.message || tr('promotion_claim_failed','Claim failed'));
      const d = j.data || {};
      const extra = (d.requiredTurnover && Number(d.requiredTurnover) > 0) ? (' | ' + tr('promotion_required_turnover','Required Turnover:') + ' ' + money(d.requiredTurnover)) : ((d.requiredRollover && Number(d.requiredRollover) > 0) ? (' | ' + tr('promotion_required_rollover','Required Rollover:') + ' ' + money(d.requiredRollover)) : '');
      toast(tr('promotion_claim_success','Claim success. Bonus:') + ' ' + money(d.bonusAmount) + extra);
      closeDetail();
      document.dispatchEvent(new CustomEvent('naga:promotion-access-changed'));
      if(window.MemberAuth && window.MemberAuth.refreshWalletBalance) window.MemberAuth.refreshWalletBalance();
    }catch(err){
      toast(err.message || tr('promotion_claim_failed','Claim failed'));
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = tr('promotion_claim_now','CLAIM NOW'); }
    }
  }

  let promotionLoadSequence=0;
  async function load(){
    const thisLoad=++promotionLoadSequence;
    if(window.NAGA_HOME_BONUS_ENABLED === false) return;
    const boxes = Array.from(document.querySelectorAll('#dynamicPromotionBox, [data-promotion-box]'));
    if(!boxes.length || !api().playerPromotionList) return;

    // Never render bundled/static promotion cards. The visible layout must come only
    // from the latest database response. Clear first so refresh cannot flash old data.
    boxes.forEach(box=>{
      box.innerHTML='';
      const container=box.closest('.bonus-container');
      if(container) container.querySelectorAll('.promo-static-fallback, :scope > .bonus-section:not(.promo-dynamic-section)').forEach(el=>{ el.hidden=true; el.style.display='none'; });
    });
    try{
      const separator=api().playerPromotionList.includes('?')?'&':'?';
      const query=new URLSearchParams({lang:currentLang(),_:String(Date.now())});
      const r = await fetch(api().playerPromotionList+separator+query.toString(), {cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      const j = await r.json();
      if(thisLoad!==promotionLoadSequence) return;
      const rows = Array.isArray(j.data) ? j.data : [];
      if(!rows.length){ const loading=document.getElementById('bonusLoading'); if(loading) loading.style.display='none'; return; }
      window.__promotionRows = rows;
      const groups = groupRows(rows);
      const html = groups.map(g => {
        const first = g.items[0] || {};
        // Section values are already synchronized by the API. Render the exact
        // database values from the first ordered item; each card keeps its own span.
        const desktopColumns = Math.max(1, Math.min(6, Number(first.desktopColumns ?? 2)));
        const mobileColumns = Math.max(1, Math.min(3, Number(first.mobileColumns ?? 1)));
        // single-left is meaningful only when the category contains one visible card.
        const singleLeft = g.items.length === 1 && Number(first.singleLeft) === 1;
        const gridCls = 'bonus-grid ' + clsNum('d-cols-', desktopColumns, 2, 6) + ' ' + clsNum('m-cols-', mobileColumns, 1, 3) + (singleLeft ? ' single-left' : '');
        return `<div class="bonus-section promo-dynamic-section">${titleHtml(g)}<div class="${gridCls}">${g.items.map(cardHtml).join('')}</div></div>`;
      }).join('');

      boxes.forEach(box => {
        box.innerHTML = html;
        const container = box.closest('.bonus-container');
        if(container) Array.from(container.children).forEach(el => { if(el !== box && el.classList && el.classList.contains('bonus-section')) el.style.display = 'none'; });
      });
      syncPromotionTitleSpacing(document);
      syncPromotionGridHeights(document);
      requestAnimationFrame(() => { syncPromotionTitleSpacing(document); syncPromotionGridHeights(document); });
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

  document.addEventListener('naga:home-bonus-display', function(event){ if(event.detail && event.detail.enabled) load(); });
  document.addEventListener('i18n:changed', function(){ load(); });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();

  window.addEventListener('resize', schedulePromotionGridHeightSync, {passive:true});
  window.addEventListener('orientationchange', schedulePromotionGridHeightSync, {passive:true});
  window.addEventListener('load', schedulePromotionGridHeightSync, {once:true});

})();
