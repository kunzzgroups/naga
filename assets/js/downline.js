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
  async function loadMe(){ const res=await fetch((window.NAGA_CONFIG?.api?.baseUrl||'')+'/api/auth/member/me',{headers:{Authorization:'Bearer '+token()}}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Unauthorized'); const code=json.data?.referralCode||json.data?.referrerCode||''; document.querySelectorAll('.downline-code').forEach(el=>el.textContent=code||'-'); return code; }
  async function load(){ if(!requireLogin()) return; updateLevelText(); if(body) body.innerHTML='<tr><td colspan="4">Loading...</td></tr>'; try{ await loadMe(); const level=select?.value||'1'; const res=await fetch((API.memberDownline||'')+'?level='+encodeURIComponent(level),{headers:{Authorization:'Bearer '+token()}}); const json=await res.json().catch(()=>({})); if(!res.ok||json.status==='error') throw new Error(json.message||'Load failed'); const rows=json.data?.content||[]; document.getElementById('downlineTotalMembers').textContent=String(rows.length); document.getElementById('downlineTotalCommission').textContent=money(rows.reduce((s,r)=>s+Number(r.commission||0),0)); if(!rows.length){ body.innerHTML='<tr class="empty-row"><td colspan="4"><div class="empty-state"><div class="empty-icon">👥</div><h3>No downline yet</h3><p>Share your referral link to invite friends and start earning commission.</p></div></td></tr>'; return; } body.innerHTML=rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.fullName||r.username||r.mobile||'-')+'</td><td>'+money(r.commission)+'</td><td>'+esc(fmt(r.createdAt))+'</td></tr>').join(''); }catch(e){ if(body) body.innerHTML='<tr><td colspan="4" style="color:#ff4040">'+esc(e.message)+'</td></tr>'; } }
  if(select) select.addEventListener('change', load);
  document.querySelector('.gold-btn')?.addEventListener('click', load);
  document.addEventListener('DOMContentLoaded', load);
})();
