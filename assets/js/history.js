(function(){
  const historyTabs = document.querySelectorAll('.history-tab');
  const transactionPanel = document.getElementById('transactionsPanel');
  const betPanel = document.getElementById('betPanel');
  const transactionsBody = document.getElementById('transactionsBody');
  const betBody = document.getElementById('betBody');
  const transactionsLazyStatus = document.getElementById('transactionsLazyStatus');
  const betLazyStatus = document.getElementById('betLazyStatus');
  const PAGE_SIZE = 8;
  const SCROLL_OFFSET = 280;
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  const TX_URL = (window.NAGA_API && window.NAGA_API.playerHistoryTransactions) || (API_BASE + '/api/player/history/transactions');
  const BET_URL = (window.NAGA_API && window.NAGA_API.playerHistoryBets) || (API_BASE + '/api/player/history/bets');

  const lazyState = {
    transactions: {visible: 0, loading: false, body: transactionsBody, statusEl: transactionsLazyStatus, records: []},
    bet: {visible: 0, loading: false, body: betBody, statusEl: betLazyStatus, records: []}
  };

  function tr(key){ return window.I18N && window.I18N.t ? window.I18N.t(key) : key; }
  function token(){ return localStorage.getItem('member_token') || ''; }
  function requireLogin(){ if(!token()){ location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname.split('/').pop() || 'history.html'); return false; } return true; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function num(v){ const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
  function money(v){ return 'MYR ' + num(v).toFixed(2); }
  function formatDate(v){ if(!v) return '-'; const d = new Date(String(v).replace(' ', 'T')); if(isNaN(d)) return esc(v); return d.toLocaleString(undefined,{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
  function txClass(type){ type=String(type||'').toUpperCase(); if(type.includes('DEPOSIT')||type==='TRANSFER_IN'||type==='BONUS'||type==='REFERRAL_REWARD') return 'deposit'; if(type.includes('WITHDRAW')||type==='TRANSFER_OUT') return 'withdraw'; return ''; }
  function txName(type){ type=String(type||'TRANSACTION').trim().toUpperCase().replace(/[\s-]+/g,'_'); const key='history_type_'+type.toLowerCase(); const translated=tr(key); return translated!==key ? translated : type.replace(/_/g,' '); }
  function statusLabel(status){ const key='history_status_'+String(status||'').toLowerCase(); const translated=tr(key); return translated!==key ? translated : status.toUpperCase(); }
  function statusName(s){ s=String(s||'SUCCESS').toUpperCase(); if(s==='SUCCESS'||s==='APPROVED'||s==='COMPLETED') return 'completed'; if(s==='REJECTED'||s==='FAILED') return 'failed'; if(s==='PENDING') return 'pending'; return s.toLowerCase(); }

  async function fetchJson(url){
    const res = await fetch(url, {headers:{'Authorization':'Bearer ' + token()}});
    const json = await res.json().catch(()=>({}));
    if(res.status === 401 || json.message === 'Unauthorized'){ localStorage.removeItem('member_token'); location.href='login.html?redirect=history.html'; return {data:[]}; }
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Load failed');
    return json;
  }

  function updateLazyStatus(key){
    const state = lazyState[key]; if(!state || !state.statusEl) return;
    const finished = state.visible >= state.records.length;
    state.statusEl.dataset.i18n = finished ? 'all_records_loaded' : 'loading_more_records';
    state.statusEl.textContent = state.records.length ? tr(state.statusEl.dataset.i18n) : tr(key === 'bet' ? 'history_no_bets' : 'history_no_transactions');
    state.statusEl.classList.toggle('is-finished', finished);
  }

  function createTransactionRow(item){
    const row = document.createElement('tr');
    const type = txName(item.type || item.ledgerType);
    const cls = txClass(item.type || item.ledgerType);
    const status = statusName(item.status);
    row.innerHTML = `<td data-label="${tr('transactions')}">
      <div class="txn-name ${cls}">${esc(type)}</div>
      <div class="txn-id">#${esc(item.referenceNo || item.id || '-')}</div>
      <div class="txn-amount"><span>${tr('amount')}</span> : <strong>${money(Math.abs(num(item.amount)))}</strong></div>
      <div class="txn-date">${formatDate(item.createdAt)}</div>
    </td><td data-label="${tr('status')}"><span class="status-badge ${status}"><i></i> <span>${esc(statusLabel(status))}</span></span></td>`;
    return row;
  }
  function createBetRow(item){
    const row = document.createElement('tr');
    const wl = num(item.winLoss);
    row.innerHTML = `<td data-label="${tr('date_time')}">${formatDate(item.endedAt || item.startedAt)}</td>
      <td data-label="${tr('game')}"><b>${esc(item.gameName || item.gameCode || item.providerCode || '-')}</b><br><small>${esc(item.providerCode || '')}</small></td>
      <td data-label="${tr('bet_amount')}">${money(item.betAmount || 0)}</td>
      <td data-label="${tr('win_loss')}"><span class="result-badge ${wl >= 0 ? 'win' : 'loss'}">${wl >= 0 ? '+ ' : '- '}${money(Math.abs(wl))}</span></td>`;
    return row;
  }
  function renderBatch(key){
    const state = lazyState[key];
    if(!state || !state.body || state.loading || state.visible >= state.records.length){ updateLazyStatus(key); return; }
    state.loading = true;
    try {
      const nextRecords = state.records.slice(state.visible, state.visible + PAGE_SIZE);
      const fragment = document.createDocumentFragment();
      nextRecords.forEach(item => fragment.appendChild(key === 'transactions' ? createTransactionRow(item) : createBetRow(item)));
      state.body.appendChild(fragment);
      state.visible += nextRecords.length;
    } finally {
      state.loading = false;
      updateLazyStatus(key);
    }
  }
  function activeKey(){ return betPanel && betPanel.classList.contains('active') ? 'bet' : 'transactions'; }
  function loadMoreWhenNearBottom(){
    const key = activeKey(), state = lazyState[key];
    if(!state || !state.statusEl || state.visible >= state.records.length) return;
    const rect = state.statusEl.getBoundingClientRect();
    if(rect.top <= window.innerHeight + SCROLL_OFFSET && rect.bottom >= -SCROLL_OFFSET) renderBatch(key);
  }
  function fillViewport(){
    for(let i=0;i<50;i++){
      const state=lazyState[activeKey()];
      if(!state || state.visible >= state.records.length) break;
      const before=state.visible;
      loadMoreWhenNearBottom();
      if(before===state.visible) break;
    }
  }
  function refreshVisibleRows(){
    Object.keys(lazyState).forEach(key => {
      const state=lazyState[key];
      if(!state || !state.body || !state.records.length) { updateLazyStatus(key); return; }
      const count=state.visible;
      state.body.replaceChildren();
      const fragment=document.createDocumentFragment();
      state.records.slice(0,count).forEach(item => fragment.appendChild(key==='transactions' ? createTransactionRow(item) : createBetRow(item)));
      state.body.appendChild(fragment);
      updateLazyStatus(key);
    });
  }
  async function loadAll(){
    transactionsBody.innerHTML = '<tr><td colspan="2">'+esc(tr('history_loading'))+'</td></tr>'; betBody.innerHTML = '<tr><td colspan="4">'+esc(tr('history_loading'))+'</td></tr>';
    const [tx, bet] = await Promise.all([fetchJson(TX_URL), fetchJson(BET_URL)]);
    // History page is for member-facing transactions only. Provider wallet
    // TRANSFER_IN / TRANSFER_OUT rows are internal game-wallet movements and
    // should not be shown here.
    lazyState.transactions.records = (Array.isArray(tx.data) ? tx.data : []).filter(item => {
      const type = String(item && (item.type || item.ledgerType) || '').trim().toUpperCase();
      return type !== 'TRANSFER_IN' && type !== 'TRANSFER_OUT';
    });
    lazyState.bet.records = Array.isArray(bet.data) ? bet.data : [];
    lazyState.transactions.visible = 0; lazyState.bet.visible = 0; transactionsBody.innerHTML=''; betBody.innerHTML='';
    renderBatch('transactions'); renderBatch('bet'); fillViewport();
  }
  historyTabs.forEach(tab => tab.addEventListener('click', () => { historyTabs.forEach(item => item.classList.remove('active')); tab.classList.add('active'); const key=tab.dataset.tab; transactionPanel.classList.toggle('active', key === 'transactions'); betPanel.classList.toggle('active', key === 'bet'); renderBatch(key === 'bet' ? 'bet' : 'transactions'); fillViewport(); }));
  document.addEventListener('DOMContentLoaded', () => { if(!requireLogin()) return; loadAll().catch(e=>{ transactionsBody.innerHTML='<tr><td colspan="2">'+esc(e.message)+'</td></tr>'; betBody.innerHTML='<tr><td colspan="4">'+esc(e.message)+'</td></tr>'; }); window.addEventListener('scroll', loadMoreWhenNearBottom, {passive:true, capture:true}); document.addEventListener('scroll', loadMoreWhenNearBottom, {passive:true, capture:true}); if(window.IntersectionObserver){ const observer=new IntersectionObserver(entries=>{ if(entries.some(entry=>entry.isIntersecting)) fillViewport(); }, {rootMargin:SCROLL_OFFSET+'px'}); [transactionsLazyStatus,betLazyStatus].forEach(el=>{if(el) observer.observe(el);}); } });
  document.addEventListener('i18n:changed', refreshVisibleRows);
})();
