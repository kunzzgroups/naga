(function(){
  'use strict';
  var header=document.querySelector('.top-header');
  if(!header) return;
  var base=(window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'';
  var endpoint=(window.NAGA_API&&window.NAGA_API.frontendDisplaySetting)||(String(base).replace(/\/$/,'')+'/api/frontend/display-setting');
  if(!endpoint) return;

  function plainText(html){
    var d=document.createElement('div');
    d.innerHTML=html||'';
    return (d.textContent||'').replace(/\s+/g,' ').trim();
  }

  function createBar(html){
    var old=document.getElementById('nagaGlobalMarquee');
    if(old) old.remove();
    if(!plainText(html)){
      document.documentElement.style.setProperty('--naga-marquee-height','0px');
      return;
    }

    var bar=document.createElement('div');
    bar.id='nagaGlobalMarquee';
    bar.className='naga-marquee';
    bar.setAttribute('role','region');
    bar.setAttribute('aria-label','Announcement');
    bar.innerHTML='<div class="naga-marquee-viewport"><div class="naga-marquee-track"><div class="naga-marquee-copy"></div></div></div>';

    var copy=bar.querySelector('.naga-marquee-copy');
    copy.innerHTML=html;
    header.insertAdjacentElement('afterend',bar);
    bar.classList.add('is-visible');

    function updateMetrics(){
      var h=Math.round(bar.getBoundingClientRect().height||0);
      document.documentElement.style.setProperty('--naga-marquee-height',h+'px');

      /* One message only. Every cycle begins fully outside the right edge and
         travels completely past the left edge before restarting. */
      var viewportWidth=Math.max(1,bar.querySelector('.naga-marquee-viewport').clientWidth||window.innerWidth||1);
      var contentWidth=Math.max(1,copy.scrollWidth||1);
      var totalDistance=viewportWidth+contentWidth;
      var pxPerSecond=window.innerWidth<=768?55:70;
      var duration=Math.max(10,Math.min(60,totalDistance/pxPerSecond));
      bar.style.setProperty('--naga-marquee-duration',duration+'s');
    }

    requestAnimationFrame(function(){
      updateMetrics();
      window.dispatchEvent(new Event('resize'));
    });

    var resizeTimer=0;
    window.addEventListener('resize',function(){
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(updateMetrics,120);
    },{passive:true});
  }

  function hide(){
    var old=document.getElementById('nagaGlobalMarquee');
    if(old) old.remove();
    document.documentElement.style.setProperty('--naga-marquee-height','0px');
    window.dispatchEvent(new Event('resize'));
  }

  fetch(endpoint,{cache:'no-store',headers:{'Accept':'application/json'}})
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(j){
      var d=j&&j.data||{};
      try{
        if(Object.prototype.hasOwnProperty.call(d,'leaderboardEnabled')){
          var lbEnabled=d.leaderboardEnabled===1||d.leaderboardEnabled===true||String(d.leaderboardEnabled).toLowerCase()==='true';
          localStorage.setItem('naga_leaderboard_enabled',lbEnabled?'1':'0');
          document.dispatchEvent(new CustomEvent('naga:leaderboard-visibility',{detail:{enabled:lbEnabled}}));
        }
      }catch(_e){}
      var enabled=d.marqueeEnabled===1||d.marqueeEnabled===true||String(d.marqueeEnabled).toLowerCase()==='true';
      if(enabled&&plainText(d.marqueeContent))createBar(d.marqueeContent);else hide();
    })
    .catch(hide);
})();
