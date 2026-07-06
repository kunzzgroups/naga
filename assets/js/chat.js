(function(){
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const inputWrap = document.getElementById('chatInputWrap');
  const preview = document.getElementById('chatPastePreview');
  const messages = document.getElementById('chatMessages');
  const attachBtn = document.getElementById('chatAttach');
  const fileInput = document.getElementById('chatFileInput');

  let db = null;
  let storage = null;
  let conversationId = '';
  let member = getMember();
  let unsubscribeMessages = null;
  let pendingFiles = [];
  let pendingPreviewUrls = [];
  let editingMessageId = '';
  let editingOriginalText = '';
  let chatLocked = false;

  init();

  function init(){
    bindInputs();
    if(!messages) return;
    if(!initFirebase()){
      showSystem('Live chat is not configured. Please setup Firebase config first.');
      return;
    }
    member = getMember();
    if(!isLoggedIn()){
      renderLoginRequired();
      return;
    }
    conversationId = getConversationId(member);
    startChat();
  }

  function initFirebase(){
    if(!window.firebase || !window.NAGA_FIREBASE_CONFIG || window.NAGA_FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') return false;
    if(!firebase.apps.length) firebase.initializeApp(window.NAGA_FIREBASE_CONFIG);
    db = firebase.firestore();
    storage = firebase.storage();
    return true;
  }

  function bindInputs(){
    if(attachBtn && fileInput){
      attachBtn.addEventListener('click', function(){ if(!isLoggedIn()){ renderLoginRequired(); return; } fileInput.click(); });
      fileInput.addEventListener('change', function(){
        addPendingFiles(Array.from(fileInput.files || []));
        fileInput.value = '';
      });
    }
    if(input){
      input.addEventListener('paste', handlePasteFiles);
      input.addEventListener('input', autoResizeInput);
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter' && !e.shiftKey){
          e.preventDefault();
          submitChat();
        }
        if(e.key === 'Escape' && editingMessageId){
          e.preventDefault();
          clearEditMode();
        }
      });
    }
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        submitChat();
      });
    }
  }

  async function startChat(){
    chatLocked = false;
    if(form) form.style.display = '';
    if(input) input.disabled = false;
    if(attachBtn) attachBtn.disabled = false;
    await ensureConversation();
    markMemberRead();
    renderLoading();
    if(unsubscribeMessages) unsubscribeMessages();
    unsubscribeMessages = db.collection('conversations').doc(conversationId).collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(function(snapshot){
        messages.innerHTML = '';
        if(snapshot.empty){
          renderWelcomeMessage();
        }else{
          snapshot.forEach(function(doc){ renderMessage(doc.data(), doc.id); });
        }
        scrollBottom();
      }, function(error){
        showSystem('Unable to load live chat. ' + (error && error.message ? error.message : ''));
      });
  }

  async function ensureConversation(){
    const ref = db.collection('conversations').doc(conversationId);
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await ref.set({
      conversationId: conversationId,
      memberId: member.id || member.memberId || '',
      memberName: memberName(member),
      memberUsername: member.username || member.mobile || '',
      status: 'open',
      lastMessage: 'New chat opened',
      updatedAt: now,
      createdAt: now
    }, {merge:true});
  }

  async function submitChat(){
    if(!isLoggedIn()){ renderLoginRequired(); return; }
    if(!input || !db || !conversationId || chatLocked) return;
    const text = input.value.trim();
    if(editingMessageId){
      if(!text) return;
      try{
        await db.collection('conversations').doc(conversationId).collection('messages').doc(editingMessageId).set({
          text: text,
          editedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});
        clearEditMode();
      }catch(e){ showSystem(e.message || 'Edit failed.'); }
      return;
    }
    if(!text && !pendingFiles.length) return;
    const sendFiles = pendingFiles.slice();
    input.value = '';
    autoResizeInput();
    clearPendingFiles();
    try{
      const attachments = await uploadFiles(sendFiles);
      await saveMessage({text:text, attachments:attachments});
    }catch(e){
      showSystem(e.message || 'Send failed.');
    }
  }

  async function uploadFiles(files){
    const result = [];
    for(const file of files){
      const safeName = safeFileName(file.name || 'attachment');
      const path = 'livechat/' + conversationId + '/' + Date.now() + '-' + safeName;
      const snap = await storage.ref(path).put(file);
      const url = await snap.ref.getDownloadURL();
      result.push({
        name: file.name || safeName,
        size: file.size || 0,
        type: file.type || 'application/octet-stream',
        url: url,
        path: path
      });
    }
    return result;
  }

  async function saveMessage(payload){
    const text = payload.text || '';
    const attachments = payload.attachments || [];
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await db.collection('conversations').doc(conversationId).collection('messages').add({
      senderType: 'member',
      senderName: memberName(member),
      memberId: member.id || member.memberId || '',
      text: text,
      attachments: attachments,
      createdAt: now
    });
    await db.collection('conversations').doc(conversationId).set({
      lastMessage: text || (attachments.length ? '[Attachment]' : ''),
      lastSenderType: 'member',
      updatedAt: now,
      status: 'open',
      memberName: memberName(member),
      memberUsername: member.username || member.mobile || '',
      adminUnreadCount: firebase.firestore.FieldValue.increment(1)
    }, {merge:true});
  }

  async function markMemberRead(){
    if(!db || !conversationId) return;
    try{
      await db.collection('conversations').doc(conversationId).set({
        memberUnreadCount: 0,
        memberReadAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
    }catch(e){}
  }

  function renderLoading(){
    messages.innerHTML = '<div class="chat-time">Loading live chat...</div>';
  }

  function renderLoginRequired(){
    chatLocked = true;
    if(unsubscribeMessages){ try{ unsubscribeMessages(); }catch(e){} unsubscribeMessages = null; }
    conversationId = '';
    clearPendingFiles();
    clearEditMode();
    if(messages){
      messages.innerHTML = '<article class="chat-bubble system wide"><div class="bubble-name">System</div><p>Please login first to use live chat.</p><p><a href="login.html?redirect=chat.html" style="color:#facc15;font-weight:800;">Go to Login</a></p></article>';
    }
    if(form) form.style.display = 'none';
    if(input) input.disabled = true;
    if(attachBtn) attachBtn.disabled = true;
  }

  function renderWelcomeMessage(){
    messages.innerHTML = '<div class="chat-date">Today</div><article class="chat-bubble system wide"><div class="bubble-name">System</div><p>✅ Welcome to live chat. Please send your question and our admin will reply here.</p></article>';
  }

  function renderMessage(msg, messageId){
    const isMe = msg.senderType === 'member';
    const bubble = document.createElement('article');
    bubble.className = 'chat-bubble ' + (isMe ? 'user' : 'admin') + (hasLongContent(msg) ? ' medium' : '');
    let html = '';
    if(isMe && messageId && isLoggedIn()){
      html += '<button class="chat-msg-more" type="button" aria-label="Message actions" title="Message actions">⋮</button>';
      html += '<div class="chat-msg-menu" hidden>';
      if(msg.text && !msg.recalled) html += '<button type="button" data-chat-action="edit">Edit Message</button>';
      if(!msg.recalled) html += '<button type="button" data-chat-action="recall">Recall Message</button>';
      html += '<button type="button" data-chat-action="delete">Delete Message</button>';
      html += '</div>';
    }
    html += '<div class="bubble-name">' + esc(msg.senderName || (isMe ? 'You' : 'Admin')) + '</div>';
    if(msg.recalled){
      html += '<p class="chat-text-message chat-recalled">You recalled a message</p>';
    }else if(msg.text){
      html += '<p class="chat-text-message">' + formatMessageText(msg.text) + '</p>';
    }
    const files = msg.recalled ? [] : (Array.isArray(msg.attachments) ? msg.attachments : []);
    if(files.length){
      html += '<div class="chat-attachments">';
      files.forEach(function(file){
        const name = esc(file.name || 'attachment');
        const url = esc(file.url || '#');
        const type = String(file.type || '');
        if(type.indexOf('image/') === 0){
          html += '<a class="chat-attachment image" href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" alt="' + name + '"><span>' + name + '</span></a>';
        }else{
          html += '<a class="chat-attachment file" href="' + url + '" target="_blank" rel="noopener"><span class="file-icon">📄</span><span class="file-info"><b>' + name + '</b><small>' + formatFileSize(file.size || 0) + '</small></span></a>';
        }
      });
      html += '</div>';
    }
    bubble.innerHTML = html;
    if(isMe && messageId && isLoggedIn()) bindMessageActions(bubble, messageId, msg);
    messages.appendChild(bubble);
  }

  function bindMessageActions(bubble, messageId, msg){
    const more = bubble.querySelector('.chat-msg-more');
    const menu = bubble.querySelector('.chat-msg-menu');
    if(!more || !menu) return;
    more.addEventListener('click', function(e){
      e.stopPropagation();
      closeAllMessageMenus(menu);
      menu.hidden = !menu.hidden;
    });
    menu.addEventListener('click', async function(e){
      const btn = e.target.closest('button[data-chat-action]');
      if(!btn) return;
      e.stopPropagation();
      menu.hidden = true;
      const action = btn.getAttribute('data-chat-action');
      if(action === 'edit') return editMessage(messageId, msg, bubble);
      if(action === 'recall') return recallMessage(messageId);
      if(action === 'delete') return deleteMessage(messageId);
    });
  }

  function closeAllMessageMenus(except){
    document.querySelectorAll('.chat-msg-menu').forEach(function(m){ if(m !== except) m.hidden = true; });
  }

  document.addEventListener('click', function(){ closeAllMessageMenus(); });

  function editMessage(messageId, msg){
    if(!db || !conversationId || !messageId || !msg.text || msg.recalled || !input) return;
    clearPendingFiles();
    editingMessageId = messageId;
    editingOriginalText = String(msg.text || '');
    input.value = editingOriginalText;
    autoResizeInput();
    if(editBar){
      const previewText = editingOriginalText.length > 42 ? editingOriginalText.slice(0, 42) + '...' : editingOriginalText;
      const previewEl = editBar.querySelector('#chatEditPreview');
      if(previewEl) previewEl.textContent = previewText;
      editBar.hidden = false;
    }
    if(attachBtn) attachBtn.disabled = true;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function clearEditMode(){
    editingMessageId = '';
    editingOriginalText = '';
    if(input){
      input.value = '';
      autoResizeInput();
    }
    if(input){
      input.placeholder = 'Text here...';
      input.classList.remove('is-editing-message');
    }
    if(form) form.classList.remove('is-editing-message');
    if(attachBtn) attachBtn.disabled = false;
  }

  async function recallMessage(messageId){
    if(!db || !conversationId || !messageId) return;
    if(!confirm('Recall this message for everyone?')) return;
    try{
      await db.collection('conversations').doc(conversationId).collection('messages').doc(messageId).set({
        text: '',
        attachments: [],
        recalled: true,
        recalledAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
    }catch(e){ showSystem(e.message || 'Recall failed.'); }
  }

  async function deleteMessage(messageId){
    if(!db || !conversationId || !messageId) return;
    if(!confirm('Delete this message from your chat view?')) return;
    try{
      await db.collection('conversations').doc(conversationId).collection('messages').doc(messageId).delete();
    }catch(e){ showSystem(e.message || 'Delete failed.'); }
  }

  function hasLongContent(msg){
    return (msg.text || '').length > 40 || (Array.isArray(msg.attachments) && msg.attachments.length);
  }

  function showSystem(text){
    if(!messages) return;
    messages.innerHTML = '<article class="chat-bubble system wide"><div class="bubble-name">System</div><p>' + esc(text) + '</p></article>';
  }

  function getMember(){
    try{ return JSON.parse(localStorage.getItem('member_info') || '{}') || {}; }catch(e){ return {}; }
  }

  function isLoggedIn(){
    member = getMember();
    const token = localStorage.getItem('member_token') || '';
    return !!token && !!(member.id || member.memberId || member.username || member.mobile);
  }

  function getConversationId(member){
    const id = member.id || member.memberId || member.username || member.mobile || localStorage.getItem('livechat_guest_id');
    if(id) return 'member_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const guest = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    localStorage.setItem('livechat_guest_id', guest);
    return guest;
  }

  function memberName(member){
    return (member && (member.fullName || member.full_name || member.name || member.username || member.mobile)) || 'Member';
  }

  function handlePasteFiles(e){
    if(!isLoggedIn()){ renderLoginRequired(); return; }
    const clipboard = e.clipboardData || window.clipboardData;
    if(!clipboard) return;
    const files = [];
    if(clipboard.files && clipboard.files.length) files.push.apply(files, Array.from(clipboard.files));
    if(clipboard.items && clipboard.items.length){
      Array.from(clipboard.items).forEach(function(item, index){
        if(item.kind !== 'file') return;
        const file = item.getAsFile();
        if(file) files.push(renameClipboardFile(file, index));
      });
    }
    const uniqueFiles = removeDuplicateFiles(files);
    if(uniqueFiles.length){
      e.preventDefault();
      addPendingFiles(uniqueFiles);
      if(input) input.focus();
    }
  }

  function addPendingFiles(files){
    if(!files || !files.length) return;
    pendingFiles = pendingFiles.concat(files);
    renderPendingPreview();
  }

  function clearPendingFiles(){
    pendingFiles = [];
    pendingPreviewUrls.forEach(function(url){ URL.revokeObjectURL(url); });
    pendingPreviewUrls = [];
    renderPendingPreview();
  }

  function removePendingFile(index){
    pendingFiles.splice(index, 1);
    renderPendingPreview();
    if(input) input.focus();
  }

  function renderPendingPreview(){
    if(!preview) return;
    pendingPreviewUrls.forEach(function(url){ URL.revokeObjectURL(url); });
    pendingPreviewUrls = [];
    preview.innerHTML = '';
    if(!pendingFiles.length){
      preview.classList.remove('has-files');
      if(inputWrap) inputWrap.classList.remove('has-files');
      return;
    }
    preview.classList.add('has-files');
    if(inputWrap) inputWrap.classList.add('has-files');
    pendingFiles.forEach(function(file, index){
      const chip = document.createElement('div');
      chip.className = 'chat-paste-chip';
      if(file.type && file.type.indexOf('image/') === 0){
        const url = URL.createObjectURL(file);
        pendingPreviewUrls.push(url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = file.name || 'image';
        chip.appendChild(img);
      }else{
        const icon = document.createElement('span');
        icon.className = 'chat-paste-file-icon';
        icon.textContent = '📄';
        chip.appendChild(icon);
      }
      const name = document.createElement('span');
      name.className = 'chat-paste-name';
      name.textContent = file.name || 'attachment';
      chip.appendChild(name);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'chat-paste-remove';
      remove.innerHTML = '&times;';
      remove.addEventListener('click', function(){ removePendingFile(index); });
      chip.appendChild(remove);
      preview.appendChild(chip);
    });
  }

  function renameClipboardFile(file, index){
    if(file.name) return file;
    const ext = getExtensionByType(file.type);
    return new File([file], 'pasted-attachment-' + (Date.now() + index) + ext, {type:file.type || 'application/octet-stream'});
  }

  function getExtensionByType(type){
    if(type === 'image/png') return '.png';
    if(type === 'image/jpeg') return '.jpg';
    if(type === 'image/gif') return '.gif';
    if(type === 'image/webp') return '.webp';
    if(type === 'application/pdf') return '.pdf';
    return '';
  }

  function removeDuplicateFiles(files){
    const seen = new Set();
    return files.filter(function(file){
      const key = [file.name, file.size, file.type, file.lastModified].join('|');
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function safeFileName(name){
    return String(name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  function autoResizeInput(){
    if(!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }

  function scrollBottom(){
    if(messages) messages.scrollTop = messages.scrollHeight;
  }

  function formatFileSize(bytes){
    if(!bytes) return '0 KB';
    if(bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function formatMessageText(str){
    return esc(str).replace(/\r\n|\r|\n/g, '<br>');
  }

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }


  window.addEventListener('storage', function(e){
    if(e.key === 'member_token' && !e.newValue) renderLoginRequired();
  });
  document.addEventListener('naga:member-logout', function(){ renderLoginRequired(); });

})();
