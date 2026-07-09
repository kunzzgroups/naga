(function(){
  const API_BASE = window.NAGA_CONFIG?.api?.baseUrl || 'http://localhost:8080';
  const loginTabButtons = document.querySelectorAll('.login-tab');

  loginTabButtons.forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.login-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.login-form-panel').forEach(function(f){ f.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.loginTab + 'Form').classList.add('active');
    });
  });

  function formInput(form, index){
    return form ? form.querySelectorAll('input')[index] : null;
  }

  function showMessage(form, message, type){
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

  const loginForm = document.getElementById('loginForm');
  const loginBtn = loginForm ? loginForm.querySelector('.submit-login') : null;
  if(loginBtn){
    loginBtn.type = 'submit';
    loginForm.addEventListener('submit', async function(e){
      e.preventDefault();
      const username = (formInput(loginForm,0)?.value || '').trim();
      const password = formInput(loginForm,1)?.value || '';
      if(!username || !password){
        showMessage(loginForm, 'Please enter username and password.', 'error');
        return;
      }
      loginBtn.disabled = true;
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
        loginBtn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if(registerForm){ const ref = new URLSearchParams(window.location.search).get('ref'); if(ref && formInput(registerForm,3)) formInput(registerForm,3).value = ref; }
  const registerBtn = registerForm ? registerForm.querySelector('.submit-login') : null;
  if(registerBtn){
    registerBtn.type = 'submit';
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
      registerBtn.disabled = true;
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
        registerBtn.disabled = false;
      }
    });
  }
})();
