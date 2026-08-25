(function(){
  'use strict';

  const API_BASE = window.NAGA_CONFIG?.api?.baseUrl || 'http://localhost:8080';

  function visibleFormInputs(form){
    if(!form) return [];
    return Array.from(form.querySelectorAll('input')).filter(function(input){
      const type = String(input.getAttribute('type') || 'text').toLowerCase();
      return type !== 'hidden' && !input.disabled;
    });
  }

  function formInput(form, index){
    return visibleFormInputs(form)[index] || null;
  }

  // Login/Layout Section HTML can be customised from BO. Do not depend only on
  // the physical input order because an extra hidden/decorative field would make
  // the frontend submit the wrong username/password. Prefer semantic fields and
  // keep the old visible-input order only as a compatibility fallback.
  function loginUsernameInput(form){
    return form && (
      form.querySelector('input[name="username"]') ||
      form.querySelector('input[autocomplete="username"]') ||
      form.querySelector('input[data-login-username]') ||
      formInput(form, 0)
    );
  }

  function loginPasswordInput(form){
    return form && (
      form.querySelector('input[name="password"]') ||
      form.querySelector('input[autocomplete="current-password"]') ||
      form.querySelector('input[type="password"]') ||
      form.querySelector('input[data-login-password]') ||
      formInput(form, 1)
    );
  }

  function showMessage(form, message, type){
    if(!form) return;
    let box = form.querySelector('.auth-message');
    if(!box){
      box = document.createElement('div');
      box.className = 'auth-message';
      box.id = form.id === 'registerForm' ? 'registerMessage' : 'loginMessage';
      box.setAttribute('role', 'alert');
      box.setAttribute('aria-live', 'polite');
      const submit = form.querySelector('.submit-login, button[type="submit"]');
      if(submit) submit.insertAdjacentElement('afterend', box);
      else form.appendChild(box);
    }
    box.hidden = !message;
    box.textContent = message || '';
    box.className = 'auth-message ' + (type || '');
  }

  async function postJson(url, body){
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body || {})
    });
    const json = await res.json().catch(() => ({}));
    if(!res.ok || json.status === 'error') throw new Error(json.message || 'Request failed');
    return json;
  }

  function saveMemberAuth(json){
    // A previous login/browser session may have left an outdated wallet value.
    // Remove it before redirecting so the next page must load the current API balance.
    localStorage.removeItem('member_main_wallet_balance');
    localStorage.removeItem('member_main_wallet_balance_confirmed_at');

    const token = json && json.token ? String(json.token) : '';
    if(!token) throw new Error('Login succeeded but no member token was returned.');

    localStorage.setItem('member_token', token);
    localStorage.setItem('member_info', JSON.stringify((json && json.data) || {}));

    // IMPORTANT: member-inactivity.js is already loaded on the login page. A
    // successful login happens in this same browser tab, so the browser does not
    // fire a "storage" event back to this tab. If an old inactivity timestamp is
    // still present, the destination page can see the brand-new token together
    // with a >10 minute old timestamp and immediately log the player out again.
    // Reset the activity timestamp at the exact moment a new login session starts.
    const now = Date.now();
    localStorage.setItem('naga_member_last_activity_at', String(now));
    try{ sessionStorage.removeItem('naga_member_logout_reason'); }catch(e){}
    try{ document.dispatchEvent(new CustomEvent('naga:member-login', {detail:{at:now}})); }catch(e){}
  }

  function bindTabs(scope){
    (scope || document).querySelectorAll('.login-tab').forEach(function(tab){
      if(tab.dataset.nagaLoginTabBound === '1') return;
      tab.dataset.nagaLoginTabBound = '1';
      tab.addEventListener('click', function(){
        const card = tab.closest('.login-card') || document;
        card.querySelectorAll('.login-tab').forEach(function(t){ t.classList.remove('active'); });
        card.querySelectorAll('.login-form-panel').forEach(function(f){ f.classList.remove('active'); });
        tab.classList.add('active');
        const target = card.querySelector('#' + tab.dataset.loginTab + 'Form');
        if(target) target.classList.add('active');
      });
    });
  }

  function bindLoginForm(scope){
    const loginForm = (scope || document).querySelector('#loginForm');
    if(!loginForm || loginForm.dataset.nagaAuthBound === '1') return;
    loginForm.dataset.nagaAuthBound = '1';
    const loginBtn = loginForm.querySelector('.submit-login');
    if(loginBtn) loginBtn.type = 'submit';

    loginForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const usernameInput = loginUsernameInput(loginForm);
      const passwordInput = loginPasswordInput(loginForm);
      const username = (usernameInput?.value || '').trim();
      const password = passwordInput?.value || '';
      if(!username || !password){
        showMessage(loginForm, 'Please enter username and password.', 'error');
        return;
      }
      if(loginBtn) loginBtn.disabled = true;
      showMessage(loginForm, 'Logging in...', '');
      try{
        const json = await postJson(API_BASE + '/api/auth/member/login', {username, password});
        saveMemberAuth(json);
        showMessage(loginForm, 'Login success.', 'success');
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
      }catch(err){
        showMessage(loginForm, err.message || 'Login failed.', 'error');
      }finally{
        if(loginBtn) loginBtn.disabled = false;
      }
    });
  }

  function bindRegisterForm(scope){
    const registerForm = (scope || document).querySelector('#registerForm');
    if(!registerForm || registerForm.dataset.nagaAuthBound === '1') return;
    registerForm.dataset.nagaAuthBound = '1';

    const params = new URLSearchParams(window.location.search);
    const agentCodeFromUrl = (params.get('agent') || '').trim();
    const ref = (params.get('ref') || '').trim();
    if((agentCodeFromUrl || ref) && formInput(registerForm,3)) formInput(registerForm,3).value = agentCodeFromUrl || ref;

    const registerBtn = registerForm.querySelector('.submit-login');
    if(registerBtn) registerBtn.type = 'submit';
    registerForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const fullName = (formInput(registerForm,0)?.value || '').trim();
      const mobile = (formInput(registerForm,1)?.value || '').trim();
      const password = formInput(registerForm,2)?.value || '';
      const referrerCode = (formInput(registerForm,3)?.value || '').trim();
      if(!mobile || password.length < 6){
        showMessage(registerForm, 'Mobile and password minimum 6 characters are required.', 'error');
        return;
      }
      if(registerBtn) registerBtn.disabled = true;
      showMessage(registerForm, 'Registering...', '');
      try{
        const json = await postJson(API_BASE + '/api/auth/member/register', {
          fullName,
          username: mobile,
          mobile,
          password,
          referrerCode: agentCodeFromUrl ? '' : referrerCode,
          agentCode: agentCodeFromUrl || ''
        });
        saveMemberAuth(json);
        showMessage(registerForm, 'Register success. Please complete your bank details.', 'success');
        // Registration is already an authenticated session. New members must complete
        // their payout bank details before continuing to the lobby. Preserve an
        // explicitly requested destination so bank-detail.html can continue there.
        const requestedRedirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = 'bank-detail.html?firstSetup=1&redirect=' + encodeURIComponent(requestedRedirect);
      }catch(err){
        showMessage(registerForm, err.message || 'Register failed.', 'error');
      }finally{
        if(registerBtn) registerBtn.disabled = false;
      }
    });
  }

  function initializeAuthUi(scope){
    bindTabs(scope || document);
    bindLoginForm(scope || document);
    bindRegisterForm(scope || document);
  }

  initializeAuthUi(document);

  // BO Layout Section HTML is fetched asynchronously. Rebind the original
  // login/register behaviour after login-page or register-page replaces DOM.
  document.addEventListener('naga:layout-sections-loaded', function(){
    initializeAuthUi(document);
  });

  document.addEventListener('naga:layout-section-applied', function(event){
    const key = event && event.detail && event.detail.sectionKey;
    if(key === 'login-page' || key === 'register-page') initializeAuthUi(document);
  });


  document.addEventListener('naga:layout-section-restored', function(event){
    const key = event && event.detail && event.detail.sectionKey;
    if(key === 'login-page' || key === 'register-page') initializeAuthUi(document);
  });

  window.NAGA_AUTH_PAGE = {
    rehydrate: function(){ initializeAuthUi(document); }
  };
})();
