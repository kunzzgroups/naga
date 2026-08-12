(function(){
  if(window.NAGA_MODAL) return;

  function ensureStyles(){
    if(document.getElementById('nagaUiModalStyles')) return;
    const style=document.createElement('style');
    style.id='nagaUiModalStyles';
    style.textContent=`
      .naga-ui-modal{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit}
      .naga-ui-modal.hidden{display:none}
      .naga-ui-modal-backdrop{position:absolute;inset:0;background:rgba(4,9,18,.72);backdrop-filter:blur(4px)}
      .naga-ui-modal-panel{position:relative;width:min(420px,calc(100vw - 28px));background:#111a3a;border:1px solid rgba(69,145,255,.22);border-radius:18px;box-shadow:0 22px 55px rgba(0,0,0,.48);padding:22px;color:#fff}
      .naga-ui-modal-close{position:absolute;right:14px;top:11px;border:0;background:transparent;color:#cbd5e1;font-size:30px;line-height:1;cursor:pointer;padding:0 4px}
      .naga-ui-modal-title{font-size:22px;font-weight:900;margin:0 38px 8px 0;line-height:1.15}
      .naga-ui-modal-message{font-size:14px;line-height:1.48;color:#d8dfef;white-space:pre-wrap;word-break:break-word}
      .naga-ui-modal-actions{display:flex;gap:10px;margin-top:22px}
      .naga-ui-modal-btn{min-height:44px;border-radius:12px;border:0;font:inherit;font-weight:900;cursor:pointer;padding:10px 18px;flex:1}
      .naga-ui-modal-btn.cancel{background:#293453;color:#fff}
      .naga-ui-modal-btn.ok{background:linear-gradient(135deg,#ffd02b,#ff8a00);color:#151515}
      @media(max-width:768px){.naga-ui-modal{padding:14px}.naga-ui-modal-panel{border-radius:16px;padding:20px 18px}.naga-ui-modal-title{font-size:20px}.naga-ui-modal-message{font-size:13px}}
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function ensureModal(){
    ensureStyles();
    let modal=document.getElementById('nagaUiModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='nagaUiModal';
    modal.className='naga-ui-modal hidden';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`
      <div class="naga-ui-modal-backdrop" data-naga-modal-close></div>
      <div class="naga-ui-modal-panel" role="dialog" aria-modal="true" aria-labelledby="nagaUiModalTitle">
        <button type="button" class="naga-ui-modal-close" data-naga-modal-close aria-label="Close">&times;</button>
        <div class="naga-ui-modal-title" id="nagaUiModalTitle">Notice</div>
        <div class="naga-ui-modal-message" data-naga-modal-message></div>
        <div class="naga-ui-modal-actions">
          <button type="button" class="naga-ui-modal-btn cancel" data-naga-modal-cancel>Cancel</button>
          <button type="button" class="naga-ui-modal-btn ok" data-naga-modal-ok>OK</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  let activeResolve=null;
  function finish(value){
    const modal=document.getElementById('nagaUiModal');
    if(modal){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }
    document.body.classList.remove('naga-modal-open');
    const resolve=activeResolve; activeResolve=null;
    if(resolve) resolve(value);
  }

  function open(options){
    const opt=options||{};
    if(activeResolve) finish(false);
    const modal=ensureModal();
    const title=modal.querySelector('#nagaUiModalTitle');
    const message=modal.querySelector('[data-naga-modal-message]');
    const cancel=modal.querySelector('[data-naga-modal-cancel]');
    const ok=modal.querySelector('[data-naga-modal-ok]');
    title.textContent=opt.title||'Notice';
    message.textContent=String(opt.message==null?'':opt.message);
    cancel.hidden=!opt.confirm;
    ok.textContent=opt.okText||'OK';
    cancel.textContent=opt.cancelText||'Cancel';
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('naga-modal-open');
    return new Promise(resolve=>{
      activeResolve=resolve;
      ok.onclick=()=>finish(true);
      cancel.onclick=()=>finish(false);
      modal.querySelectorAll('[data-naga-modal-close]').forEach(el=>{el.onclick=()=>finish(false)});
      setTimeout(()=>ok.focus(),0);
    });
  }

  window.NAGA_MODAL={
    alert:function(message,title){ return open({title:title||'Notice',message:message,confirm:false}); },
    confirm:function(message,title,options){ return open(Object.assign({title:title||'Confirm',message:message,confirm:true},options||{})); },
    error:function(message,title){ return open({title:title||'Unable to Continue',message:message,confirm:false}); }
  };

  // Prevent browser-native alert boxes anywhere in the frontend. Existing and
  // future alert() calls are rendered with the same branded modal instead.
  window.alert=function(message){ window.NAGA_MODAL.alert(message,'Notice'); };

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && activeResolve) finish(false);
  });
})();
