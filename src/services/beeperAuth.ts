/**
 * Beeper OAuth Authentication
 * 
 * Implements OAuth2 PKCE flow for desktop/local apps.
 * Opens browser for user authorization, then exchanges code for token.
 */

import { getConfig } from './config'

function getBaseUrl(): string {
  return getConfig().beeper?.baseUrl || 'http://localhost:23373'
}

const CLIENT_ID = 'even-messages'

/**
 * Generate random string for PKCE
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64)
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return { verifier, challenge: hashBase64 }
}

/**
 * Store pending OAuth state
 */
interface PendingAuth {
  state: string
  verifier: string
  baseUrl: string
  promise: {
    resolve: (token: string) => void
    reject: (error: Error) => void
  }
}

let pendingAuth: PendingAuth | null = null

/**
 * Start OAuth flow - opens browser for authorization
 */
export async function authenticateWithBeeper(): Promise<string> {
  const baseUrl = getBaseUrl()
  const { verifier, challenge } = await generatePKCE()
  const state = generateRandomString(16)
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: `${baseUrl}/oauth/callback`,
    scope: 'read write',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  
  const authUrl = `${baseUrl}/oauth/authorize?${params}`
  
  console.log('[BeeperAuth] Opening browser for authorization...')
  console.log('[BeeperAuth] URL:', authUrl)
  
  // Open browser for authorization
  window.open(authUrl, '_blank')
  
  // Create promise that will be resolved when user completes auth
  return new Promise((resolve, reject) => {
    pendingAuth = { state, verifier, baseUrl, promise: { resolve, reject } }
    
    // Set timeout (5 minutes)
    setTimeout(() => {
      if (pendingAuth) {
        pendingAuth.promise.reject(new Error('Authentication timeout'))
        pendingAuth = null
      }
    }, 5 * 60 * 1000)
  })
}

/**
 * Handle OAuth callback - call this when redirected back to the app
 * Returns the access token
 */
export async function handleAuthCallback(code: string, state: string): Promise<string | null> {
  if (!pendingAuth || pendingAuth.state !== state) {
    console.error('[BeeperAuth] No pending auth or state mismatch')
    return null
  }
  
  try {
    if (!pendingAuth) {
      throw new Error('No pending authentication')
    }
    
    // Exchange code for token
    const response = await fetch(`${pendingAuth.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: `${pendingAuth.baseUrl}/oauth/callback`,
        code_verifier: pendingAuth.verifier,
      }),
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('[BeeperAuth] Token exchange failed:', error)
      pendingAuth.promise.reject(new Error('Token exchange failed'))
      pendingAuth = null
      return null
    }
    
    const data = await response.json()
    const accessToken = data.access_token
    
    console.log('[BeeperAuth] Successfully obtained access token')
    pendingAuth.promise.resolve(accessToken)
    pendingAuth = null
    
    return accessToken
  } catch (error) {
    console.error('[BeeperAuth] Error during token exchange:', error)
    if (pendingAuth) {
      pendingAuth.promise.reject(error as Error)
    }
    pendingAuth = null
    return null
  }
}

/**
 * Check if there's a pending authentication
 */
export function hasPendingAuth(): boolean {
  return pendingAuth !== null
}
