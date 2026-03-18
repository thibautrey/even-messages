import { useEffect, useState, useCallback, useMemo } from 'react'
import { GlassesUI } from './glasses/GlassesUI'
import { DevModeUI } from './components/DevModeUI'
import { authenticateWithBeeper, BeeperClient, BeeperAccount, BeeperChat, getBeeperConfig, updateBeeperConfig, clearBeeperConfig } from './services'

/**
 * Even Messages App
 * 
 * This app is designed to run in the Even App WebView.
 * It uses the Even Hub SDK to display messaging content on Even Glasses.
 * 
 * Development mode shows a web UI for testing alongside the glasses display.
 */
export default function App() {
  const [isGlassesConnected, setIsGlassesConnected] = useState(false)
  const [currentView, setCurrentView] = useState<'accounts' | 'chats' | 'messages'>('accounts')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [accounts, setAccounts] = useState<BeeperAccount[]>([])
  const [chats, setChats] = useState<BeeperChat[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Get Beeper config
  const beeperConfig = useMemo(() => {
    const config = getBeeperConfig()
    return config?.token ? { baseUrl: config.baseUrl, token: config.token } : null
  }, [isAuthenticated])

  // Load real data
  const loadRealData = useCallback(async (baseUrl: string, token: string) => {
    const client = new BeeperClient({ baseUrl, token })
    
    try {
      // Test connection
      const info = await client.getInfo()
      console.log('[App] Connected to Beeper:', info.app?.version)
      
      // Load accounts
      const accts = await client.listAccounts()
      setAccounts(accts)
      console.log('[App] Loaded accounts:', accts.length)
      
      // Load all chats
      const { chats: chatList } = await client.listChats()
      setChats(chatList)
      console.log('[App] Loaded chats:', chatList.length)
      
      setError(null)
    } catch (err) {
      console.error('[App] Failed to load data:', err)
      setError('Failed to connect to Beeper. Check your settings.')
      setIsAuthenticated(false)
      clearBeeperConfig()
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    // Check for stored Beeper config
    const config = getBeeperConfig()
    if (config?.token) {
      setIsAuthenticated(true)
      loadRealData(config.baseUrl, config.token)
    }
    
    // Mark glasses as connected (they'll be connected when running in Even App)
    setIsGlassesConnected(true)
  }, [])

  const handleLogin = useCallback(async () => {
    setIsAuthenticating(true)
    setError(null)
    
    try {
      const newToken = await authenticateWithBeeper()
      if (newToken) {
        const config = getBeeperConfig()
        const baseUrl = config?.baseUrl || 'http://localhost:23373'
        updateBeeperConfig(baseUrl, newToken)
        setIsAuthenticated(true)
        await loadRealData(baseUrl, newToken)
      }
    } catch (err) {
      console.error('[App] Authentication failed:', err)
      setError('Authentication failed. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }, [loadRealData])

  const handleSaveSettings = useCallback(async (baseUrl: string, token: string) => {
    setError(null)
    updateBeeperConfig(baseUrl, token)
    setShowSettings(false)
    
    try {
      const client = new BeeperClient({ baseUrl, token })
      // Test connection
      await client.getInfo()
      
      setIsAuthenticated(true)
      await loadRealData(baseUrl, token)
    } catch (err) {
      console.error('[App] Connection failed:', err)
      setError('Failed to connect. Check URL and token.')
      setIsAuthenticated(false)
      clearBeeperConfig()
    }
  }, [loadRealData])

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false)
    setAccounts([])
    setChats([])
    clearBeeperConfig()
  }, [])

  const handleAccountSelect = useCallback((id: string) => {
    if (!id) {
      // Go back to accounts view
      setSelectedAccount(null)
      setSelectedChat(null)
      setCurrentView('accounts')
    } else {
      setSelectedAccount(id)
      setSelectedChat(null)
      setCurrentView('chats')
    }
  }, [])

  const handleChatSelect = useCallback(async (id: string) => {
    if (!id) {
      // Go back to chats view
      setSelectedChat(null)
      setCurrentView('chats')
    } else {
      setSelectedChat(id)
      setCurrentView('messages')
    }
  }, [])

  const handleBack = useCallback(() => {
    if (currentView === 'messages') {
      setSelectedChat(null)
      setCurrentView('chats')
    } else if (currentView === 'chats') {
      setSelectedAccount(null)
      setSelectedChat(null)
      setCurrentView('accounts')
    }
  }, [currentView])

  const handleSendMessage = useCallback(async (content: string) => {
    const config = getBeeperConfig()
    if (!config?.token || !selectedChat) return
    
    const client = new BeeperClient(config)
    try {
      await client.sendMessage(selectedChat, { text: content })
      console.log('[App] Message sent:', content)
    } catch (err) {
      console.error('[App] Failed to send message:', err)
      setError('Failed to send message')
    }
  }, [selectedChat])

  // Filter chats by selected account
  const filteredChats = selectedAccount && selectedAccount !== 'all'
    ? chats.filter(c => c.accountID === selectedAccount)
    : chats

  return (
    <>
      {/* Glasses UI - renders nothing but controls the glasses display */}
      <GlassesUI beeperConfig={beeperConfig} />
      
      {/* Web/Dev Mode UI */}
      <DevModeUI
        isGlassesConnected={isGlassesConnected}
        currentView={currentView}
        selectedChannel={selectedAccount}
        selectedConversation={selectedChat}
        isAuthenticated={isAuthenticated}
        isAuthenticating={isAuthenticating}
        accounts={accounts}
        chats={filteredChats}
        error={error}
        showSettings={showSettings}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        onCloseSettings={() => setShowSettings(false)}
        onSaveSettings={handleSaveSettings}
        onChannelSelect={handleAccountSelect}
        onConversationSelect={handleChatSelect}
        onBack={handleBack}
        onSendMessage={handleSendMessage}
      />
    </>
  )
}
