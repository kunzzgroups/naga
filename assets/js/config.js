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
  gameProviderList: window.NAGA_CONFIG.api.baseUrl + '/api/admin/game-provider/list',
  gameList: window.NAGA_CONFIG.api.baseUrl + '/api/admin/game/list',

  // Frontend player launch API. Frontend calls this API only; provider secrets stay in Spring Boot/BO.
  playerProviderLaunch: window.NAGA_CONFIG.api.baseUrl + '/api/player/provider/launch',
  playerProviderWalletBalance: window.NAGA_CONFIG.api.baseUrl + '/api/player/provider/wallet-balance',
  // Main wallet balance shown in frontend member panel / balance box
  playerMainWalletBalance: window.NAGA_CONFIG.api.baseUrl + '/api/member/wallet/balance',
  playerProviderExit: window.NAGA_CONFIG.api.baseUrl + '/api/player/provider/exit',
  playerProviderHeartbeat: window.NAGA_CONFIG.api.baseUrl + '/api/player/provider/heartbeat',
  playerPromotionList: window.NAGA_CONFIG.api.baseUrl + '/api/player/promotion/list',
  playerPromotionClaim: window.NAGA_CONFIG.api.baseUrl + '/api/player/promotion/claim',
  playerPromotionClaims: window.NAGA_CONFIG.api.baseUrl + '/api/player/promotion/my-claims',
  playerHistoryTransactions: window.NAGA_CONFIG.api.baseUrl + '/api/player/history/transactions',
  playerHistoryBets: window.NAGA_CONFIG.api.baseUrl + '/api/player/history/bets',

  memberDeposit: window.NAGA_CONFIG.api.baseUrl + '/api/member/deposit',
  memberWithdraw: window.NAGA_CONFIG.api.baseUrl + '/api/member/withdraw',
  memberSetTransactionPassword: window.NAGA_CONFIG.api.baseUrl + '/api/member/transaction-password',
  memberDownline: window.NAGA_CONFIG.api.baseUrl + '/api/member/downline',
  paymentMethodList: window.NAGA_CONFIG.api.baseUrl + '/api/payment-method/list',

  siteCustomizeTranslation: window.NAGA_CONFIG.api.baseUrl + '/api/admin/language/translation',
  // BO Layout Section CSS/HTML/JS. CSS saved under the `home` key is loaded globally.
  layoutSection: window.NAGA_CONFIG.api.baseUrl + '/api/customize/section',
  compliancePolicyList: window.NAGA_CONFIG.api.baseUrl + '/api/compliance-policies'
};
