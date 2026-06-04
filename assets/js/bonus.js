// Bonus detail popup
const bonusDetailOverlay = document.getElementById('bonusDetailOverlay');
const bonusCloseBtn = document.getElementById('bonusCloseBtn');
const bonusDetailTitle = document.getElementById('bonusDetailTitle');

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

document.querySelectorAll('.bonus-card').forEach(card => {
  card.addEventListener('click', e => {
    e.preventDefault();
    const img = card.querySelector('img');
    const title = (img && img.alt) ? img.alt : 'OP7';
    openBonusDetail(title);
  });
});

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
