const settingCard = document.querySelector('.setting-card');
const settingToggle = document.getElementById('settingToggle');
const settingLangBtn = document.getElementById('settingLangBtn');
const langOverlay = document.getElementById('langOverlay');

if(settingCard && settingToggle){
  settingToggle.addEventListener('click', () => {
    const isOpen = settingCard.classList.toggle('open');
    settingToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function openSettingLangPopup(){
  if(!langOverlay) return;
  langOverlay.classList.add('show');
  langOverlay.setAttribute('aria-hidden','false');
}

if(settingLangBtn){
  settingLangBtn.addEventListener('click', openSettingLangPopup);
}
