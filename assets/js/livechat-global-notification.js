(function(){
  'use strict';

  if (window.__NAGA_LIVECHAT_GLOBAL_NOTIFICATION__) return;
  window.__NAGA_LIVECHAT_GLOBAL_NOTIFICATION__ = true;

  var SOUND_URL = 'assets/audio/livechat_sound.mp3';
  var audio = null;
  var audioUnlocked = false;
  var queuedSound = false;
  var db = null;
  var conversationId = '';
  var unsubscribe = null;
  var firstSnapshot = true;
  var originalTitle = document.title;
  var storageKeyPrefix = 'naga_livechat_';
  var lastAdminMessageTime = 0;
  var currentUnread = 0;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  function init(){
    // Login/registration pages should not start background chat notifications.
    var page = String(location.pathname || '').split('/').pop().toLowerCase();
    if (page === 'login.html' || page === 'register.html' || page === 'forgot-password.html' || page === 'forget-password.html') return;

    installSoundUnlock();
    requestNotificationPermission();
    if (!initFirebase()) return;

    var member = getChatIdentity();
    conversationId = getConversationId(member);
    storageKeyPrefix += conversationId + '_';
    lastAdminMessageTime = Number(localStorage.getItem(storageKeyPrefix + 'last_admin_time') || 0);
    listenConversation();
  }

  function initFirebase(){
    if (!window.firebase || !window.NAGA_FIREBASE_CONFIG || window.NAGA_FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') {
      console.warn('[Naga livechat notification] Firebase is not available on this page.');
      return false;
    }
    try{
      if (!firebase.apps.length) firebase.initializeApp(window.NAGA_FIREBASE_CONFIG);
      db = firebase.firestore();
      return true;
    }catch(error){
      console.warn('[Naga livechat notification] Unable to initialise:', error && error.message ? error.message : error);
      return false;
    }
  }

  function listenConversation(){
    if (unsubscribe) unsubscribe();
    unsubscribe = db.collection('conversations').doc(conversationId).onSnapshot(function(doc){
      var data = doc.data() || {};
      var unread = Number(data.memberUnreadCount || 0);
      var senderIsAdmin = String(data.lastSenderType || '').toLowerCase() === 'admin';
      var updatedMs = timestampValue(data.updatedAt);

      updatePageIndicators(unread);

      if (firstSnapshot){
        firstSnapshot = false;
        if (!lastAdminMessageTime){
          lastAdminMessageTime = senderIsAdmin ? updatedMs : 0;
          persistState(lastAdminMessageTime);
          currentUnread = unread;
          return;
        }
      }

      var newAdminMessage = senderIsAdmin && updatedMs > lastAdminMessageTime;
      var unreadIncreased = senderIsAdmin && unread > currentUnread;
      if ((newAdminMessage || unreadIncreased) && claimNotification(updatedMs, data.lastMessage || '')) {
        notifyIncoming(data);
      }

      if (senderIsAdmin && updatedMs > lastAdminMessageTime) lastAdminMessageTime = updatedMs;
      currentUnread = unread;
      persistState(lastAdminMessageTime);
    }, function(error){
      console.warn('[Naga livechat notification] Listener unavailable:', error && error.message ? error.message : error);
    });
  }

  function persistState(time){
    try{ localStorage.setItem(storageKeyPrefix + 'last_admin_time', String(time || 0)); }catch(e){}
  }

  function updatePageIndicators(total){
    document.title = total ? '(' + total + ') ' + originalTitle : originalTitle;
    document.querySelectorAll('[data-member-livechat-unread], #livechatWidgetBadge').forEach(function(badge){
      badge.textContent = total;
      badge.style.display = total ? 'inline-flex' : 'none';
    });
  }

  function claimNotification(messageTime, lastMessage){
    var key = [conversationId, messageTime || 0, lastMessage || ''].join('|');
    var now = Date.now();
    try{
      var previous = JSON.parse(localStorage.getItem('naga_livechat_global_sound_lock') || '{}');
      if (previous.key === key && now - Number(previous.time || 0) < 10000) return false;
      localStorage.setItem('naga_livechat_global_sound_lock', JSON.stringify({key:key, time:now}));
    }catch(e){}
    return true;
  }

  function timestampValue(value){
    try{
      if (value && typeof value.toMillis === 'function') return value.toMillis();
      if (value && typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1000000);
      if (typeof value === 'number') return value;
      if (typeof value === 'string') return Date.parse(value) || 0;
    }catch(e){}
    return 0;
  }

  function getAudio(){
    if (!audio){
      audio = new Audio(SOUND_URL);
      audio.preload = 'auto';
      audio.load();
    }
    return audio;
  }

  function installSoundUnlock(){
    var unlock = function(){ unlockSound(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    window.addEventListener('focus', function(){ if (queuedSound) playSound(); });
  }

  function unlockSound(){
    if (audioUnlocked) return;
    try{
      var player = getAudio();
      player.muted = true;
      player.currentTime = 0;
      var played = player.play();
      if (played && typeof played.then === 'function'){
        played.then(function(){
          player.pause();
          player.currentTime = 0;
          player.muted = false;
          audioUnlocked = true;
          if (queuedSound){ queuedSound = false; playSound(); }
        }).catch(function(){ player.muted = false; });
      }
    }catch(e){}
  }

  function playSound(){
    try{
      var player = getAudio();
      player.muted = false;
      player.pause();
      player.currentTime = 0;
      var played = player.play();
      if (played && typeof played.then === 'function'){
        played.then(function(){ audioUnlocked = true; queuedSound = false; })
          .catch(function(){ queuedSound = true; });
      }
    }catch(e){ queuedSound = true; }
  }

  function notifyIncoming(conversation){
    playSound();
    try{
      if ('Notification' in window && Notification.permission === 'granted'){
        var notification = new Notification('New live chat message', {
          body: conversation.lastMessage || 'Customer Support sent you a new message.',
          tag: 'member-livechat-' + conversationId,
          renotify: true,
          silent: true
        });
        notification.onclick = function(){
          try{ window.focus(); }catch(e){}
          location.href = 'chat.html';
          notification.close();
        };
      }
    }catch(e){}
  }

  function requestNotificationPermission(){
    if ('Notification' in window && Notification.permission === 'default'){
      setTimeout(function(){ try{ Notification.requestPermission().catch(function(){}); }catch(e){} }, 1200);
    }
  }

  function getMember(){
    try{ return JSON.parse(localStorage.getItem('member_info') || '{}') || {}; }catch(e){ return {}; }
  }

  function isLoggedIn(){
    var current = getMember();
    return !!localStorage.getItem('member_token') && !!(current.id || current.memberId || current.username || current.mobile);
  }

  function getGuestNumber(){
    var guestNo = localStorage.getItem('livechat_guest_no') || '';
    if(!/^GUEST\d{8}$/.test(guestNo)){
      guestNo = 'GUEST' + String(Math.floor(10000000 + Math.random() * 90000000));
      localStorage.setItem('livechat_guest_no', guestNo);
    }
    return guestNo;
  }

  function getChatIdentity(){
    var current = getMember();
    if (isLoggedIn()) return current;
    var guestNo = getGuestNumber();
    return {id:guestNo, username:guestNo, name:'Guest ' + guestNo.slice(5), isGuest:true};
  }

  function getConversationId(member){
    var prefix = member && member.isGuest ? 'guest_' : 'member_';
    return prefix + String(member.id || member.memberId || member.username || member.mobile || getGuestNumber()).replace(/[^a-zA-Z0-9_-]/g, '_');
  }
})();
