(function(){
  'use strict';
  function token(){ return localStorage.getItem('member_token') || ''; }
  function apiUrl(){
    if(window.NAGA_API && window.NAGA_API.memberChangeMobile) return window.NAGA_API.memberChangeMobile;
    var base=(window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl)||'';
    return base + '/api/auth/member/mobile/change';
  }
  function status(message,type){
    var el=document.getElementById('mobileChangeStatus');
    if(!el) return;
    el.textContent=message||'';
    el.style.marginTop='10px';
    el.style.fontWeight='700';
    el.style.color=type==='error'?'#ff6b6b':(type==='success'?'#35f486':'');
  }
  function normalizeMobile(value){ return String(value||'').replace(/[\s()\-]/g,'').trim(); }
  async function submit(e){
    e.preventDefault();
    if(!token()){ location.href='login.html?redirect=mobile-setting.html'; return; }
    var mobile=normalizeMobile(document.getElementById('newMobileNumber')?.value);
    var currentPassword=String(document.getElementById('mobileCurrentPassword')?.value||'');
    if(!/^\+?[0-9]{6,20}$/.test(mobile)){ status('Please enter a valid mobile number.','error'); return; }
    if(!currentPassword){ status('Current password is required.','error'); return; }
    var btn=document.getElementById('mobileChangeSubmit');
    if(btn) btn.disabled=true;
    status('Updating mobile number...','');
    try{
      var res=await fetch(apiUrl(),{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({mobile:mobile,currentPassword:currentPassword})});
      var json=await res.json().catch(function(){return {};});
      if(res.status===401 || json.message==='Unauthorized'){
        localStorage.removeItem('member_token'); localStorage.removeItem('member_info');
        location.href='login.html?redirect=mobile-setting.html'; return;
      }
      if(!res.ok || json.status==='error') throw new Error(json.message||'Unable to update mobile number');
      var info={}; try{info=JSON.parse(localStorage.getItem('member_info')||'{}')||{};}catch(ignore){}
      info.mobile=mobile; localStorage.setItem('member_info',JSON.stringify(info));
      status(json.message||'Mobile number changed successfully.','success');
      document.getElementById('mobileCurrentPassword').value='';
      setTimeout(function(){ location.href='setting.html'; },600);
    }catch(err){ status(err.message||'Unable to update mobile number.','error'); }
    finally{ if(btn) btn.disabled=false; }
  }
  document.addEventListener('DOMContentLoaded',function(){
    if(!token()){ location.href='login.html?redirect=mobile-setting.html'; return; }
    document.getElementById('mobileChangeForm')?.addEventListener('submit',submit);
  });
})();
