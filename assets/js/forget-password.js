(function () {
  'use strict';

  const form = document.getElementById('forgetPasswordForm');
  const getCodeButton = document.getElementById('forgetGetCode');
  const mobileInput = document.getElementById('forgetMobile');
  const newPasswordInput = document.getElementById('forgetNewPassword');
  const confirmPasswordInput = document.getElementById('forgetConfirmPassword');
  const message = document.getElementById('forgetPasswordMessage');

  function showMessage(text, type) {
    if (!message) return;
    message.textContent = text || '';
    message.className = 'forget-password-message' + (type ? ' ' + type : '');
  }

  if (getCodeButton) {
    getCodeButton.addEventListener('click', function () {
      const mobile = (mobileInput && mobileInput.value || '').trim();
      if (!mobile) {
        showMessage('Please enter your registered mobile number.', 'error');
        mobileInput && mobileInput.focus();
        return;
      }

      showMessage('Verification-code service will be connected to the password reset API.', 'info');
    });
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      showMessage('', '');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (newPasswordInput.value !== confirmPasswordInput.value) {
        showMessage('The new passwords do not match.', 'error');
        confirmPasswordInput.focus();
        return;
      }

      showMessage('Password-reset service will be connected to the API.', 'info');
    });
  }
})();
