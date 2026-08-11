(function(){
'use strict';
function isHomePage(){
  var path=(location.pathname||'/').replace(/\/+$/,'/');
  var last=path.split('/').filter(Boolean).pop()||'';
  return !last || last.toLowerCase()==='index.html';
}
if(!isHomePage()) return;

var endpoint=(window.NAGA_API&&window.NAGA_API.advertisementPopup)
  || ((window.NAGA_CONFIG&&window.NAGA_CONFIG.api&&window.NAGA_CONFIG.api.baseUrl)||'')+'/api/frontend/ad-popup';

function localDate(){
  var d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}
function storageGet(key){try{return localStorage.getItem(key)||'';}catch(_){return '';}}
function storageSet(key,value){try{localStorage.setItem(key,value);}catch(_){}}
function normalizeMode(v){
  v=String(v||'').toUpperCase();
  return ['EVERY_REFRESH','ONCE_AFTER_CLOSE','DAILY'].indexOf(v)>=0?v:'EVERY_REFRESH';
}
function shouldShow(cfg){
  if(!cfg||cfg.enabled!==true)return false;
  var version=String(cfg.version||1),mode=normalizeMode(cfg.displayMode);
  if(mode==='ONCE_AFTER_CLOSE') return storageGet('naga_ad_popup_closed_'+version)!=='1';
  if(mode==='DAILY') return storageGet('naga_ad_popup_daily_'+version)!==localDate();
  return true;
}
function rememberClose(cfg){
  var version=String(cfg.version||1),mode=normalizeMode(cfg.displayMode);
  if(mode==='ONCE_AFTER_CLOSE')storageSet('naga_ad_popup_closed_'+version,'1');
  else if(mode==='DAILY')storageSet('naga_ad_popup_daily_'+version,localDate());
}
function validLink(v){
  v=String(v||'').trim();
  if(!v)return '';
  if(/^https?:\/\//i.test(v)||v.charAt(0)==='/'||v.charAt(0)==='#')return v;
  return '';
}
function build(cfg){
  var hasImage=!!String(cfg.imageUrl||'').trim(),title=String(cfg.title||'').trim(),message=String(cfg.message||'').trim();
  if(!hasImage&&!title&&!message)return;

  var buttonText=String(cfg.buttonText||'').trim();
  var url=validLink(cfg.linkUrl);
  var hasCopy=!!(title||message||(url&&buttonText));

  var overlay=document.createElement('div');overlay.className='naga-ad-popup-overlay';overlay.setAttribute('role','presentation');
  var popup=document.createElement('div');popup.className='naga-ad-popup'+(hasImage&&!hasCopy?' naga-ad-popup-image-only':'');popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','true');popup.setAttribute('aria-label',title||'Advertisement');
  var close=document.createElement('button');close.type='button';close.className='naga-ad-popup-close';close.setAttribute('aria-label','Close advertisement');close.innerHTML='&times;';
  popup.appendChild(close);

  if(hasImage){
    var image=document.createElement('img');image.className='naga-ad-popup-image';image.src=String(cfg.imageUrl);image.alt=title||'Advertisement';image.decoding='async';
    if(url){var imageLink=document.createElement('a');imageLink.className='naga-ad-popup-image-link';imageLink.href=url;imageLink.appendChild(image);popup.appendChild(imageLink);}
    else popup.appendChild(image);
  }
  if(hasCopy){
    var copy=document.createElement('div');copy.className='naga-ad-popup-copy';
    if(title){var h=document.createElement('h2');h.className='naga-ad-popup-title';h.textContent=title;copy.appendChild(h);}
    if(message){var p=document.createElement('p');p.className='naga-ad-popup-message';p.textContent=message;copy.appendChild(p);}
    if(url&&buttonText){var a=document.createElement('a');a.className='naga-ad-popup-action';a.href=url;a.textContent=buttonText;copy.appendChild(a);}
    popup.appendChild(copy);
  }
  overlay.appendChild(popup);document.body.appendChild(overlay);document.body.classList.add('naga-ad-popup-lock');

  var closed=false;
  function dismiss(){
    if(closed)return;closed=true;rememberClose(cfg);overlay.classList.remove('is-open');document.body.classList.remove('naga-ad-popup-lock');
    setTimeout(function(){if(overlay.parentNode)overlay.parentNode.removeChild(overlay);},220);
  }
  close.addEventListener('click',dismiss);
  overlay.addEventListener('click',function(e){if(e.target===overlay)dismiss();});
  document.addEventListener('keydown',function escHandler(e){if(e.key==='Escape'&&!closed){dismiss();document.removeEventListener('keydown',escHandler);}});
  requestAnimationFrame(function(){requestAnimationFrame(function(){overlay.classList.add('is-open');close.focus({preventScroll:true});});});
}
async function init(){
  try{
    var response=await fetch(endpoint,{method:'GET',headers:{'Accept':'application/json'},cache:'no-store'});
    var json=await response.json().catch(function(){return {};});
    if(!response.ok||json.status==='error')return;
    var cfg=json.data||{};
    if(shouldShow(cfg))build(cfg);
  }catch(_){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();