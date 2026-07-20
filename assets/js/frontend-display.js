(function(){
  'use strict';

  const STORAGE_KEY = 'naga_home_bonus_enabled';
  const API_URL = (window.NAGA_API && window.NAGA_API.frontendDisplaySetting)
    || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '') + '/api/frontend/display-setting';

  function normalizeEnabled(value){
    if(value === false || value === 0) return false;
    const text = String(value == null ? '' : value).trim().toLowerCase();
    if(['0','false','disabled','disable','off','no'].includes(text)) return false;
    return true;
  }

  function extractEnabled(payload){
    const data = payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
      ? payload.data : payload;
    if(!data || typeof data !== 'object') return true;
    const candidates = [
      data.homeBonusEnabled,
      data.home_bonus_enabled,
      data.bonusEnabled,
      data.bonusDisplayEnabled,
      data.enabled
    ];
    const value = candidates.find(v => v !== undefined && v !== null);
    return normalizeEnabled(value);
  }

  function apply(enabled, source){
    const isEnabled = enabled !== false;
    window.NAGA_HOME_BONUS_ENABLED = isEnabled;
    document.documentElement.classList.toggle('home-bonus-disabled', !isEnabled);
    if(document.body) document.body.classList.toggle('home-bonus-disabled', !isEnabled);
    document.querySelectorAll('[data-home-bonus-display]').forEach(el => {
      el.hidden = !isEnabled;
      el.setAttribute('aria-hidden', isEnabled ? 'false' : 'true');
    });
    try{ localStorage.setItem(STORAGE_KEY, isEnabled ? '1' : '0'); }catch(e){}
    document.dispatchEvent(new CustomEvent('naga:home-bonus-display', {detail:{enabled:isEnabled, source:source || 'unknown'}}));
  }

  function cached(){
    try{
      const v = localStorage.getItem(STORAGE_KEY);
      return v === null ? true : v !== '0';
    }catch(e){ return true; }
  }

  async function refresh(){
    if(!API_URL) return;
    try{
      const response = await fetch(API_URL, {method:'GET', credentials:'omit', cache:'no-store'});
      if(!response.ok) throw new Error('HTTP ' + response.status);
      apply(extractEnabled(await response.json()), 'api');
    }catch(error){
      console.warn('Frontend display setting load failed; using cached value.', error);
      apply(cached(), 'cache');
    }
  }

  apply(cached(), 'initial-cache');
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { apply(cached(), 'dom-cache'); refresh(); }, {once:true});
  }else{
    apply(cached(), 'dom-cache');
    refresh();
  }
  window.NagaFrontendDisplay = {refresh, apply};
})();
