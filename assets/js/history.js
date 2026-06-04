const historyTabs = document.querySelectorAll('.history-tab');
const transactionPanel = document.getElementById('transactionsPanel');
const betPanel = document.getElementById('betPanel');

historyTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    historyTabs.forEach(item => item.classList.remove('active'));
    tab.classList.add('active');

    const key = tab.dataset.tab;
    transactionPanel.classList.toggle('active', key === 'transactions');
    betPanel.classList.toggle('active', key === 'bet');
  });
});
