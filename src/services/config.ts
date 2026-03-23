/**
 * App Configuration
 * 
 * Manages configuration including API settings.
 * Uses Even SDK storage when available, with localStorage fallback for development.
 */

import { waitForEvenAppBridge, type EvenAppBridge } from '@evenrealities/even_hub_sdk'

export interface AppConfig {
  apiBaseUrl?: string
  apiToken?: string
  speechApiBaseUrl?: string
  speechApiToken?: string
  speechApiModel?: string
  lastOpened?: {
    accountId: string | null
    chatId: string | null
    view: 'accounts' | 'chats' | 'messages'
  }
}

const CONFIG_KEY = 'even-messages-config'

// Bridge instance for storage
let bridgeInstance: EvenAppBridge | null = null

async function getBridge(): Promise<EvenAppBridge | null> {
  if (bridgeInstance) return bridgeInstance
  try {
    bridgeInstance = await waitForEvenAppBridge()
    return bridgeInstance
  } catch (e) {
    console.warn('[Config] Failed to get Even bridge:', e)
    return null
  }
}

/**
 * Get current configuration from Even SDK storage (with localStorage fallback)
 */
export async function getConfig(): Promise<AppConfig> {
  try {
    const bridge = await getBridge()
    if (bridge) {
      const stored = await bridge.getLocalStorage(CONFIG_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    }
  } catch (e) {
    console.warn('[Config] Failed to get config from Even SDK:', e)
  }
  
  // Fallback to localStorage for development
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[Config] Failed to parse localStorage config:', e)
  }
  
  return {}
}

/**
 * Get config synchronously (localStorage only - for non-async contexts)
 */
export function getConfigSync(): AppConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('[Config] Failed to parse localStorage config:', e)
  }
  return {}
}

/**
 * Save configuration to Even SDK storage (with localStorage fallback)
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  const data = JSON.stringify(config)
  
  try {
    const bridge = await getBridge()
    if (bridge) {
      await bridge.setLocalStorage(CONFIG_KEY, data)
      console.log('[Config] Saved to Even SDK storage')
      return
    }
  } catch (e) {
    console.warn('[Config] Failed to save to Even SDK, using fallback:', e)
  }
  
  // Fallback to localStorage
  localStorage.setItem(CONFIG_KEY, data)
  console.log('[Config] Saved to localStorage (fallback)')
}

/**
 * Update API configuration (base URL and token)
 */
export async function updateApiConfig(baseUrl: string, token: string): Promise<void> {
  const config = await getConfig()
  config.apiBaseUrl = baseUrl
  config.apiToken = token
  await saveConfig(config)
}

/**
 * Get API configuration
 */
export async function getApiConfig(): Promise<{ baseUrl: string; token: string } | null> {
  const config = await getConfig()
  if (config.apiBaseUrl && config.apiToken) {
    return { baseUrl: config.apiBaseUrl, token: config.apiToken }
  }
  return null
}

/**
 * Get API config synchronously (localStorage only)
 */
export function getApiConfigSync(): { baseUrl: string; token: string } | null {
  const config = getConfigSync()
  if (config.apiBaseUrl && config.apiToken) {
    return { baseUrl: config.apiBaseUrl, token: config.apiToken }
  }
  return null
}

/**
 * Clear API configuration
 */
export async function clearApiConfig(): Promise<void> {
  const config = await getConfig()
  delete config.apiBaseUrl
  delete config.apiToken
  await saveConfig(config)
}

export interface SpeechApiConfig {
  baseUrl: string
  token: string
  model: string
}

export async function updateSpeechApiConfig(
  baseUrl: string,
  token: string,
  model: string,
): Promise<void> {
  const config = await getConfig()
  config.speechApiBaseUrl = baseUrl
  config.speechApiToken = token
  config.speechApiModel = model
  await saveConfig(config)
}

export async function getSpeechApiConfig(): Promise<SpeechApiConfig | null> {
  const config = await getConfig()
  if (config.speechApiBaseUrl && config.speechApiToken && config.speechApiModel) {
    return {
      baseUrl: config.speechApiBaseUrl,
      token: config.speechApiToken,
      model: config.speechApiModel,
    }
  }
  return null
}

export function getSpeechApiConfigSync(): SpeechApiConfig | null {
  const config = getConfigSync()
  if (config.speechApiBaseUrl && config.speechApiToken && config.speechApiModel) {
    return {
      baseUrl: config.speechApiBaseUrl,
      token: config.speechApiToken,
      model: config.speechApiModel,
    }
  }
  return null
}

export async function clearSpeechApiConfig(): Promise<void> {
  const config = await getConfig()
  delete config.speechApiBaseUrl
  delete config.speechApiToken
  delete config.speechApiModel
  await saveConfig(config)
}

/**
 * Save the last opened conversation state
 */
export async function saveLastOpenedState(state: { accountId: string | null; chatId: string | null; view: 'accounts' | 'chats' | 'messages' }): Promise<void> {
  const config = await getConfig()
  config.lastOpened = state
  await saveConfig(config)
}

/**
 * Get the last opened conversation state
 */
export async function getLastOpenedState(): Promise<{ accountId: string | null; chatId: string | null; view: 'accounts' | 'chats' | 'messages' } | null> {
  const config = await getConfig()
  return config.lastOpened || null
}

/**
 * Clear the last opened conversation state
 */
export async function clearLastOpenedState(): Promise<void> {
  const config = await getConfig()
  delete config.lastOpened
  await saveConfig(config)
}

// Legacy compatibility - these sync functions are used in DevModeUI for display only
// The actual storage now uses async Even SDK methods
export function getBeeperConfig(): { baseUrl: string; token: string } | null {
  return getApiConfigSync()
}

export const getStoredToken = (): string | null => getApiConfigSync()?.token || null

export async function storeToken(token: string): Promise<void> {
  const config = await getConfig()
  config.apiToken = token
  await saveConfig(config)
}

export function clearBeeperConfig(): void {
  // Keep legacy sync behavior for development fallback reads.
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (!stored) return

    const config = JSON.parse(stored)
    delete config.apiBaseUrl
    delete config.apiToken
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('[Config] Failed to clear config:', e)
  }
}

export async function clearToken(): Promise<void> {
  const config = await getConfig()
  delete config.apiToken
  await saveConfig(config)
}

export async function updateBeeperConfig(baseUrl: string, token: string): Promise<void> {
  await updateApiConfig(baseUrl, token)
}
