(function(){
  // Force only customizable uploaded assets to reload fresh after backend upload.
  // This does not affect normal static JS/CSS cache.
  var CUSTOM_ASSET_VERSION = String(Date.now());
  var CUSTOM_IMAGE_PATH = 'assets/custom/images/';

  function addCacheBuster(url){
    if(!url || url.indexOf(CUSTOM_IMAGE_PATH) === -1) return url;

    var parts = url.split('#');
    var base = parts[0];
    var hash = parts.length > 1 ? '#' + parts.slice(1).join('#') : '';

    base = base.replace(/([?&])_cb=\d+(&?)/, function(match, p1, p2){
      return p2 ? p1 : '';
    });

    return base + (base.indexOf('?') === -1 ? '?' : '&') + '_cb=' + CUSTOM_ASSET_VERSION + hash;
  }

  function refreshCustomImages(){
    document.querySelectorAll('img[src*="assets/custom/images/"], input[type="image"][src*="assets/custom/images/"]').forEach(function(el){
      var freshSrc = addCacheBuster(el.getAttribute('src'));
      if(freshSrc) el.setAttribute('src', freshSrc);
    });

    document.querySelectorAll('link[href*="assets/custom/images/"]').forEach(function(el){
      var freshHref = addCacheBuster(el.getAttribute('href'));
      if(freshHref) el.setAttribute('href', freshHref);
    });
  }

  function refreshCustomBackground(){
    var bgUrl = addCacheBuster(CUSTOM_IMAGE_PATH + 'background.png');
    var style = document.createElement('style');
    style.setAttribute('data-custom-asset-cache', CUSTOM_ASSET_VERSION);
    style.textContent = [
      'body,',
      'body.bonus-page,',
      'body.chat-page,',
      'body.deposit-page,',
      'body.downline-page,',
      'body.forgot-page,',
      'body.game-detail-page,',
      'body.history-page,',
      'body.login-page,',
      'body.setting-page,',
      'body.withdraw-page {',
      '  background-image: url("' + bgUrl + '") !important;',
      '  background-repeat: no-repeat !important;',
      '  background-position: center top !important;',
      '  background-size: cover !important;',
      '  background-attachment: fixed !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function run(){
    refreshCustomBackground();
    refreshCustomImages();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', run);
  }else{
    run();
  }
})();
