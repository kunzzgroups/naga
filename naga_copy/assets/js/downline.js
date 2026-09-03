(function(){
  const select = document.getElementById('downlineLevel');
  const current = document.getElementById('downlineCurrentLevel');
  const body = document.getElementById('downlineTableBody');
  const API = window.NAGA_API || {};
  function token(){return localStorage.getItem('member_token')||'';}
  function requireLogin(){ if(!token()){ location.href='login.html?redirect=downline.html'; return false;} return true; }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmt(v){ const s=String(v||'').replace('T',' '); return s ? s.slice(0,19) : '-'; }
  function money(v){return 'MYR '+Number(v||0).toFixed(2);}
  function updateLevelText(){ if(!select || !current) return; current.textContent='Level '+select.value; }
  function paintReferral(code){ if(!code)return; document.querySelectorAll('.downline-code').forEach(el=>el.textContent=code); }
  function bootstrapReferral(){try{const m=JSON.parse(localStorage.getItem('member_info')||'null')||{};paintReferral(m.referralCode||m.referrerCode||'');}catch(e){}}
  async function loadMe(){ const res=await fetch((window.NAGA_CONFIG?.api?.baseUrl||'')+'/api/auth/member/me',{headers:{Authorization:'Bearer '+token()}}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Unauthorized'); const member=json.data||{}; const code=member.referralCode||member.referrerCode||''; paintReferral(code); try{const old=JSON.parse(localStorage.getItem('member_info')||'{}')||{};localStorage.setItem('member_info',JSON.stringify(Object.assign({},old,member)));}catch(e){} return code; }
  async function load(){ if(!requireLogin()) return; updateLevelText(); try{ await loadMe(); const level=select?.value||'1'; const res=await fetch((API.memberDownline||'')+'?level='+encodeURIComponent(level),{headers:{Authorization:'Bearer '+token()}}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Load failed'); const rows=json.data?.content||[]; document.getElementById('downlineTotalMembers').textContent=String(rows.length); document.getElementById('downlineTotalCommission').textContent=money(rows.reduce((s,r)=>s+Number(r.commission||0),0)); if(!rows.length){
      // Keep the empty-state view stable while loading/refreshing so users do not
      // see a temporary "Loading..." row before the no-downline result arrives.
      if(!body.querySelector('.empty-row')){
        body.innerHTML='<tr class="empty-row"><td colspan="4"><div class="empty-state"><div class="empty-icon">👥</div><h3 data-i18n="no_downline_error">No downline yet</h3><p data-i18n="share_your_referral_link_desc">Share your referral link to invite friends and start earning commission.</p></div></td></tr>';
        document.dispatchEvent(new CustomEvent('naga:language-refresh'));
      }
      return;
    } body.innerHTML=rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.fullName||r.username||r.mobile||'-')+'</td><td>'+money(r.commission)+'</td><td>'+esc(fmt(r.createdAt))+'</td></tr>').join(''); }catch(e){ if(body) body.innerHTML='<tr><td colspan="4" style="color:#ff4040">'+esc(e.message)+'</td></tr>'; } }
  if(select) select.addEventListener('change', load);
  document.querySelector('.gold-btn')?.addEventListener('click', load);
  bootstrapReferral();
  document.addEventListener('DOMContentLoaded', load);
})();
