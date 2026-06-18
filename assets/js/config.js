// Global frontend config for Naga site
// Update API base URL here only. Other JS files can read from window.NAGA_CONFIG and window.NAGA_API.
window.NAGA_CONFIG = {
  api: {
    // baseUrl: 'http://localhost:8080',
    baseUrl: 'https://bo.titanxgaming.com',
    // uploadBaseUrl: 'http://localhost:8080/uploads',
    uploadBaseUrl: 'https://static.titanxgaming.com/uploads'
  }
};

window.NAGA_API = {
  sliderList: window.NAGA_CONFIG.api.baseUrl + '/api/admin/slider/list',

  bonusCategoryTitleList: window.NAGA_CONFIG.api.baseUrl + '/api/bonus-category-title',
  bonusCategoryItemList: window.NAGA_CONFIG.api.baseUrl + '/api/bonus-category-item',

  gameCategoryList: window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-category/list',
  gameSubCategoryList: window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-sub-category/list',
  gameList: window.NAGA_CONFIG.api.baseUrl + '/api/admin/game/list',

  // Frontend player launch API. Frontend calls this API only; provider secrets stay in Spring Boot/BO.
  playerProviderLaunch: window.NAGA_CONFIG.api.baseUrl + '/api/player/provider/launch',

  siteCustomizeTranslation: window.NAGA_CONFIG.api.baseUrl + '/api/admin/language/translation'
};
