(function(){
  if(document.body && document.body.classList.contains('chat-page')) return;

  let db = null;
  let storage = null;
  let conversationId = '';
  let member = {};
  let unsubscribeDoc = null;
  let unsubscribeMessages = null;
  let pendingFiles = [];

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    if(!initFirebase()) return;
    member = getMember();
    if(!isLoggedIn()) return;
    conversationId = getConversationId(member);
    // injectWidget();
    bindWidget();
    ensureConversation();
    listenConversationDoc();
  }

  function initFirebase(){
    if(!window.firebase || !window.NAGA_FIREBASE_CONFIG || window.NAGA_FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') return false;
    if(!firebase.apps.length) firebase.initializeApp(window.NAGA_FIREBASE_CONFIG);
    db = firebase.firestore();
    storage = firebase.storage();
    return true;
  }

  function injectWidget(){
    if(document.getElementById('livechatWidget')) return;
    const el = document.createElement('div');
    el.id = 'livechatWidget';
    el.className = 'livechat-widget';
    el.innerHTML =
      '<button type="button" class="livechat-float-btn" id="livechatFloatBtn" aria-label="Live Chat">' +
        '<span class="livechat-float-icon">💬</span><span class="livechat-float-text">Chat</span><b id="livechatWidgetBadge" style="display:none">0</b>' +
      '</button>' +
      '<section class="livechat-mini-panel" id="livechatMiniPanel" aria-hidden="true">' +
        '<div class="mini-head"><div><b>Live Chat</b><small>Support is online</small></div><button type="button" id="livechatMiniClose">×</button></div>' +
        '<div class="mini-messages" id="livechatMiniMessages"><div class="mini-system">Loading chat...</div></div>' +
        '<form class="mini-compose" id="livechatMiniForm">' +
          '<div class="mini-preview" id="livechatMiniPreview"></div>' +
          '<textarea id="livechatMiniInput" rows="1" placeholder="Text here..."></textarea>' +
          '<button type="button" id="livechatMiniAttach">📎</button>' +
          '<input type="file" id="livechatMiniFile" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" hidden>' +
          '<button type="submit">➤</button>' +
        '</form>' +
      '</section>';
    document.body.appendChild(el);
  }

  function bindWidget(){
    const btn = document.getElementById('livechatFloatBtn');
    const close = document.getElementById('livechatMiniClose');
    const form = document.getElementById('livechatMiniForm');
    const input = document.getElementById('livechatMiniInput');
    const attach = document.getElementById('livechatMiniAttach');
    const file = document.getElementById('livechatMiniFile');

    if(btn) btn.addEventListener('click', openPanel);
    if(close) close.addEventListener('click', closePanel);
    if(form) form.addEventListener('submit', function(e){ e.preventDefault(); sendMessage(); });
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
      });
      input.addEventListener('paste', handlePasteFiles);
    }
    if(attach && file){
      attach.addEventListener('click', function(){ file.click(); });
      file.addEventListener('change', function(){
        pendingFiles = pendingFiles.concat(Array.from(file.files || []));
        file.value = '';
        renderPreview();
      });
    }
  }

  function openPanel(){
    const panel = document.getElementById('livechatMiniPanel');
    if(panel){ panel.classList.add('show'); panel.setAttribute('aria-hidden','false'); }
    markMemberRead();
    listenMessages();
  }

  function closePanel(){
    const panel = document.getElementById('livechatMiniPanel');
    if(panel){ panel.classList.remove('show'); panel.setAttribute('aria-hidden','true'); }
  }

  async function ensureConversation(){
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('conversations').doc(conversationId).set({
      conversationId: conversationId,
      memberId: member.id || member.memberId || '',
      memberName: memberName(member),
      memberUsername: member.username || member.mobile || '',
      status: 'open',
      updatedAt: now,
      createdAt: now
    }, {merge:true});
  }

  function listenConversationDoc(){
    if(unsubscribeDoc) unsubscribeDoc();
    unsubscribeDoc = db.collection('conversations').doc(conversationId).onSnapshot(function(doc){
      const data = doc.data() || {};
      const count = Number(data.memberUnreadCount || 0);
      const badge = document.getElementById('livechatWidgetBadge');
      if(badge){
        badge.textContent = count;
        badge.style.display = count ? 'inline-flex' : 'none';
      }
    });
  }

  function listenMessages(){
    const box = document.getElementById('livechatMiniMessages');
    if(!box) return;
    if(unsubscribeMessages) return;
    unsubscribeMessages = db.collection('conversations').doc(conversationId).collection('messages')
      .orderBy('createdAt','asc').limit(80)
      .onSnapshot(function(snapshot){
        box.innerHTML = '';
        if(snapshot.empty){
          box.innerHTML = '<div class="mini-system">Welcome dear. Send your question here.</div>';
        }else{
          snapshot.forEach(function(doc){ renderMessage(doc.data()); });
        }
        box.scrollTop = box.scrollHeight;
      }, function(error){
        box.innerHTML = '<div class="mini-system">' + esc(error.message || 'Unable to load chat.') + '</div>';
      });
  }

  function renderMessage(msg){
    const box = document.getElementById('livechatMiniMessages');
    if(!box) return;
    const isMe = msg.senderType === 'member';
    const wrap = document.createElement('div');
    wrap.className = 'mini-msg ' + (isMe ? 'me' : 'admin');
    let html = '<div class="mini-bubble">';
    if(msg.text) html += '<div>' + esc(msg.text).replace(/\r\n|\r|\n/g,'<br>') + '</div>';
    const files = Array.isArray(msg.attachments) ? msg.attachments : [];
    if(files.length){
      html += '<div class="mini-files">';
      files.forEach(function(f){
        const name = esc(f.name || 'attachment');
        const url = esc(f.url || '#');
        if(String(f.type || '').indexOf('image/') === 0){
          html += '<a href="' + url + '" target="_blank"><img src="' + url + '" alt="' + name + '"><span>' + name + '</span></a>';
        }else{
          html += '<a href="' + url + '" target="_blank">📄 ' + name + '</a>';
        }
      });
      html += '</div>';
    }
    html += '</div>';
    wrap.innerHTML = html;
    box.appendChild(wrap);
  }

  async function sendMessage(){
    const input = document.getElementById('livechatMiniInput');
    if(!input || !conversationId) return;
    const text = input.value.trim();
    if(!text && !pendingFiles.length) return;
    const files = pendingFiles.slice();
    input.value = '';
    pendingFiles = [];
    renderPreview();
    try{
      const attachments = await uploadFiles(files);
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('conversations').doc(conversationId).collection('messages').add({
        senderType:'member',
        senderName: memberName(member),
        memberId: member.id || member.memberId || '',
        text:text,
        attachments:attachments,
        createdAt:now
      });
      await db.collection('conversations').doc(conversationId).set({
        lastMessage: text || (attachments.length ? '[Attachment]' : ''),
        lastSenderType: 'member',
        updatedAt: now,
        status:'open',
        memberName: memberName(member),
        memberUsername: member.username || member.mobile || '',
        adminUnreadCount: firebase.firestore.FieldValue.increment(1)
      }, {merge:true});
    }catch(e){ alert(e.message || 'Send failed.'); }
  }

  async function uploadFiles(files){
    const result = [];
    for(const file of files){
      const safe = safeFileName(file.name || 'attachment');
      const path = 'livechat/' + conversationId + '/' + Date.now() + '-' + safe;
      const snap = await storage.ref(path).put(file);
      const url = await snap.ref.getDownloadURL();
      result.push({name:file.name || safe, size:file.size || 0, type:file.type || 'application/octet-stream', url:url, path:path});
    }
    return result;
  }

  async function markMemberRead(){
    try{
      await db.collection('conversations').doc(conversationId).set({
        memberUnreadCount: 0,
        memberReadAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
    }catch(e){}
  }

  function renderPreview(){
    const preview = document.getElementById('livechatMiniPreview');
    if(!preview) return;
    if(!pendingFiles.length){ preview.innerHTML = ''; preview.classList.remove('show'); return; }
    preview.classList.add('show');
    preview.innerHTML = pendingFiles.map(function(f, i){
      return '<span>' + esc(f.name || 'attachment') + '<button type="button" data-remove="' + i + '">×</button></span>';
    }).join('');
    preview.querySelectorAll('[data-remove]').forEach(function(btn){
      btn.addEventListener('click', function(){ pendingFiles.splice(Number(btn.dataset.remove), 1); renderPreview(); });
    });
  }

  function handlePasteFiles(e){
    const cb = e.clipboardData || window.clipboardData;
    if(!cb) return;
    const files = [];
    if(cb.files && cb.files.length) files.push.apply(files, Array.from(cb.files));
    if(files.length){
      e.preventDefault();
      pendingFiles = pendingFiles.concat(files);
      renderPreview();
    }
  }

  function getMember(){ try{ return JSON.parse(localStorage.getItem('member_info') || '{}') || {}; }catch(e){ return {}; } }
  function isLoggedIn(){ return !!localStorage.getItem('member_token') && !!(member.id || member.memberId || member.username || member.mobile); }
  function getConversationId(member){ return 'member_' + String(member.id || member.memberId || member.username || member.mobile || 'guest').replace(/[^a-zA-Z0-9_-]/g, '_'); }
  function memberName(member){ return (member && (member.fullName || member.full_name || member.name || member.username || member.mobile)) || 'Member'; }
  function safeFileName(name){ return String(name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_'); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
})();
