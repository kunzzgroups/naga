document.querySelectorAll('.login-tab').forEach(function(tab){
  tab.addEventListener('click', function(){
    document.querySelectorAll('.login-tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.login-form-panel').forEach(function(f){ f.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById(tab.dataset.loginTab + 'Form').classList.add('active');
  });
});
