export { BeeperClient, type BeeperAccount, type BeeperChat, type BeeperMessage, type BeeperUser, type SendMessagePayload, type BeeperWebSocketEvent, type BeeperConfig } from './beeperClient'
export { authenticateWithBeeper, handleAuthCallback, hasPendingAuth } from './beeperAuth'
export { listSpeechProviderModels, type SpeechProviderModel } from './speechProvider'
export {
  getConfig,
  saveConfig,
  getApiConfig,
  getApiConfigSync,
  updateApiConfig,
  clearApiConfig,
  updateBeeperConfig,
  getBeeperConfig,
  clearBeeperConfig,
  getStoredToken,
  storeToken,
  clearToken,
  saveLastOpenedState,
  getLastOpenedState,
  clearLastOpenedState,
  getSpeechApiConfig,
  getSpeechApiConfigSync,
  updateSpeechApiConfig,
  clearSpeechApiConfig,
  getDisclaimerAcknowledgedCount,
  acknowledgeDisclaimer,
  type SpeechApiConfig,
} from './config'
