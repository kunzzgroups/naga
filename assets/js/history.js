const historyTabs = document.querySelectorAll('.history-tab');
const transactionPanel = document.getElementById('transactionsPanel');
const betPanel = document.getElementById('betPanel');
const transactionsBody = document.getElementById('transactionsBody');
const betBody = document.getElementById('betBody');
const transactionsLazyStatus = document.getElementById('transactionsLazyStatus');
const betLazyStatus = document.getElementById('betLazyStatus');

const PAGE_SIZE = 8;
const SCROLL_OFFSET = 280;

const transactionRecords = [
  {type:'txn_losscredit', typeClass:'', id:'#257847201', amount:'AUD 100.00', date:'3 Jun 2026 10:13PM', status:'completed'},
  {type:'deposit', typeClass:'deposit', id:'#257847202', amount:'AUD 50.00', date:'3 Jun 2026 09:47PM', status:'completed'},
  {type:'withdraw', typeClass:'withdraw', id:'#257847203', amount:'AUD 30.00', date:'7 Nov 2025 08:21PM', status:'pending'},
  {type:'deposit', typeClass:'deposit', id:'#257847204', amount:'AUD 80.00', date:'7 Nov 2025 07:10PM', status:'completed'},
  {type:'withdraw', typeClass:'withdraw', id:'#257847205', amount:'AUD 25.00', date:'6 Nov 2025 05:36PM', status:'completed'},
  {type:'deposit', typeClass:'deposit', id:'#257847206', amount:'AUD 120.00', date:'6 Nov 2025 02:22PM', status:'completed'},
  {type:'txn_losscredit', typeClass:'', id:'#257847207', amount:'AUD 40.00', date:'5 Nov 2025 11:04PM', status:'completed'},
  {type:'withdraw', typeClass:'withdraw', id:'#257847208', amount:'AUD 60.00', date:'5 Nov 2025 09:18PM', status:'pending'},
  {type:'deposit', typeClass:'deposit', id:'#257847209', amount:'AUD 200.00', date:'4 Nov 2025 08:46PM', status:'completed'},
  {type:'txn_losscredit', typeClass:'', id:'#257847210', amount:'AUD 35.00', date:'4 Nov 2025 07:30PM', status:'completed'},
  {type:'withdraw', typeClass:'withdraw', id:'#257847211', amount:'AUD 75.00', date:'3 Nov 2025 06:21PM', status:'completed'},
  {type:'deposit', typeClass:'deposit', id:'#257847212', amount:'AUD 150.00', date:'3 Nov 2025 04:05PM', status:'completed'},
  {type:'txn_losscredit', typeClass:'', id:'#257847213', amount:'AUD 20.00', date:'2 Nov 2025 10:19PM', status:'completed'},
  {type:'deposit', typeClass:'deposit', id:'#257847214', amount:'AUD 90.00', date:'2 Nov 2025 07:41PM', status:'completed'},
  {type:'withdraw', typeClass:'withdraw', id:'#257847215', amount:'AUD 45.00', date:'1 Nov 2025 09:55PM', status:'pending'},
  {type:'deposit', typeClass:'deposit', id:'#257847216', amount:'AUD 300.00', date:'1 Nov 2025 01:28PM', status:'completed'},
  {type:'txn_losscredit', typeClass:'', id:'#257847217', amount:'AUD 55.00', date:'31 Oct 2025 11:49PM', status:'completed'},
  {type:'withdraw', typeClass:'withdraw', id:'#257847218', amount:'AUD 110.00', date:'31 Oct 2025 08:17PM', status:'completed'},
  {type:'deposit', typeClass:'deposit', id:'#257847219', amount:'AUD 70.00', date:'30 Oct 2025 06:42PM', status:'completed'},
  {type:'txn_losscredit', typeClass:'', id:'#257847220', amount:'AUD 15.00', date:'30 Oct 2025 03:35PM', status:'completed'}
];

const betRecords = [
  {date:'3 Jun 2026 10:10PM', game:'FC 26', bet:'AUD 10.00', result:'+ AUD 18.00', resultClass:'win'},
  {date:'3 Jun 2026 09:52PM', game:'Prosperity Bloom', bet:'AUD 20.00', result:'- AUD 20.00', resultClass:'loss'},
  {date:'3 Jun 2026 09:30PM', game:'Aztec Riches', bet:'AUD 5.00', result:'+ AUD 7.50', resultClass:'win'},
  {date:'2 Jun 2026 11:18PM', game:'Lucky Wheel', bet:'AUD 15.00', result:'+ AUD 29.00', resultClass:'win'},
  {date:'2 Jun 2026 10:46PM', game:'Golden Tiger', bet:'AUD 12.00', result:'- AUD 12.00', resultClass:'loss'},
  {date:'2 Jun 2026 08:10PM', game:'Rave Jump', bet:'AUD 8.00', result:'+ AUD 14.40', resultClass:'win'},
  {date:'1 Jun 2026 11:41PM', game:'Super Ace', bet:'AUD 30.00', result:'- AUD 30.00', resultClass:'loss'},
  {date:'1 Jun 2026 10:03PM', game:'Golden Shark', bet:'AUD 18.00', result:'+ AUD 33.80', resultClass:'win'},
  {date:'31 May 2026 09:54PM', game:'Mega Gems', bet:'AUD 25.00', result:'- AUD 25.00', resultClass:'loss'},
  {date:'31 May 2026 08:22PM', game:'Dragon Tiger', bet:'AUD 10.00', result:'+ AUD 19.00', resultClass:'win'},
  {date:'30 May 2026 10:32PM', game:'Blackjack', bet:'AUD 40.00', result:'+ AUD 78.00', resultClass:'win'},
  {date:'30 May 2026 07:20PM', game:'Fruit Blast', bet:'AUD 6.00', result:'- AUD 6.00', resultClass:'loss'},
  {date:'29 May 2026 11:09PM', game:'Fishing King', bet:'AUD 16.00', result:'+ AUD 22.00', resultClass:'win'},
  {date:'29 May 2026 09:12PM', game:'Baccarat', bet:'AUD 35.00', result:'- AUD 35.00', resultClass:'loss'},
  {date:'28 May 2026 10:15PM', game:'Ocean Party', bet:'AUD 11.00', result:'+ AUD 20.50', resultClass:'win'},
  {date:'28 May 2026 08:04PM', game:'Wild Star', bet:'AUD 14.00', result:'- AUD 14.00', resultClass:'loss'},
  {date:'27 May 2026 10:51PM', game:'Lucky Dice', bet:'AUD 9.00', result:'+ AUD 16.20', resultClass:'win'},
  {date:'27 May 2026 08:43PM', game:'Roulette', bet:'AUD 50.00', result:'- AUD 50.00', resultClass:'loss'},
  {date:'26 May 2026 11:12PM', game:'Dragon VPS', bet:'AUD 22.00', result:'+ AUD 41.80', resultClass:'win'},
  {date:'26 May 2026 09:33PM', game:'Royal Spin', bet:'AUD 13.00', result:'- AUD 13.00', resultClass:'loss'}
];

