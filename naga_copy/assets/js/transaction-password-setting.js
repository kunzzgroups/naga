(function(){
  const API = window.NAGA_API || {};
  function token(){ return localStorage.getItem('member_token') || ''; }
  function t(key, fallback){ return (window.I18N && window.I18N.t && window.I18N.t(key)) || fallback || key; }
  function msg(message, type){
    const box = document.getElementById('txMsg');
    if(!box) return;
    box.textContent = message || '';
    box.className = 'auth-message ' + (type || '');
  }
  function setLoading(btn, loading){
    if(!btn) return;
    btn.disabled = !!loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? t('saving','Saving...') : btn.dataset.originalText;
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(!token()){
      msg(t('please_login_first','Please login first.'), 'error');
      setTimeout(function(){ location.href = 'login.html?redirect=transaction-password-setting.html'; }, 600);
      return;
    }

    const form = document.getElementById('transactionPasswordForm');
    if(!form) return;

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const p = (document.getElementById('txPass')?.value || '').trim();
      const c = (document.getElementById('txConfirm')?.value || '').trim();
      const btn = document.getElementById('txSave');

      if(!p || !c){ msg(t('please_fill_transaction_password','Please fill in transaction password.'), 'error'); return; }
      if(p.length < 6 || p.length > 20){ msg(t('transaction_password_length_error','Transaction password must be 6 - 20 characters.'), 'error'); return; }
      if(p !== c){ msg(t('transaction_password_confirm_not_match','Confirm transaction password does not match.'), 'error'); return; }

      setLoading(btn, true);
      msg(t('saving_transaction_password','Saving transaction password...'), '');
      try{
        const res = await fetch(API.memberSetTransactionPassword, {
          method:'POST',
          headers:{'Content-Type':'application/json', Authorization:'Bearer '+token()},
          body:JSON.stringify({transactionPassword:p, confirmPassword:c})
        });
        const json = await res.json().catch(function(){ return {}; });
        if(!res.ok || json.status === 'error') throw new Error(json.message || t('save_failed','Save failed'));
        msg(json.message || t('transaction_password_saved','Transaction password saved successfully.'), 'success');
        form.reset();
        setTimeout(function(){ location.href='setting.html'; }, 900);
      }catch(err){
        msg(err.message || t('save_failed','Save failed'), 'error');
      }finally{
        setLoading(btn, false);
      }
    });
  });
})();
