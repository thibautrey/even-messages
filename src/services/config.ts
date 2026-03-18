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
