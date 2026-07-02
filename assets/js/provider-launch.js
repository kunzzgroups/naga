(function(){
  const API = window.NAGA_API || {};
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || 'http://localhost:8080';
  const LAUNCH_API_URL = API.playerProviderLaunch || (API_BASE.replace(/\/+$/, '') + '/api/player/provider/launch');
  const WALLET_BALANCE_URL = API.playerProviderWalletBalance || (API_BASE.replace(/\/+$/, '') + '/api/player/provider/wallet-balance');
  const EXIT_API_URL = API.playerProviderExit || (API_BASE.replace(/\/+$/, '') + '/api/player/provider/exit');
  const HEARTBEAT_API_URL = API.playerProviderHeartbeat || (API_BASE.replace(/\/+$/, '') + '/api/player/provider/heartbeat');

  let pendingLaunch = null;
  let walletBalanceCache = null;
  let providerMonitorTimer = null;
  let providerCloseCheckTimer = null;

  function getToken(){
    return localStorage.getItem('member_token') || localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }

  function goLogin(){
    const returnUrl = location.pathname.split('/').pop() + location.search;
    location.href = 'login.html?returnUrl=' + encodeURIComponent(returnUrl || 'index.html');
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function money(value){
    const n = Number(value || 0);
    return isNaN(n) ? '0.00' : n.toFixed(2);
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
      launchType: d.launchType || '',
      transferAmount: d.transferAmount || '',
      gameName: d.gameName || ''
    };
  }

  function closestLaunchData(el){
    const target = el && el.closest ? el.closest('[data-game-id], [data-provider-code], [data-game-code], .provider-launch-card, .game-card') : null;
    return readDataset(target);
  }

  function readDomGameName(el){
    if(!el) return '';
    const direct = firstValue(
      el.dataset && el.dataset.gameName,
      el.getAttribute && el.getAttribute('alt'),
      el.getAttribute && el.getAttribute('title'),
      el.getAttribute && el.getAttribute('aria-label')
    );
    if(direct) return direct;

    const card = el.closest ? el.closest('.provider-launch-card, .game-card, .detail-game-card, [data-game-name]') : null;
    if(!card) return '';
    const img = card.querySelector ? card.querySelector('img[alt]') : null;
    const nameNode = card.querySelector ? card.querySelector('[data-game-name-text], .game-name, .game-title, .detail-game-name, h3, h4') : null;
    return firstValue(
      card.dataset && card.dataset.gameName,
      img && img.getAttribute('alt'),
      nameNode && nameNode.textContent
    );
  }

  function normalizePayload(game, options){
    const item = game || {};
    const opt = options || {};
    const dataset = opt.element ? readDataset(opt.element) : {};
    const closest = opt.element ? closestLaunchData(opt.element) : {};
    const provider = item.provider || {};
    const cfg = (window.NAGA_CONFIG && window.NAGA_CONFIG.providerLaunch) || {};

    const gameId = firstValue(dataset.gameId, closest.gameId, opt.gameId, item.gameId, item.game_id, item.id);
    const providerCode = firstValue(
      dataset.providerCode, closest.providerCode, opt.providerCode,
      item.providerCode, item.provider_code, item.provider_code_name,
      item.providerGameProviderCode, item.provider_game_provider_code,
      item.vendorCode, item.vendor_code,
      provider.providerCode, provider.provider_code, provider.code,
      provider.providerName, provider.provider_name,
      (typeof item.provider === 'string' ? item.provider : ''),
      cfg.defaultProviderCode
    );
    const gameCode = firstValue(
      dataset.gameCode, closest.gameCode, dataset.launchCode, closest.launchCode,
      opt.gameCode, item.gameCode, item.game_code, item.launchCode, item.launch_code,
      item.providerGameCode, item.provider_game_code, item.code,
      item.gameProviderCode, item.game_provider_code, cfg.defaultGameCode
    );
    const launchType = firstValue(dataset.launchType, closest.launchType, opt.launchType, item.launchType, item.launch_type, cfg.defaultLaunchType);
    const transferAmount = firstValue(dataset.transferAmount, closest.transferAmount, opt.transferAmount, item.transferAmount, item.transfer_amount, 0);
    const gameName = firstValue(dataset.gameName, closest.gameName, opt.gameName, item.name, item.gameName, item.game_name, item.nameEn, item.title, item.gameTitle, readDomGameName(opt.element));

    const payload = { transferAmount: Number(transferAmount || 0) };
    if(gameId) payload.gameId = Number(gameId) || gameId;
    if(providerCode) payload.providerCode = String(providerCode).trim();
    if(gameCode) payload.gameCode = String(gameCode).trim();
    if(launchType) payload.launchType = String(launchType).trim().toUpperCase();
    if(!payload.gameId && payload.providerCode && !payload.gameCode && !payload.launchType) payload.launchType = 'SPORTS';
    payload._display = { gameName: gameName || 'Selected Game', providerCode: payload.providerCode || '', gameCode: payload.gameCode || '', launchType: payload.launchType || '' };
    return payload;
  }

  function normalizeProviderUrl(value){
    if(value === undefined || value === null) return '';
    let text = String(value).trim();
    if(!text) return '';
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
      data && data.launchUrl, data && data.launch_url, data && data.gameUrl, data && data.game_url,
      data && data.url, data && data.redirectUrl, data && data.redirect_url,
      json && json.launchUrl, json && json.url,
      typeof data === 'string' ? data : '', typeof json === 'string' ? json : ''
    );
    return normalizeProviderUrl(rawUrl);
  }

  async function fetchMainWalletBalance(){
    const token = getToken();
    if(!token){ goLogin(); return 0; }
    const res = await fetch(WALLET_BALANCE_URL, { headers: { 'Authorization': 'Bearer ' + token } });
    const json = await res.json().catch(function(){ return {}; });
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Unable to load main wallet balance.');
    const data = json.data || {};
    const balance = Number(data.balance || (data.mainWallet && data.mainWallet.balance) || 0);
    walletBalanceCache = isNaN(balance) ? 0 : balance;
    return walletBalanceCache;
  }

  function ensureModal(){
    let modal = document.getElementById('providerTransferModal');
    if(modal) return modal;
    modal = document.createElement('div');
    modal.id = 'providerTransferModal';
    modal.className = 'provider-transfer-modal hidden';
    modal.innerHTML =
      '<div class="provider-transfer-backdrop" data-provider-transfer-close></div>' +
      '<div class="provider-transfer-panel" role="dialog" aria-modal="true">' +
        '<button type="button" class="provider-transfer-close" data-provider-transfer-close>&times;</button>' +
        '<div class="provider-transfer-title">Transfer to Game</div>' +
        '<div class="provider-transfer-subtitle">Choose amount to transfer from Main Wallet before entering provider.</div>' +
        '<div class="provider-transfer-game">' +
          '<div><span>Game</span><strong data-provider-transfer-game-name>-</strong></div>' +
          '<div><span>Provider</span><strong data-provider-transfer-provider>-</strong></div>' +
        '</div>' +
        '<div class="provider-transfer-balance">Main Wallet: <strong>RM <span data-provider-transfer-balance>0.00</span></strong></div>' +
        '<label class="provider-transfer-label">Transfer Amount</label>' +
        '<div class="provider-transfer-input-row"><span>RM</span><input type="number" min="0" step="0.01" inputmode="decimal" data-provider-transfer-amount placeholder="0.00"></div>' +
        '<div class="provider-transfer-quick">' +
          '<button type="button" data-provider-transfer-quick="10">10</button>' +
          '<button type="button" data-provider-transfer-quick="30">30</button>' +
          '<button type="button" data-provider-transfer-quick="50">50</button>' +
          '<button type="button" data-provider-transfer-quick="100">100</button>' +
          '<button type="button" data-provider-transfer-all>All</button>' +
        '</div>' +
        '<div class="provider-transfer-note">Amount will be deducted from Main Wallet and deposited to provider before launch. You can also enter 0 to launch without transfer.</div>' +
        '<div class="provider-transfer-error" data-provider-transfer-error></div>' +
        '<div class="provider-transfer-actions">' +
          '<button type="button" class="provider-transfer-cancel" data-provider-transfer-close>Cancel</button>' +
          '<button type="button" class="provider-transfer-confirm" data-provider-transfer-confirm>Confirm & Play</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e){
      if(e.target.closest('[data-provider-transfer-close]')) closeModal();
      const quick = e.target.closest('[data-provider-transfer-quick]');
      if(quick){
        const input = modal.querySelector('[data-provider-transfer-amount]');
        input.value = quick.getAttribute('data-provider-transfer-quick') || '0';
        clearError();
      }
      if(e.target.closest('[data-provider-transfer-all]')){
        const input = modal.querySelector('[data-provider-transfer-amount]');
        input.value = money(walletBalanceCache || 0);
        clearError();
      }
      if(e.target.closest('[data-provider-transfer-confirm]')) confirmModalLaunch();
    });

    const amountInput = modal.querySelector('[data-provider-transfer-amount]');
    amountInput.addEventListener('input', clearError);
    return modal;
  }

  function clearError(){
    const modal = ensureModal();
    const err = modal.querySelector('[data-provider-transfer-error]');
    if(err) err.textContent = '';
  }

  function setError(msg){
    const modal = ensureModal();
    const err = modal.querySelector('[data-provider-transfer-error]');
    if(err) err.textContent = msg || '';
  }

  function closeModal(){
    const modal = ensureModal();
    modal.classList.add('hidden');
    pendingLaunch = null;
  }

  async function openTransferModal(payload){
    const token = getToken();
    if(!token){ goLogin(); return; }
    if(!payload.gameId && !payload.providerCode) throw new Error('Provider Code is required.');

    const modal = ensureModal();
    pendingLaunch = payload;
    clearError();
    modal.querySelector('[data-provider-transfer-game-name]').textContent = payload._display.gameName || 'Selected Game';
    modal.querySelector('[data-provider-transfer-provider]').textContent = payload.providerCode || '-';
    modal.querySelector('[data-provider-transfer-amount]').value = '';
    modal.querySelector('[data-provider-transfer-balance]').textContent = 'Loading...';
    modal.classList.remove('hidden');

    try{
      const balance = await fetchMainWalletBalance();
      modal.querySelector('[data-provider-transfer-balance]').textContent = money(balance);
    }catch(err){
      modal.querySelector('[data-provider-transfer-balance]').textContent = '0.00';
      setError(err.message || 'Unable to load main wallet balance.');
    }
  }

  async function confirmModalLaunch(){
    if(!pendingLaunch) return;
    const modal = ensureModal();
    const btn = modal.querySelector('[data-provider-transfer-confirm]');
    const amountValue = modal.querySelector('[data-provider-transfer-amount]').value;
    const amount = Number(amountValue || 0);
    if(isNaN(amount) || amount < 0){ setError('Please enter a valid amount.'); return; }
    if(amount > Number(walletBalanceCache || 0)){ setError('Insufficient main wallet balance.'); return; }

    const payload = Object.assign({}, pendingLaunch);
    delete payload._display;
    payload.transferAmount = amount;
    if(!payload.returnUrl){
      try{ payload.returnUrl = new URL('provider-return.html', location.href).href; }catch(e){ payload.returnUrl = 'provider-return.html'; }
    }

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Transferring...';
    try{
      await directLaunch(payload);
    }catch(err){
      btn.disabled = false;
      btn.textContent = oldText;
      setError(err.message || 'Launch game failed.');
    }
  }


  function saveActiveProviderSession(data){
    if(data && data.sessionId){
      localStorage.setItem('naga_last_provider_session_id', String(data.sessionId));
      localStorage.setItem('naga_active_provider_session_id', String(data.sessionId));
      if(data.providerCode){
        localStorage.setItem('naga_last_provider_code', String(data.providerCode));
        localStorage.setItem('naga_active_provider_code', String(data.providerCode));
      }
    }
  }

  async function sendProviderHeartbeat(sessionId){
    const token = getToken();
    if(!token || !sessionId) return null;
    const res = await fetch(HEARTBEAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ sessionId: sessionId })
    });
    return res.json().catch(function(){ return {}; });
  }

  function stopProviderMonitor(){
    if(providerMonitorTimer){
      clearInterval(providerMonitorTimer);
      providerMonitorTimer = null;
    }
    if(providerCloseCheckTimer){
      clearInterval(providerCloseCheckTimer);
      providerCloseCheckTimer = null;
    }
  }

  function startProviderMonitor(sessionId, providerCode, popupWindow){
    stopProviderMonitor();
    if(!sessionId) return;
    localStorage.setItem('naga_active_provider_session_id', String(sessionId));
    if(providerCode) localStorage.setItem('naga_active_provider_code', String(providerCode));

    async function closeAndSettle(){
      stopProviderMonitor();
      try{ await exitProviderGame({ sessionId: sessionId, providerCode: providerCode, transferBackAll: true }); }catch(e){}
    }

    sendProviderHeartbeat(sessionId).catch(function(){});

    // Check tab close faster than heartbeat. This handles normal new-tab close.
    providerCloseCheckTimer = setInterval(function(){
      if(popupWindow && popupWindow.closed){
        closeAndSettle();
      }
    }, 3000);

    // Heartbeat is only for backend stale-session protection.
    providerMonitorTimer = setInterval(function(){
      if(popupWindow && popupWindow.closed){
        closeAndSettle();
        return;
      }
      sendProviderHeartbeat(sessionId).catch(function(){});
    }, 10000);
  }

  async function directLaunch(payload){
    const token = getToken();
    if(!token){ goLogin(); return null; }

    if(window.NAGA_PROVIDER_LAUNCH_DEBUG) console.log('[NAGA launch] endpoint:', LAUNCH_API_URL, 'payload:', payload);

    const res = await fetch(LAUNCH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(function(){ return {}; });
    if(window.NAGA_PROVIDER_LAUNCH_DEBUG) console.log('[NAGA launch] response:', res.status, json);
    if(!res.ok || json.status === 'error') throw new Error(json.message || json.error || 'Launch game failed.');

    const data = json.data || {};
    saveActiveProviderSession(data);

    const launchUrl = extractLaunchUrl(json);
    if(!launchUrl) throw new Error('Provider launch URL not returned. Please check BO provider response launch URL path.');
    closeModal();
    // Open provider game in a normal browser tab instead of a popup window.
    // Keep the returned tab reference so we can detect tab close when the browser allows it.
    // Backend auto-settlement is still the final backup if the browser/tab is killed.
    const gameTab = window.open(launchUrl, '_blank');
    if(gameTab){
      try{ gameTab.focus(); }catch(e){}
      startProviderMonitor(data.sessionId, data.providerCode || payload.providerCode || '', gameTab);
    }else{
      // New tab blocked fallback: redirect same window. Backend scheduler will still auto-settle stale OPEN sessions.
      window.location.href = launchUrl;
    }
    return launchUrl;
  }

  async function launch(game, options){
    const payload = normalizePayload(game, options || {});
    return openTransferModal(payload);
  }

  async function exitProviderGame(options){
    const token = getToken();
    if(!token){ goLogin(); return null; }
    const opt = options || {};
    const payload = {
      sessionId: opt.sessionId || localStorage.getItem('naga_last_provider_session_id') || null,
      providerCode: opt.providerCode || localStorage.getItem('naga_last_provider_code') || '',
      transferBackAll: opt.transferBackAll !== false
    };
    if(opt.amount != null) payload.amount = Number(opt.amount);
    const res = await fetch(EXIT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(function(){ return {}; });
    if(!res.ok || json.status === 'error') throw new Error(json.message || json.error || 'Exit provider failed.');
    stopProviderMonitor();
    localStorage.removeItem('naga_last_provider_session_id');
    localStorage.removeItem('naga_active_provider_session_id');
    localStorage.removeItem('naga_active_provider_code');
    return json;
  }

  function bindElement(el, game, options){
    if(!el || el.dataset.providerLaunchBound === '1') return;
    el.dataset.providerLaunchBound = '1';
    el.style.cursor = el.style.cursor || 'pointer';
    el.addEventListener('click', async function(e){
      e.preventDefault();
      e.stopPropagation();
      if(el.disabled || el.classList.contains('is-launching')) return;
      try{ await launch(game, Object.assign({}, options || {}, { element: el })); }
      catch(err){ alert(err.message || 'Launch game failed.'); }
    });
  }

  function bindButton(button, game, options){ bindElement(button, game, options); }

  function bindExisting(){
    document.querySelectorAll('.provider-launch-card, .provider-launch-img, .provider-launch-btn, [data-provider-launch="1"]').forEach(function(el){
      bindElement(el, {}, { element: el, transferAmount: 0 });
    });
  }

  function trySettleOnPageClose(){
    const sessionId = localStorage.getItem('naga_active_provider_session_id');
    const providerCode = localStorage.getItem('naga_active_provider_code') || localStorage.getItem('naga_last_provider_code') || '';
    const token = getToken();
    if(!sessionId || !token) return;
    try{
      fetch(EXIT_API_URL, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ sessionId: sessionId, providerCode: providerCode, transferBackAll: true })
      }).catch(function(){});
    }catch(e){}
  }

  window.addEventListener('pagehide', trySettleOnPageClose);

  window.NAGA_PROVIDER_LAUNCH = {
    launch: launch,
    directLaunch: directLaunch,
    exitProviderGame: exitProviderGame,
    bindButton: bindButton,
    bindElement: bindElement,
    bindExisting: bindExisting,
    endpoint: LAUNCH_API_URL,
    balanceEndpoint: WALLET_BALANCE_URL,
    exitEndpoint: EXIT_API_URL,
    heartbeatEndpoint: HEARTBEAT_API_URL,
    sendProviderHeartbeat: sendProviderHeartbeat,
    startProviderMonitor: startProviderMonitor,
    stopProviderMonitor: stopProviderMonitor
  };

  document.addEventListener('DOMContentLoaded', bindExisting);
})();
