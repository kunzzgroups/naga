(function(){
  'use strict';

  const HOME_BONUS_STORAGE_KEY = 'naga_home_bonus_enabled';
  const LEADERBOARD_STORAGE_KEY = 'naga_leaderboard_enabled';

  const API_URL = (window.NAGA_API && window.NAGA_API.frontendDisplaySetting)
    || ((window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || '') + '/api/frontend/display-setting';


  function normalizeEnabled(value, defaultValue){
    if(value === undefined || value === null || value === ''){
      return defaultValue !== false;
    }

    if(value === false || value === 0) return false;

    const text = String(value).trim().toLowerCase();

    if([
      '0',
      'false',
      'disabled',
      'disable',
      'off',
      'no'
    ].includes(text)){
      return false;
    }

    return true;
  }


  function unwrapPayload(payload){
    if(
      payload &&
      typeof payload === 'object' &&
      payload.data &&
      typeof payload.data === 'object'
    ){
      return payload.data;
    }

    return payload && typeof payload === 'object'
      ? payload
      : {};
  }


  function extractHomeBonusEnabled(payload){
    const data = unwrapPayload(payload);

    const candidates = [
      data.homeBonusEnabled,
      data.home_bonus_enabled,
      data.bonusEnabled,
      data.bonusDisplayEnabled
    ];

    const value = candidates.find(v => v !== undefined && v !== null);

    return normalizeEnabled(value, true);
  }


  function extractLeaderboardEnabled(payload){
    const data = unwrapPayload(payload);

    const candidates = [
      data.leaderboardEnabled,
      data.leaderboard_enabled,
      data.showLeaderboard,
      data.leaderboardDisplayEnabled
    ];

    const value = candidates.find(v => v !== undefined && v !== null);

    /*
     * Default false is safer here.
     * If BO/API has not returned the setting yet,
     * Leaderboard stays hidden instead of flashing first.
     */
    return normalizeEnabled(value, false);
  }


  function setStorage(key, enabled){
    try{
      localStorage.setItem(key, enabled ? '1' : '0');
    }catch(e){}
  }


  function getStorage(key, defaultValue){
    try{
      const value = localStorage.getItem(key);

      if(value === null){
        return defaultValue;
      }

      return value === '1';
    }catch(e){
      return defaultValue;
    }
  }


  /*
   * ============================================================
   * HOME BONUS
   * ============================================================
   */
  function applyHomeBonus(enabled, source){
    const isEnabled = enabled !== false;

    window.NAGA_HOME_BONUS_ENABLED = isEnabled;

    document.documentElement.classList.toggle(
      'home-bonus-disabled',
      !isEnabled
    );

    if(document.body){
      document.body.classList.toggle(
        'home-bonus-disabled',
        !isEnabled
      );
    }

    document.querySelectorAll('[data-home-bonus-display]').forEach(el => {
      el.hidden = !isEnabled;
      el.setAttribute(
        'aria-hidden',
        isEnabled ? 'false' : 'true'
      );
    });

    setStorage(
      HOME_BONUS_STORAGE_KEY,
      isEnabled
    );

    document.dispatchEvent(
      new CustomEvent(
        'naga:home-bonus-display',
        {
          detail:{
            enabled:isEnabled,
            source:source || 'unknown'
          }
        }
      )
    );
  }


  /*
   * ============================================================
   * LEADERBOARD
   * ============================================================
   */
  function applyLeaderboard(enabled, source){
    const isEnabled = enabled === true;

    window.NAGA_LEADERBOARD_ENABLED = isEnabled;

    document.documentElement.classList.toggle(
      'leaderboard-disabled',
      !isEnabled
    );

    if(document.body){
      document.body.classList.toggle(
        'leaderboard-disabled',
        !isEnabled
      );
    }

    /*
     * IMPORTANT:
     *
     * Put data-leaderboard-menu on the Leaderboard <a>
     * inside BO Layout Section.
     *
     * Example:
     *
     * <a href="leaderboard.html"
     *    data-leaderboard-menu
     *    style="display:none;">
     * ...
     * </a>
     */
    document.querySelectorAll('[data-leaderboard-menu]').forEach(el => {
      el.hidden = !isEnabled;

      if(isEnabled){
        el.style.removeProperty('display');
      }else{
        el.style.display = 'none';
      }

      el.setAttribute(
        'aria-hidden',
        isEnabled ? 'false' : 'true'
      );
    });

    setStorage(
      LEADERBOARD_STORAGE_KEY,
      isEnabled
    );

    document.dispatchEvent(
      new CustomEvent(
        'naga:leaderboard-visibility',
        {
          detail:{
            enabled:isEnabled,
            source:source || 'unknown'
          }
        }
      )
    );
  }


  /*
   * ============================================================
   * APPLY ALL DISPLAY SETTINGS
   * ============================================================
   */
  function applySettings(payload, source){
    applyHomeBonus(
      extractHomeBonusEnabled(payload),
      source
    );

    applyLeaderboard(
      extractLeaderboardEnabled(payload),
      source
    );
  }


  /*
   * ============================================================
   * CACHED VALUES
   * ============================================================
   */
  function cachedHomeBonus(){
    return getStorage(
      HOME_BONUS_STORAGE_KEY,
      true
    );
  }


  function cachedLeaderboard(){
    /*
     * Default false prevents Leaderboard flash
     * before BO setting is available.
     */
    return getStorage(
      LEADERBOARD_STORAGE_KEY,
      false
    );
  }


  function applyCached(source){
    applyHomeBonus(
      cachedHomeBonus(),
      source || 'cache'
    );

    applyLeaderboard(
      cachedLeaderboard(),
      source || 'cache'
    );
  }


  /*
   * ============================================================
   * API REFRESH
   * ============================================================
   */
  let refreshPromise = null;
  let lastPayload = null;
  let lastSuccessAt = 0;
  const REFRESH_DEDUPE_MS = 1500;

  async function refresh(options){
    /*
     * Prevent duplicate simultaneous requests.
     *
     * If layout/sidebar gets initialized twice at nearly
     * the same time, both callers reuse the same request.
     */
    if(refreshPromise){
      return refreshPromise;
    }

    const force = !!(options && options.force);
    if(!force && lastPayload && (Date.now() - lastSuccessAt) < REFRESH_DEDUPE_MS){
      return lastPayload;
    }

    if(!API_URL){
      applyCached('no-api-url');
      return;
    }

    refreshPromise = (async function(){
      try{
        const response = await fetch(
          API_URL,
          {
            method:'GET',
            credentials:'omit',

            /*
             * Keep current BO value fresh.
             *
             * This is the existing Frontend Display request;
             * Leaderboard does NOT create a second request.
             */
            cache:'no-store',

            headers:{
              'Accept':'application/json'
            }
          }
        );

        if(!response.ok){
          throw new Error(
            'HTTP ' + response.status
          );
        }

        const payload = await response.json();

        applySettings(
          payload,
          'api'
        );

        lastPayload = payload;
        lastSuccessAt = Date.now();
        return payload;

      }catch(error){

        console.warn(
          'Frontend display setting load failed; using cached value.',
          error
        );

        applyCached(
          'cache-fallback'
        );

        return null;

      }finally{

        refreshPromise = null;

      }
    })();

    return refreshPromise;
  }


  /*
   * ============================================================
   * BO LAYOUT SIDEBAR RE-APPLY
   * ============================================================
   *
   * BO Layout Section may replace the whole sidebar HTML.
   *
   * When that happens, DO NOT fetch again.
   * Just apply the already cached/current values to the
   * newly inserted DOM.
   */
  function reapplySidebarVisibility(){
    applyHomeBonus(
      window.NAGA_HOME_BONUS_ENABLED !== undefined
        ? window.NAGA_HOME_BONUS_ENABLED
        : cachedHomeBonus(),
      'sidebar-reapply'
    );

    applyLeaderboard(
      window.NAGA_LEADERBOARD_ENABLED !== undefined
        ? window.NAGA_LEADERBOARD_ENABLED
        : cachedLeaderboard(),
      'sidebar-reapply'
    );
  }


  /*
   * Existing layout lifecycle.
   */
  document.addEventListener(
    'naga:layout-section-applied',
    function(event){
      const key =
        event &&
        event.detail &&
        event.detail.key;

      if(
        !key ||
        key === 'frontend-sidebar'
      ){
        reapplySidebarVisibility();
      }
    }
  );


  document.addEventListener(
    'naga:site-shell-customized',
    function(){
      reapplySidebarVisibility();
    }
  );


  /*
   * If language changes, Layout Section may rewrite text,
   * but visibility should stay unchanged.
   *
   * No API request here.
   */
  document.addEventListener(
    'i18n:changed',
    function(){
      reapplySidebarVisibility();
    }
  );


  /*
   * ============================================================
   * INITIALIZATION
   * ============================================================
   */

  /*
   * Apply cached setting immediately.
   *
   * This prevents visual flashing before API response.
   */
  applyCached(
    'initial-cache'
  );


  function init(){
    /*
     * Apply once more now that body/sidebar exists.
     */
    applyCached(
      'dom-cache'
    );

    /*
     * ONE Frontend Display API request.
     *
     * It updates both:
     * - Home Bonus
     * - Leaderboard
     */
    refresh();
  }


  if(document.readyState === 'loading'){

    document.addEventListener(
      'DOMContentLoaded',
      init,
      {
        once:true
      }
    );

  }else{

    init();

  }


  /*
   * ============================================================
   * PUBLIC API
   * ============================================================
   */
  window.NagaFrontendDisplay = {

    refresh:refresh,

    applySettings:applySettings,

    applyHomeBonus:applyHomeBonus,

    applyLeaderboard:applyLeaderboard,

    reapplySidebarVisibility:reapplySidebarVisibility

  };

})();