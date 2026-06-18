(function(){
  const API = window.NAGA_API || {};
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || 'http://localhost:8080';
  const LAUNCH_API_URL = API.playerProviderLaunch || (API_BASE.replace(/\/+$/, '') + '/api/player/provider/launch');

  function getToken(){
    return localStorage.getItem('member_token') || localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }

  function goLogin(){
    const returnUrl = location.pathname.split('/').pop() + location.search;
    location.href = 'login.html?returnUrl=' + encodeURIComponent(returnUrl || 'index.html');
  }

  function firstValue(){
    for(let i=0;i<arguments.length;i++){
      const value = arguments[i];
      if(value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function readDataset(el){
    if(!el) return {};
    const d = el.dataset || {};
    return {
      gameId: d.gameId || '',
      providerCode: d.providerCode || '',
      gameCode: d.gameCode || '',
      launchCode: d.launchCode || '',
      transferAmount: d.transferAmount || ''
    };
  }

  function closestLaunchData(el){
    const target = el && el.closest ? el.closest('[data-game-id], [data-provider-code], [data-game-code], .provider-launch-card') : null;
    return readDataset(target);
  }

  function normalizePayload(game, options){
    const item = game || {};
    const opt = options || {};
    const dataset = opt.element ? readDataset(opt.element) : {};
    const closest = opt.element ? closestLaunchData(opt.element) : {};
    const provider = item.provider || {};
    const cfg = (window.NAGA_CONFIG && window.NAGA_CONFIG.providerLaunch) || {};

    const gameId = firstValue(
      dataset.gameId,
      closest.gameId,
      opt.gameId,
      item.gameId,
      item.game_id,
      item.id
    );

    const providerCode = firstValue(
      dataset.providerCode,
      closest.providerCode,
      opt.providerCode,
      item.providerCode,
      item.provider_code,
      item.provider_code_name,
      item.providerGameProviderCode,
      item.provider_game_provider_code,
      item.vendorCode,
      item.vendor_code,
      provider.providerCode,
      provider.provider_code,
      provider.code,
      provider.providerName,
      provider.provider_name,
      (typeof item.provider === 'string' ? item.provider : ''),
      cfg.defaultProviderCode
    );

    const gameCode = firstValue(
      dataset.gameCode,
      closest.gameCode,
      dataset.launchCode,
      closest.launchCode,
      opt.gameCode,
      item.gameCode,
      item.game_code,
      item.launchCode,
      item.launch_code,
      item.providerGameCode,
      item.provider_game_code,
      item.code,
      item.gameProviderCode,
      item.game_provider_code,
      cfg.defaultGameCode
    );

    const transferAmount = firstValue(
      dataset.transferAmount,
      closest.transferAmount,
      opt.transferAmount,
      item.transferAmount,
      item.transfer_amount,
      0
    );

    const payload = { transferAmount: Number(transferAmount || 0) };

    // Always send providerCode/gameCode if available. Some backend versions prefer these even when gameId exists.
    if(gameId) payload.gameId = Number(gameId) || gameId;
    if(providerCode) payload.providerCode = String(providerCode).trim();
    if(gameCode) payload.gameCode = String(gameCode).trim();

    return payload;
  }

  function normalizeProviderUrl(value){
    if(value === undefined || value === null) return '';

    let text = String(value).trim();
    if(!text) return '';

    // Backend/provider sometimes returns a Java Map string, for example:
    // {url=https://winninghawk.com?a=xxx&lang=en, status=1, statusdesc=OK}
    // Browser treats that whole string as a relative path, so extract only the real URL.
    const directMatch = text.match(/https?:\/\/[^\s,}]+/i);
    if(directMatch) return directMatch[0];

    const urlPairMatch = text.match(/(?:^|[,{\s])url\s*=\s*([^,}\s]+)/i);
    if(urlPairMatch && urlPairMatch[1]){
      let url = urlPairMatch[1].trim();
      try{ url = decodeURIComponent(url); }catch(e){}
      const nestedMatch = url.match(/https?:\/\/[^\s,}]+/i);
      return nestedMatch ? nestedMatch[0] : url;
    }

    return text;
  }

  function extractLaunchUrl(json){
    const data = json && json.data ? json.data : json;
    const rawUrl = firstValue(
      data && data.launchUrl,
      data && data.launch_url,
      data && data.gameUrl,
      data && data.game_url,
      data && data.url,
      data && data.redirectUrl,
      data && data.redirect_url,
      json && json.launchUrl,
      json && json.url,
      typeof data === 'string' ? data : '',
      typeof json === 'string' ? json : ''
    );
    return normalizeProviderUrl(rawUrl);
  }

  async function launch(game, options){
    const token = getToken();
    if(!token){
      goLogin();
      return null;
    }

    const payload = normalizePayload(game, options || {});
    if(!payload.gameId && !payload.providerCode){
      throw new Error('Provider Code is required.');
    }

    // Sports providers may launch by provider only.
    if(!payload.gameId && payload.providerCode && !payload.gameCode){
      payload.launchType = 'SPORTS';
    }

    if(window.NAGA_PROVIDER_LAUNCH_DEBUG){
      console.log('[NAGA launch] endpoint:', LAUNCH_API_URL, 'payload:', payload, 'game:', game);
    }

    const res = await fetch(LAUNCH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(function(){ return {}; });
    if(window.NAGA_PROVIDER_LAUNCH_DEBUG){
      console.log('[NAGA launch] response:', res.status, json);
    }

    if(!res.ok || json.status === 'error'){
      throw new Error(json.message || json.error || 'Launch game failed.');
    }

    const launchUrl = extractLaunchUrl(json);
    if(!launchUrl){
      throw new Error('Provider launch URL not returned. Please check BO provider response launch URL path.');
    }

    window.location.href = launchUrl;
    return launchUrl;
  }

  function bindElement(el, game, options){
    if(!el || el.dataset.providerLaunchBound === '1') return;
    el.dataset.providerLaunchBound = '1';
    el.style.cursor = el.style.cursor || 'pointer';

    el.addEventListener('click', async function(e){
      e.preventDefault();
      e.stopPropagation();

      if(el.disabled || el.classList.contains('is-launching')) return;

      const oldText = el.textContent;
      const isButtonLike = el.tagName === 'BUTTON' || el.getAttribute('role') === 'button';

      if(isButtonLike){
        el.disabled = true;
        el.textContent = (window.I18N && window.I18N.t && window.I18N.t('launching') !== 'launching') ? window.I18N.t('launching') : 'Launching...';
      }

      el.classList.add('is-launching');

      try{
        await launch(game, Object.assign({}, options || {}, { element: el }));
      }catch(err){
        alert(err.message || 'Launch game failed.');

        if(isButtonLike){
          el.disabled = false;
          el.textContent = oldText;
        }

        el.classList.remove('is-launching');
      }
    });
  }

  function bindButton(button, game, options){
    bindElement(button, game, options);
  }

  function bindExisting(){
    document.querySelectorAll('.provider-launch-card, .provider-launch-img, .provider-launch-btn, [data-provider-launch="1"]').forEach(function(el){
      bindElement(el, {}, { element: el, transferAmount: 0 });
    });
  }

  window.NAGA_PROVIDER_LAUNCH = {
    launch: launch,
    bindButton: bindButton,
    bindElement: bindElement,
    bindExisting: bindExisting,
    endpoint: LAUNCH_API_URL
  };

  document.addEventListener('DOMContentLoaded', bindExisting);
})();
