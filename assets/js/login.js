(function(){
  'use strict';

  const API_BASE = window.NAGA_CONFIG?.api?.baseUrl || 'http://localhost:8080';

  function formInput(form, index){
    return form ? form.querySelectorAll('input')[index] : null;
  }

  function showMessage(form, message, type){
    if(!form) return;
    let box = form.querySelector('.auth-message');
    if(!box){
      box = document.createElement('div');
      box.className = 'auth-message';
      form.appendChild(box);
    }
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
    localStorage.setItem('member_token', json.token || '');
    localStorage.setItem('member_info', JSON.stringify(json.data || {}));
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
      const username = (formInput(loginForm,0)?.value || '').trim();
      const password = formInput(loginForm,1)?.value || '';
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

    const ref = new URLSearchParams(window.location.search).get('ref');
    if(ref && formInput(registerForm,3)) formInput(registerForm,3).value = ref;

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
          referrerCode
        });
        saveMemberAuth(json);
        showMessage(registerForm, 'Register success.', 'success');
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
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
