(function(){
  const API = window.NAGA_API || {};
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || 'https://bo.titanxgaming.com';
  const CLAIMS_URL = API.playerPromotionClaims || (API_BASE.replace(/\/+$/, '') + '/api/player/promotion/my-claims');
  const COMPLETE_BASE = API.playerPromotionComplete || (API_BASE.replace(/\/+$/, '') + '/api/player/promotion/claim-completion');
  let currentClaim = null;

  function token(){ return localStorage.getItem('member_token') || ''; }
  function money(value){ const n=Number(value||0); return 'MYR '+(isNaN(n)?'0.00':n.toFixed(2)); }
  function num(value){ const n=Number(value||0); return isNaN(n)?0:n; }
  function esc(value){ return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function statusOf(c){return String((c&&c.status)||'').toUpperCase();}

  function findProgressClaim(claims){
    const list=Array.isArray(claims)?claims:[];
    const lifecycle=['ACTIVE','PENDING_COMPLETION','READY_TO_COMPLETE'];
    return list.find(c=>lifecycle.includes(statusOf(c))&&(num(c.requiredTurnover)>0||num(c.requiredRollover)>0)) || null;
  }
  function claimName(c){ return c.promotionName||c.promotion_name||c.name||('Promotion #'+(c.promotionId||c.promotion_id||c.id||'')); }

  function render(claim){
    const box=document.getElementById('bonusProgressWidget'); if(!box)return;
    currentClaim=claim||null;
    if(!claim){box.hidden=true;return;}
    const rt=num(claim.requiredTurnover),ct=num(claim.currentTurnover),rr=num(claim.requiredRollover),cr=num(claim.currentRollover);
    const useTurnover=rt>=rr,required=useTurnover?rt:rr,current=useTurnover?ct:cr;
    if(required<=0){box.hidden=true;return;}
    const percent=Math.max(0,Math.min(100,(current/required)*100));box.hidden=false;
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    const name=document.getElementById('bonusProgressName');if(name)name.innerHTML=esc(claimName(claim));
    set('bonusProgressStatus',percent.toFixed(1)+'%');set('bonusProgressCurrent',money(current));set('bonusProgressRequired',money(required));
    const bar=document.getElementById('bonusProgressBar');if(bar)bar.style.width=percent+'%';
    const status=statusOf(claim);set('bonusProgressNote',status==='READY_TO_COMPLETE'?'Requirement complete — confirmation required':status==='PENDING_COMPLETION'?'Requirement complete — awaiting admin approval':(useTurnover?'Winover / Turnover progress':'Rollover progress'));
    const btn=document.getElementById('bonusProgressComplete');if(btn)btn.hidden=status!=='READY_TO_COMPLETE';
  }

  function modal(show,message){
    const m=document.getElementById('bonusCompleteModal');if(!m)return;
    if(message){const e=document.getElementById('bonusCompleteMessage');if(e)e.textContent=message;}
    m.classList.toggle('show',!!show);m.setAttribute('aria-hidden',show?'false':'true');document.body.style.overflow=show?'hidden':'';
  }
  async function complete(){
    if(!currentClaim||statusOf(currentClaim)!=='READY_TO_COMPLETE')return;
    const confirm=document.getElementById('bonusCompleteConfirm');if(confirm){confirm.disabled=true;confirm.textContent='Processing...';}
    try{
      const res=await fetch(COMPLETE_BASE.replace(/\/$/,'')+'/'+encodeURIComponent(currentClaim.id),{method:'POST',headers:{Authorization:'Bearer '+token()}});
      const json=await res.json().catch(()=>({}));if(!res.ok||json.status==='error')throw new Error(json.message||'Unable to complete promotion');
      modal(false);await load();
    }catch(e){modal(true,e.message||'Unable to complete promotion');}
    finally{if(confirm){confirm.disabled=false;confirm.textContent='Confirm';}}
  }

  async function load(){
    const box=document.getElementById('bonusProgressWidget');if(!box)return;
    const t=token();if(!t){render(null);return;}
    try{const res=await fetch(CLAIMS_URL,{headers:{Authorization:'Bearer '+t}});const json=await res.json().catch(()=>({}));if(!res.ok||json.status==='error'){render(null);return;}render(findProgressClaim(json.data||[]));}catch(e){render(null);}
  }
  document.addEventListener('DOMContentLoaded',function(){
    load();
    document.getElementById('bonusProgressComplete')?.addEventListener('click',()=>modal(true,'Your turnover requirement is complete. Confirm to finish this promotion.'));
    document.getElementById('bonusCompleteConfirm')?.addEventListener('click',complete);
    document.querySelectorAll('[data-bonus-complete-close]').forEach(e=>e.addEventListener('click',()=>modal(false)));
  });
  window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  window.NAGA_BONUS_PROGRESS={refresh:load};
})();