const lazyState = {
  transactions: {visible: 0, loading: false, body: transactionsBody, statusEl: transactionsLazyStatus, records: transactionRecords},
  bet: {visible: 0, loading: false, body: betBody, statusEl: betLazyStatus, records: betRecords}
};

function tr(key){
  return window.I18N && window.I18N.t ? window.I18N.t(key) : key;
}

function updateLazyStatus(key){
  const state = lazyState[key];
  if(!state || !state.statusEl) return;
  const finished = state.visible >= state.records.length;
  state.statusEl.dataset.i18n = finished ? 'all_records_loaded' : 'loading_more_records';
  state.statusEl.textContent = tr(state.statusEl.dataset.i18n);
  state.statusEl.classList.toggle('is-finished', finished);
}

function createTransactionRow(item){
  const row = document.createElement('tr');
  row.innerHTML = `
    <td data-label="${tr('transactions')}" data-i18n-data-label="transactions">
      <div class="txn-name ${item.typeClass}" data-i18n="${item.type}">${tr(item.type)}</div>
      <div class="txn-id">${item.id}</div>
      <div class="txn-amount"><span data-i18n="amount">${tr('amount')}</span> : <strong>${item.amount}</strong></div>
      <div class="txn-date">${item.date}</div>
    </td>
    <td data-label="${tr('status')}" data-i18n-data-label="status">
      <span class="status-badge ${item.status}"><i></i> <span data-i18n="${item.status}">${tr(item.status)}</span></span>
    </td>`;
  return row;
}

function createBetRow(item){
  const row = document.createElement('tr');
  row.innerHTML = `
    <td data-label="${tr('date_time')}" data-i18n-data-label="date_time">${item.date}</td>
    <td data-label="${tr('game')}" data-i18n-data-label="game">${item.game}</td>
    <td data-label="${tr('bet_amount')}" data-i18n-data-label="bet_amount">${item.bet}</td>
    <td data-label="${tr('win_loss')}" data-i18n-data-label="win_loss"><span class="result-badge ${item.resultClass}">${item.result}</span></td>`;
  return row;
}

function renderBatch(key){
  const state = lazyState[key];
  if(!state || !state.body || state.loading || state.visible >= state.records.length) return;

  state.loading = true;
  state.statusEl && state.statusEl.classList.add('is-loading');

  setTimeout(() => {
    const nextRecords = state.records.slice(state.visible, state.visible + PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    nextRecords.forEach(item => {
      fragment.appendChild(key === 'transactions' ? createTransactionRow(item) : createBetRow(item));
    });

    state.body.appendChild(fragment);
    state.visible += nextRecords.length;
    state.loading = false;
    state.statusEl && state.statusEl.classList.remove('is-loading');
    updateLazyStatus(key);

    if(window.I18N && window.I18N.apply){ window.I18N.apply(); }
  }, 120);
}

function activeKey(){
  return betPanel && betPanel.classList.contains('active') ? 'bet' : 'transactions';
}

function loadMoreWhenNearBottom(){
  const key = activeKey();
  const scrollPosition = window.innerHeight + window.scrollY;
  const pageHeight = document.documentElement.scrollHeight;
  if(pageHeight - scrollPosition <= SCROLL_OFFSET){
    renderBatch(key);
  }
}

historyTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    historyTabs.forEach(item => item.classList.remove('active'));
    tab.classList.add('active');

    const key = tab.dataset.tab;
    transactionPanel.classList.toggle('active', key === 'transactions');
    betPanel.classList.toggle('active', key === 'bet');

    renderBatch(key === 'bet' ? 'bet' : 'transactions');
  });
});

document.addEventListener('DOMContentLoaded', () => {
  renderBatch('transactions');
  renderBatch('bet');
  window.addEventListener('scroll', loadMoreWhenNearBottom, {passive:true});
});

document.addEventListener('i18n:changed', () => {
  Object.keys(lazyState).forEach(updateLazyStatus);
});
