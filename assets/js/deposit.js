(function(){
  const API = window.NAGA_API || {};
  const UPLOAD_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.uploadBaseUrl) || '';
  const input=document.querySelector('.deposit-field input');
  const submit=document.querySelector('.submit-btn');
  const grid=document.querySelector('.payment-grid');
  let paymentMethods=[];
  let selected='ONLINE_BANKING';

  function token(){return localStorage.getItem('member_token')||'';}
  function requireLogin(){ if(!token()){ location.href='login.html?redirect=deposit.html'; return false;} return true; }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function money(v){const n=Number(v||0); return 'MYR '+(Number.isFinite(n)?n.toFixed(2):'0.00');}
  function fileUrl(name){ if(!name) return ''; if(/^https?:\/\//i.test(name)) return name; return UPLOAD_BASE.replace(/\/+$/,'') + '/payment/' + name; }
  function msg(text, ok){ let box=document.getElementById('depositMsg'); if(!box){ box=document.createElement('div'); box.id='depositMsg'; box.className='deposit-note'; document.querySelector('.deposit-actions')?.before(box); } box.style.color=ok?'#19ff5a':'#ff4040'; box.textContent=text; }
  function setBalance(v){ document.querySelectorAll('[data-main-wallet-balance]').forEach(el=>el.textContent=money(v)); localStorage.setItem('member_main_wallet_balance', String(Number(v||0))); }
  function extractBalance(json){ const d=(json&&json.data)||json||{}; const list=[d.balance,d.mainWalletBalance,d.walletBalance,d.mainWallet&&d.mainWallet.balance,d.wallet&&d.wallet.balance]; for(const v of list){ if(v!==undefined&&v!==null&&v!==''){ const n=Number(v); if(!isNaN(n)) return n; } } return 0; }
  async function loadBalance(){ const res=await fetch(API.playerMainWalletBalance,{headers:{Authorization:'Bearer '+token()}}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Unable to load balance'); setBalance(extractBalance(json)); }

  function selectedMethod(){ return selected || 'ONLINE_BANKING'; }
  function icon(type){ if(type==='EWALLET') return '📱'; if(type==='CARD') return '💳'; return '🏦'; }
  function renderMethodButtons(){
    if(!grid) return;
    if(!paymentMethods.length){
      paymentMethods=[
        {methodType:'ONLINE_BANKING',displayName:'Online Banking',subtitle:'Fast deposit',bankName:'-',accountNumber:'-',status:1,sortOrder:1},
        {methodType:'CARD',displayName:'Card',subtitle:'Visa / Mastercard',status:1,sortOrder:2},
        {methodType:'EWALLET',displayName:'E-Wallet',subtitle:'Instant transfer',status:1,sortOrder:3}
      ];
    }
    grid.innerHTML=paymentMethods.map((m,i)=>`<button type="button" class="pay-method ${i===0?'active':''}" data-method="${esc(m.methodType)}"><span>${icon(m.methodType)}</span><b>${esc(m.displayName||m.methodType)}</b><em>${esc(m.subtitle||'')}</em></button>`).join('');
    selected=paymentMethods[0]?.methodType||'ONLINE_BANKING';
    grid.querySelectorAll('.pay-method').forEach(btn=>btn.addEventListener('click',()=>{ grid.querySelectorAll('.pay-method').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); selected=btn.dataset.method; renderPaymentInfo(); }));
    renderPaymentInfo();
  }
  async function loadPaymentMethods(){
    try{ const res=await fetch(API.paymentMethodList); const json=await res.json().catch(()=>({})); if(res.ok&&json.status!=='error'){ const rows=(json.data&&json.data.content)||json.data||[]; if(Array.isArray(rows)&&rows.length) paymentMethods=rows; } }catch(e){}
    renderMethodButtons();
  }
  function renderPaymentInfo(){
    let box=document.getElementById('paymentInfoBox'); if(!box){ box=document.createElement('div'); box.id='paymentInfoBox'; box.className='deposit-note payment-config-box'; grid?.after(box); }
    const m=paymentMethods.find(x=>String(x.methodType).toUpperCase()===String(selected).toUpperCase())||{};
    const rows=[];
    if(m.bankName) rows.push(`<div><b>Bank Name</b><span>${esc(m.bankName)}</span></div>`);
    if(m.accountName) rows.push(`<div><b>Account Name</b><span>${esc(m.accountName)}</span></div>`);
    if(m.accountNumber) rows.push(`<div><b>Account No</b><span>${esc(m.accountNumber)}</span></div>`);
    if(m.bankBsb) rows.push(`<div><b>Bank BSB</b><span>${esc(m.bankBsb)}</span></div>`);
    if(m.payId) rows.push(`<div><b>Pay ID</b><span>${esc(m.payId)}</span></div>`);
    const qr=m.qrImage?`<div class="payment-config-qr"><img src="${esc(fileUrl(m.qrImage))}" alt="QR"></div>`:'';
    const info=rows.length?`<div class="payment-config-list">${rows.join('')}</div>`:'';
    const inst=m.instructions?`<p>${esc(m.instructions).replace(/\n/g,'<br>')}</p>`:'';
    box.innerHTML=`<b>${esc(m.displayName||selected)}</b>${info}${qr}${inst}`;
  }

  document.querySelectorAll('.quick-amounts button').forEach(btn=>btn.addEventListener('click',()=>{ if(input){ input.value=btn.textContent.trim(); input.focus(); } }));
  function ensureProof(){
    let wrap=document.getElementById('depositProofWrap'); if(wrap) return;
    wrap=document.createElement('div'); wrap.id='depositProofWrap'; wrap.className='deposit-field deposit-proof-field';
    wrap.innerHTML=`<span data-i18n="payment_proof">Payment Proof</span><label class="payment-proof-upload" for="depositProof"><input type="file" id="depositProof" accept="image/*"><div class="payment-proof-empty" id="paymentProofEmpty"><i class="fa-solid fa-cloud-arrow-up"></i><b data-i18n="choose_payment_proof">Choose payment proof or drag here</b><em data-i18n="payment_proof_hint">PNG, JPG, WEBP accepted</em></div><div class="payment-proof-preview" id="paymentProofPreview" hidden><img id="paymentProofImg" alt="Payment proof preview"><div><b id="paymentProofName">-</b><em id="paymentProofSize">-</em><button type="button" class="payment-proof-remove" id="paymentProofRemove" data-i18n="remove">Remove</button></div></div></label>`;
    document.querySelector('.deposit-note')?.before(wrap);
    const fileInput=wrap.querySelector('#depositProof'), box=wrap.querySelector('.payment-proof-upload'), empty=wrap.querySelector('#paymentProofEmpty'), preview=wrap.querySelector('#paymentProofPreview'), img=wrap.querySelector('#paymentProofImg'), name=wrap.querySelector('#paymentProofName'), size=wrap.querySelector('#paymentProofSize'), remove=wrap.querySelector('#paymentProofRemove');
    function prettySize(bytes){ if(!bytes) return ''; if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB'; return (bytes/1024/1024).toFixed(2)+' MB'; }
    function showFile(file){ if(!file){ empty.hidden=false; preview.hidden=true; img.removeAttribute('src'); return; } name.textContent=file.name; size.textContent=prettySize(file.size); img.src=URL.createObjectURL(file); empty.hidden=true; preview.hidden=false; }
    fileInput.addEventListener('change',()=>showFile(fileInput.files&&fileInput.files[0]));
    remove.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); fileInput.value=''; showFile(null); });
    ['dragenter','dragover'].forEach(evt=>box.addEventListener(evt,e=>{ e.preventDefault(); box.classList.add('is-dragover'); }));
    ['dragleave','drop'].forEach(evt=>box.addEventListener(evt,e=>{ e.preventDefault(); box.classList.remove('is-dragover'); }));
    box.addEventListener('drop',e=>{ const file=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(!file)return; const dt=new DataTransfer(); dt.items.add(file); fileInput.files=dt.files; showFile(file); });
    if(window.NAGA_LANG&&typeof window.NAGA_LANG.apply==='function') window.NAGA_LANG.apply();
  }
  async function submitDeposit(){
    if(!requireLogin()) return; const amount=Number(input?.value||0); if(amount<10){ msg('Minimum deposit is MYR 10.00',false); return; }
    const fd=new FormData(); fd.append('amount', String(amount)); fd.append('paymentMethod', selectedMethod()); const proof=document.getElementById('depositProof')?.files?.[0]; if(proof) fd.append('proof', proof);
    submit.disabled=true; msg('Submitting deposit request...', true);
    try{ const res=await fetch(API.memberDeposit,{method:'POST',headers:{Authorization:'Bearer '+token()},body:fd}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Deposit failed'); msg(json.message||'Deposit submitted, waiting BO approval.', true); input.value=''; const proofInput=document.getElementById('depositProof'); if(proofInput){ proofInput.value=''; document.getElementById('paymentProofEmpty')?.removeAttribute('hidden'); document.getElementById('paymentProofPreview')?.setAttribute('hidden','hidden'); } await loadBalance().catch(()=>{}); }
    catch(e){ msg(e.message||'Deposit failed', false); }
    finally{ submit.disabled=false; }
  }
  document.addEventListener('DOMContentLoaded',()=>{ if(!requireLogin()) return; setBalance(localStorage.getItem('member_main_wallet_balance')||0); ensureProof(); loadPaymentMethods(); loadBalance().catch(()=>{}); submit?.addEventListener('click',submitDeposit); });
})();
