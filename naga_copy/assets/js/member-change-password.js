(function(){
  const API_BASE = (window.NAGA_CONFIG && window.NAGA_CONFIG.api && window.NAGA_CONFIG.api.baseUrl) || 'http://localhost:8080';

  function token(){
    return localStorage.getItem('member_token') || '';
  }

  function clearMemberAuth(){
    localStorage.removeItem('member_token');
    localStorage.removeItem('member_info');
  }

  function showMessage(message, type){
    const box = document.getElementById('memberPasswordMessage');
    if(!box) return;
    box.textContent = message || '';
    box.className = 'auth-message ' + (type || '');
  }

  function setLoading(btn, loading){
    if(!btn) return;
    btn.disabled = !!loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Saving...' : btn.dataset.originalText;
  }

  async function postChangePassword(body){
    const res = await fetch(API_BASE + '/api/auth/member/password/change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token()
      },
      body: JSON.stringify(body || {})
    });
    const json = await res.json().catch(function(){ return {}; });
    if(!res.ok || json.status === 'error'){
      throw new Error(json.message || 'Change password failed');
    }
    return json;
  }

  document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('memberChangePasswordForm');
    if(!form) return;

    if(!token()){
      showMessage('Please login first.', 'error');
      setTimeout(function(){ window.location.href = 'login.html'; }, 800);
      return;
    }

    form.addEventListener('submit', async function(e){
      e.preventDefault();

      const oldInput = document.getElementById('memberOldPassword');
      const newInput = document.getElementById('memberNewPassword');
      const confirmInput = document.getElementById('memberConfirmPassword');
      const submitBtn = form.querySelector('.green-submit-btn');

      const currentPassword = oldInput ? oldInput.value : '';
      const newPassword = newInput ? newInput.value : '';
      const confirmPassword = confirmInput ? confirmInput.value : '';

      if(!currentPassword || !newPassword || !confirmPassword){
        showMessage('Please fill in all password fields.', 'error');
        return;
      }

      if(newPassword.length < 8 || newPassword.length > 20){
        showMessage('New password must be 8 - 20 characters.', 'error');
        return;
      }

      if(newPassword !== confirmPassword){
        showMessage('Confirm password does not match.', 'error');
        return;
      }

      setLoading(submitBtn, true);
      showMessage('Changing password...', '');

      try{
        const json = await postChangePassword({ currentPassword, newPassword, confirmPassword });
        showMessage(json.message || 'Password changed successfully. Please login again.', 'success');
        form.reset();

        // Safer after password change: force member to login again with new password.
        clearMemberAuth();
        setTimeout(function(){ window.location.href = 'login.html'; }, 1200);
      }catch(err){
        showMessage(err.message || 'Change password failed.', 'error');
      }finally{
        setLoading(submitBtn, false);
      }
    });
  });
})();
