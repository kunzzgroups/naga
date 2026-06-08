document.querySelectorAll('.eye-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    if(!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.classList.toggle('showing', input.type === 'text');
  });
});
