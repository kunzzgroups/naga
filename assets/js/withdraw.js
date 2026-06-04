(function(){
  const amount=document.querySelector('.withdraw-field input[type="number"]');
  document.querySelectorAll('.withdraw-quick button').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!amount) return;
      amount.value = btn.textContent.trim()==='MAX' ? '888.00' : btn.textContent.trim();
      amount.focus();
    });
  });

  const langBtn=document.getElementById('langBtn');
  const langOverlay=document.getElementById('langOverlay');
  if(langBtn&&langOverlay){
    langBtn.addEventListener('click',()=>langOverlay.classList.add('show'));
    langOverlay.addEventListener('click',e=>{ if(e.target===langOverlay) langOverlay.classList.remove('show'); });
    document.querySelectorAll('.lang-option').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.lang-option').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      langOverlay.classList.remove('show');
    }));
  }
})();