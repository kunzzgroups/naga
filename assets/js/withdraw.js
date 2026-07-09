(function(){
  const API = window.NAGA_API || {};
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '';
  const amount=document.querySelector('.withdraw-field input[type="number"]');
  const txInput=document.querySelector('.withdraw-field input[type="password"]');
  const submit=document.querySelector('.submit-btn');
  let mainBalance = 0;
  function token(){return localStorage.getItem('member_token')||'';}
  function requireLogin(){ if(!token()){ location.href='login.html?redirect=withdraw.html'; return false;} return true; }
  function money(v){ const n=Number(v||0); return 'MYR '+(isNaN(n)?0:n).toFixed(2); }
  function setBalance(v){ mainBalance=Number(v||0); if(isNaN(mainBalance)) mainBalance=0; localStorage.setItem('member_main_wallet_balance', String(mainBalance)); document.querySelectorAll('[data-main-wallet-balance], .withdraw-balance strong').forEach(el=>el.textContent=money(mainBalance)); }
  function msg(text, ok){ let box=document.getElementById('withdrawMsg'); if(!box){ box=document.createElement('div'); box.id='withdrawMsg'; box.className='withdraw-note'; document.querySelector('.deposit-actions')?.before(box); } box.style.color=ok?'#19ff5a':'#ff4040'; box.textContent=text; }
  function getBalanceFromJson(json){ const d=(json&&json.data)||json||{}; const arr=[d.balance,d.mainWalletBalance,d.main_wallet_balance,d.walletBalance,d.wallet_balance,d.mainWallet&&d.mainWallet.balance,d.wallet&&d.wallet.balance]; for(const v of arr){ if(v!==undefined&&v!==null&&v!==''){ const n=Number(v); if(!isNaN(n)) return n; } } return 0; }
  async function fetchMainBalance(){
    const url=(API.playerMainWalletBalance||API.playerProviderWalletBalance||(API_BASE.replace(/\/+$/,'')+'/api/player/provider/wallet-balance'));
    const res=await fetch(url,{headers:{Authorization:'Bearer '+token()}});
    const json=await res.json().catch(()=>({}));
    if(!res.ok||json.status==='error') throw new Error(json.message||'Unable to load wallet balance');
    const b=getBalanceFromJson(json); setBalance(b); return b;
  }
  async function loadMe(){
    const res=await fetch((window.NAGA_CONFIG?.api?.baseUrl||'')+'/api/auth/member/me',{headers:{Authorization:'Bearer '+token()}});
    const json=await res.json().catch(()=>({}));
    if(!res.ok||json.status==='error') throw new Error(json.message||'Unauthorized');
    const m=json.data||{};
    const rows=[['Bank Account Name',m.bankAccountName],['Bank Account No',m.bankAccountNumber]];
    if(Number(m.showBankBsb??1)===1) rows.push(['Bank BSB',m.bankBsb]);
    if(Number(m.showPayId??1)===1) rows.push(['Pay ID',m.payId]);
    const box=document.querySelector('.withdraw-bank-box');
    if(box) box.innerHTML=rows.map(r=>'<div class="bank-row"><span>'+r[0]+'</span><b>'+(r[1]||'-')+'</b></div>').join('');
    const bank=document.querySelector('.withdraw-info-grid div:nth-child(3) b'); if(bank) bank.textContent=m.bankName||'-';
    if(!m.hasTransactionPassword) msg('Please set transaction password in Setting before withdraw.', false);
  }
  async function submitWithdraw(){ if(!requireLogin()) return; const val=Number(amount?.value||0); if(val<50){msg('Minimum withdraw is MYR 50.00',false);return;} submit.disabled=true; msg('Submitting withdraw request...',true); try{ const res=await fetch(API.memberWithdraw,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({amount:val,transactionPassword:txInput?.value||''})}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Withdraw failed'); msg(json.message||'Withdraw submitted, waiting BO approval.',true); amount.value=''; if(txInput) txInput.value=''; await fetchMainBalance().catch(()=>{}); }catch(e){msg(e.message||'Withdraw failed',false);} finally{submit.disabled=false;} }
  document.querySelectorAll('.withdraw-quick button').forEach(btn=>btn.addEventListener('click',()=>{ if(!amount)return; amount.value=btn.textContent.trim()==='MAX'?String(mainBalance||localStorage.getItem('member_main_wallet_balance')||'0'):btn.textContent.trim(); amount.focus(); }));
  document.addEventListener('DOMContentLoaded',()=>{ if(!requireLogin()) return; setBalance(localStorage.getItem('member_main_wallet_balance')||0); loadMe().catch(e=>msg(e.message,false)); fetchMainBalance().catch(e=>msg(e.message,false)); submit?.addEventListener('click',submitWithdraw); });
})();
