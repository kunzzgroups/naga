(function(){
  'use strict';
  if(window.__NAGA_SIDEBAR_RUNTIME_V1__) return;
  window.__NAGA_SIDEBAR_RUNTIME_V1__=true;

  function token(){ return localStorage.getItem('member_token')||localStorage.getItem('access_token')||localStorage.getItem('token')||''; }
  function member(){ try{return JSON.parse(localStorage.getItem('member_info')||'{}')||{};}catch(_){return{};} }
  function codeFrom(m){
    if(!m||typeof m!=='object') return '';
    var direct=m.referralCode||m.referral_code||m.referrerCode||m.referrer_code||m.inviteCode||m.invite_code||m.refCode||m.ref_code;
    return direct==null?'':String(direct).trim();
  }
  function referralLink(){
    var code=codeFrom(member())||String(localStorage.getItem('member_referral_code')||'').trim();
    if(!code){
      try{ var saved=String(localStorage.getItem('member_referral_link')||'').trim(); if(saved) return new URL(saved,location.href).href; }catch(_){}
      return '';
    }
    var u=new URL('register.html',location.href); u.searchParams.set('ref',code); return u.href;
  }
  function closeGroup(group){
    if(!group) return;
    group.classList.remove('is-open');
    var btn=group.querySelector('[data-sidebar-group-toggle]');
    var body=group.querySelector('[data-sidebar-group-content]');
    if(btn) btn.setAttribute('aria-expanded','false');
    if(body) body.hidden=true;
  }
  function toggleGroup(group){
    if(!group) return;
    var opening=!group.classList.contains('is-open');
    document.querySelectorAll('#mobileSideMenu [data-sidebar-group].is-open').forEach(function(other){ if(other!==group) closeGroup(other); });
    var btn=group.querySelector('[data-sidebar-group-toggle]');
    var body=group.querySelector('[data-sidebar-group-content]');
    group.classList.toggle('is-open',opening);
    if(btn) btn.setAttribute('aria-expanded',opening?'true':'false');
    if(body) body.hidden=!opening;
  }
  function syncSocialVisibility(){
    document.querySelectorAll('#mobileSideMenu [data-mobile-social-group]').forEach(function(group){
      var list=group.querySelector('[data-mobile-social-list]');
      var count=list ? Number(list.getAttribute('data-social-count')||list.children.length||0) : 0;
      group.hidden=count<1;
      if(count<1) closeGroup(group);
    });
  }
  function syncAuth(){
    var logged=!!token();
    document.querySelectorAll('#mobileSideMenu .mobile-menu-auth').forEach(function(el){el.hidden=logged;});
    document.querySelectorAll('#mobileSideMenu .mobile-menu-member').forEach(function(el){el.hidden=!logged;});
    document.querySelectorAll('#mobileSideMenu [data-member-logout]').forEach(function(el){el.hidden=!logged;});
  }
  function hydrate(){
    document.querySelectorAll('#mobileSideMenu [data-sidebar-group]').forEach(function(group){
      var btn=group.querySelector('[data-sidebar-group-toggle]');
      var body=group.querySelector('[data-sidebar-group-content]');
      if(btn && body && btn.getAttribute('aria-expanded')!=='true'){ group.classList.remove('is-open'); body.hidden=true; }
    });
    syncAuth(); syncSocialVisibility();
    if(window.NagaSocialLinks && typeof window.NagaSocialLinks.applyMobile==='function') window.NagaSocialLinks.applyMobile();
  }
  async function copyText(value){
    if(!value) return false;
    try{ if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return true;} }catch(_){}
    var ta=document.createElement('textarea'); ta.value=value; ta.readOnly=true; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select();
    var ok=false; try{ok=document.execCommand('copy')===true;}catch(_){} ta.remove(); return ok;
  }
  document.addEventListener('click',function(e){
    var toggle=e.target.closest&&e.target.closest('#mobileSideMenu [data-sidebar-group-toggle]');
    if(toggle){e.preventDefault(); toggleGroup(toggle.closest('[data-sidebar-group]')); return;}
    var copy=e.target.closest&&e.target.closest('#mobileSideMenu [data-referral-copy]');
    if(copy){e.preventDefault(); var link=referralLink(); if(!link){if(!token()) location.href='login.html?redirect='+encodeURIComponent(location.pathname.split('/').pop()||'index.html');return;} copyText(link); return;}
    var share=e.target.closest&&e.target.closest('#mobileSideMenu [data-referral-share]');
    if(share){e.preventDefault(); var url=referralLink(); if(!url){if(!token()) location.href='login.html?redirect='+encodeURIComponent(location.pathname.split('/').pop()||'index.html');return;} if(navigator.share){navigator.share({title:'Referral',text:'Join me',url:url}).catch(function(){});}else copyText(url);}
  },true);
  document.addEventListener('naga:layout-section-applied',function(e){if(e&&e.detail&&e.detail.sectionKey==='frontend-sidebar') setTimeout(hydrate,0);});
  document.addEventListener('naga:layout-section-restored',function(e){if(e&&e.detail&&e.detail.sectionKey==='frontend-sidebar') setTimeout(hydrate,0);});
  document.addEventListener('naga:social-links-ready',function(){setTimeout(syncSocialVisibility,0);});
  window.addEventListener('storage',function(e){if(['member_token','access_token','token','member_info','member_referral_code'].indexOf(e.key)>=0) hydrate();});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',hydrate,{once:true}); else hydrate();
  window.NagaSidebarRuntime={hydrate:hydrate,syncSocialVisibility:syncSocialVisibility};
})();
