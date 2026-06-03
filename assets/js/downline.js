(function(){
  const select = document.getElementById('downlineLevel');
  const current = document.getElementById('downlineCurrentLevel');

  function updateLevelText(){
    if(!select || !current) return;
    const key = 'level_' + select.value;
    if(window.I18N && window.I18N.t){
      current.textContent = window.I18N.t(key);
      current.setAttribute('data-i18n', key);
    }else{
      current.textContent = 'Level ' + select.value;
    }
  }

  if(select){
    select.addEventListener('change', updateLevelText);
  }

  document.addEventListener('i18n:changed', updateLevelText);
  updateLevelText();
})();
