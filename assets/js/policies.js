(function(){
  const tabs = Array.from(document.querySelectorAll('.policy-tab'));
  const panels = Array.from(document.querySelectorAll('.policy-panel'));
  const tabWrap = document.getElementById('policyTabs');

  function centerTab(tab){
    if(!tab || !tabWrap) return;
    const left = tab.offsetLeft - (tabWrap.clientWidth / 2) + (tab.clientWidth / 2);
    tabWrap.scrollTo({left: Math.max(0, left), behavior: 'smooth'});
  }

  function show(tab){
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    panels.forEach(p => p.classList.toggle('active', p.id === tab.dataset.target));
    centerTab(tab);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function ensureScrollTop(){
    let btn = document.getElementById('nagaScrollTopBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'nagaScrollTopBtn';
      btn.className = 'naga-scroll-top-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
      document.body.appendChild(btn);
    }
    const update = () => btn.classList.toggle('show', (window.pageYOffset || document.documentElement.scrollTop || 0) > 160);
    btn.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update, {passive:true});
    update();
  }

  tabs.forEach(tab => tab.addEventListener('click', () => show(tab)));
  window.addEventListener('load', () => centerTab(document.querySelector('.policy-tab.active')));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureScrollTop); else ensureScrollTop();
})();
