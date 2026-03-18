/**
 * App Configuration
 * 
 * Manages configuration including Beeper API settings.
 */

export interface AppConfig {
  beeper?: {
    baseUrl: string
    token: string
  }
  lastOpened?: {
    accountId: string | null
    chatId: string | null
    view: 'accounts' | 'chats' | 'messages'
  }
}

const CONFIG_KEY = 'even-messages-config'

/**
 * Get current configuration
 */
export function getConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[Config] Failed to parse config:', e)
  }
  return {}
}

/**
 * Save configuration
 */
export function saveConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

/**
 * Update Beeper configuration
 */
export function updateBeeperConfig(baseUrl: string, token: string): void {
  const config = getConfig()
  config.beeper = { baseUrl, token }
  saveConfig(config)
}

/**
 * Get Beeper configuration
 */
export function getBeeperConfig(): { baseUrl: string; token: string } | null {
  const config = getConfig()
  if (config.beeper?.baseUrl && config.beeper?.token) {
    return config.beeper
  }
  return null
}

/**
 * Clear Beeper configuration
 */
export function clearBeeperConfig(): void {
  const config = getConfig()
  delete config.beeper
  saveConfig(config)
}

/**
 * Get stored Beeper token only
 */
export function getStoredToken(): string | null {
  return getConfig().beeper?.token || null
}

/**
 * Store Beeper token
 */
export function storeToken(token: string): void {
  const config = getConfig()
  if (!config.beeper) {
    config.beeper = { baseUrl: 'http://localhost:23373', token }
  } else {
    config.beeper.token = token
  }
  saveConfig(config)
}

/**
 * Clear stored token
 */
export function clearToken(): void {
  const config = getConfig()
  if (config.beeper) {
    config.beeper.token = ''
    saveConfig(config)
  }
}

/**
 * Save the last opened conversation state
 */
export function saveLastOpenedState(state: { accountId: string | null; chatId: string | null; view: 'accounts' | 'chats' | 'messages' }): void {
  const config = getConfig()
  config.lastOpened = state
  saveConfig(config)
}

/**
 * Get the last opened conversation state
 */
export function getLastOpenedState(): { accountId: string | null; chatId: string | null; view: 'accounts' | 'chats' | 'messages' } | null {
  const config = getConfig()
  return config.lastOpened || null
}

/**
 * Clear the last opened conversation state
 */
export function clearLastOpenedState(): void {
  const config = getConfig()
  delete config.lastOpened
  saveConfig(config)
}
