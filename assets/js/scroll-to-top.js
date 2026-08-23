(function(){
  'use strict';

  function getScrollTop(){
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  function ensureButton(){
    var btn = document.getElementById('nagaScrollTopBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'nagaScrollTopBtn';
      btn.className = 'naga-scroll-top-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';
      document.body.appendChild(btn);
    }
    return btn;
  }

  function init(){
    var btn = ensureButton();
    var ticking = false;

    function update(){
      btn.classList.toggle('show', getScrollTop() > 160);
      ticking = false;
    }

    function requestUpdate(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    btn.addEventListener('click', function(){
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    window.addEventListener('pageshow', requestUpdate);
    update();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }else{
    init();
  }
})();
