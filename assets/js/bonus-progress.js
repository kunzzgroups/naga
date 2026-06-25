(function(){
  const API = window.NAGA_API || {};
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || 'https://bo.titanxgaming.com';
  const CLAIMS_URL = API.playerPromotionClaims || (API_BASE.replace(/\/+$/, '') + '/api/player/promotion/my-claims');

  function token(){
    return localStorage.getItem('member_token') || '';
  }

  function money(value){
    const n = Number(value || 0);
    return 'MYR ' + (isNaN(n) ? '0.00' : n.toFixed(2));
  }

  function num(value){
    const n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function findProgressClaim(claims){
    const list = Array.isArray(claims) ? claims : [];
    const active = list.filter(function(c){
      const status = String(c.status || '').toUpperCase();
      const requiredTurnover = num(c.requiredTurnover);
      const requiredRollover = num(c.requiredRollover);
      return status === 'ACTIVE' && (requiredTurnover > 0 || requiredRollover > 0);
    });

    if(active.length) return active[0];

    const pending = list.filter(function(c){
      const requiredTurnover = num(c.requiredTurnover);
      const currentTurnover = num(c.currentTurnover);
      return requiredTurnover > 0 && currentTurnover < requiredTurnover;
    });
    return pending[0] || null;
  }

  function claimName(claim){
    return claim.promotionName || claim.promotion_name || claim.name || ('Promotion #' + (claim.promotionId || claim.promotion_id || claim.id || ''));
  }

  function render(claim){
    const box = document.getElementById('bonusProgressWidget');
    if(!box) return;

    if(!claim){
      box.hidden = true;
      return;
    }

    const requiredTurnover = num(claim.requiredTurnover);
    const currentTurnover = num(claim.currentTurnover);
    const requiredRollover = num(claim.requiredRollover);
    const currentRollover = num(claim.currentRollover);

    const useTurnover = requiredTurnover >= requiredRollover;
    const required = useTurnover ? requiredTurnover : requiredRollover;
    const current = useTurnover ? currentTurnover : currentRollover;
    const label = useTurnover ? 'Winover / Turnover progress' : 'Rollover progress';

    if(required <= 0){
      box.hidden = true;
      return;
    }

    const percent = Math.max(0, Math.min(100, (current / required) * 100));
    box.hidden = false;

    const nameEl = document.getElementById('bonusProgressName');
    const statusEl = document.getElementById('bonusProgressStatus');
    const barEl = document.getElementById('bonusProgressBar');
    const currentEl = document.getElementById('bonusProgressCurrent');
    const requiredEl = document.getElementById('bonusProgressRequired');
    const noteEl = document.getElementById('bonusProgressNote');

    if(nameEl) nameEl.innerHTML = esc(claimName(claim));
    if(statusEl) statusEl.textContent = percent.toFixed(1) + '%';
    if(barEl) barEl.style.width = percent + '%';
    if(currentEl) currentEl.textContent = money(current);
    if(requiredEl) requiredEl.textContent = money(required);
    if(noteEl) noteEl.textContent = label;
  }

  async function load(){
    const box = document.getElementById('bonusProgressWidget');
    if(!box) return;

    const t = token();
    if(!t){
      render(null);
      return;
    }

    try{
      const res = await fetch(CLAIMS_URL, {
        headers: { 'Authorization': 'Bearer ' + t }
      });
      const json = await res.json().catch(function(){ return {}; });
      if(!res.ok || json.status === 'error'){
        render(null);
        return;
      }
      render(findProgressClaim(json.data || []));
    }catch(e){
      render(null);
    }
  }

  document.addEventListener('DOMContentLoaded', load);
  window.addEventListener('focus', load);
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) load();
  });

  window.NAGA_BONUS_PROGRESS = {
    refresh: load
  };
})();
