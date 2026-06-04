(function(){
  const input=document.querySelector('.deposit-field input');
  document.querySelectorAll('.quick-amounts button').forEach(btn=>{
    btn.addEventListener('click',()=>{ if(input){ input.value=btn.textContent.trim(); input.focus(); } });
  });
  document.querySelectorAll('.pay-method').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.pay-method').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
    });
  });
})();
