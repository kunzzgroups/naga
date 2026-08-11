(function(){
  'use strict';
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  const params = new URLSearchParams(location.search);
  const firstSetup = params.get('firstSetup') === '1';
  const redirect = params.get('redirect') || 'index.html';
  const form = document.getElementById('bankDetailForm');
  const status = document.getElementById('bankDetailStatus');
  const submit = document.getElementById('bankDetailSubmit');
  const note = document.getElementById('bankFirstSetupNote');
  const back = document.getElementById('bankBackLink');
  const token = () => localStorage.getItem('member_token') || '';
  function setStatus(message, type){ if(!status) return; status.textContent=message||''; status.className='form-status '+(type||''); }
  function value(id){ return (document.getElementById(id)?.value || '').trim(); }
  function setValue(id,v){ const el=document.getElementById(id); if(el) el.value=v||''; }
  function validAccountNumber(v){ return /^[A-Za-z0-9][A-Za-z0-9\-\s]{3,39}$/.test(v); }
  async function request(url, options){
    const res=await fetch(url,Object.assign({cache:'no-store'},options||{}));
    const json=await res.json().catch(()=>({}));
    if(!res.ok || json.status==='error') throw new Error(json.message || 'Request failed');
    return json;
  }
  function applyVisibility(member){
    const bsb=document.getElementById('bankBsbField');
    const pay=document.getElementById('payIdField');
    if(bsb) bsb.hidden=Number(member && member.showBankBsb == null ? 1 : member.showBankBsb)!==1;
    if(pay) pay.hidden=Number(member && member.showPayId == null ? 1 : member.showPayId)!==1;
  }
  async function load(){
    if(!token()){ location.replace('login.html?redirect='+encodeURIComponent(location.href)); return; }
    if(note) note.hidden=!firstSetup;
    if(firstSetup && back) back.style.display='none';
    const json=await request(API_BASE+'/api/auth/member/me?_bank_ts='+Date.now(),{headers:{Authorization:'Bearer '+token(),'Cache-Control':'no-cache'}});
    const m=json.data||{};
    setValue('bankName',m.bankName); setValue('bankAccountName',m.bankAccountName); setValue('bankAccountNumber',m.bankAccountNumber); setValue('bankBsb',m.bankBsb); setValue('payId',m.payId);
    applyVisibility(m);
  }
  if(form){
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      const bankName=value('bankName'), accountName=value('bankAccountName'), accountNumber=value('bankAccountNumber');
      if(!bankName || !accountName || !accountNumber){ setStatus('Bank name, account name and account number are required.','error'); return; }
      if(!validAccountNumber(accountNumber)){ setStatus('Please enter a valid bank account number.','error'); return; }
      submit.disabled=true; setStatus('Saving bank details...','');
      try{
        const json=await request(API_BASE+'/api/auth/member/bank-detail',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({bankName,bankAccountName:accountName,bankAccountNumber:accountNumber,bankBsb:value('bankBsb'),payId:value('payId')})});
        const member=Object.assign({}, JSON.parse(localStorage.getItem('member_info')||'{}'), json.data||{});
        localStorage.setItem('member_info',JSON.stringify(member));
        setStatus('Bank details saved successfully.','success');
        setTimeout(()=>{ location.href=firstSetup?redirect:'setting.html'; },450);
      }catch(err){ setStatus(err.message||'Unable to save bank details.','error'); }
      finally{ submit.disabled=false; }
    });
  }
  load().catch(err=>setStatus(err.message||'Unable to load bank details.','error'));
})();
