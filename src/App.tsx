import { useEffect, useState, useCallback } from 'react'
import { GlassesUI } from './glasses/GlassesUI'
import { DevModeUI } from './components/DevModeUI'
import {
  BeeperClient,
  BeeperAccount,
  BeeperChat,
  getApiConfig,
  getSpeechApiConfig,
  updateApiConfig,
  updateSpeechApiConfig,
  clearApiConfig,
  saveLastOpenedState,
  getLastOpenedState,
  clearLastOpenedState,
  type SpeechApiConfig,
} from './services'

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
  const [currentView, setCurrentView] = useState<'accounts' | 'chats' | 'messages'>('chats')
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [accounts, setAccounts] = useState<BeeperAccount[]>([])
  const [chats, setChats] = useState<BeeperChat[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [apiConfig, setApiConfig] = useState<{ baseUrl: string; token: string } | null>(null)
  const [speechConfig, setSpeechConfig] = useState<SpeechApiConfig | null>(null)

  // Load real data
  const loadRealData = useCallback(async (baseUrl: string, token: string) => {
    const client = new BeeperClient({ baseUrl, token })
    
    try {
      // Test connection
      const info = await client.getInfo()
      console.log('[App] Connected to API:', info.app?.version)
      
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
      setError('Failed to connect to API. Check your settings.')
      setIsAuthenticated(false)
      setApiConfig(null)
      await clearApiConfig()
    }
  }, [])

  // Initialize on mount - check for stored config
  useEffect(() => {
    async function init() {
      try {
        // Check for stored API config
        const config = await getApiConfig()
        if (config?.token) {
          setApiConfig(config)
          setIsAuthenticated(true)
          await loadRealData(config.baseUrl, config.token)
        }

        const savedSpeechConfig = await getSpeechApiConfig()
        if (savedSpeechConfig) {
          setSpeechConfig(savedSpeechConfig)
        }
      } catch (err) {
        console.error('[App] Failed to load config:', err)
      } finally {
        setIsLoading(false)
      }
      
      // Mark glasses as connected (they'll be connected when running in Even App)
      setIsGlassesConnected(true)
    }
    
    init()
  }, [])

  // Restore last opened conversation after authentication and data load.
  // Default to the conversations list when nothing can be restored.
  useEffect(() => {
    if (!isAuthenticated || accounts.length === 0 || chats.length === 0) return

    getLastOpenedState().then(lastState => {
      if (!lastState) {
        setSelectedAccount('all')
        setSelectedChat(null)
        setCurrentView('chats')
        return
      }

      const requestedAccountId = lastState.accountId ?? 'all'
      const accountExists = requestedAccountId === 'all' || accounts.some(a => a.accountID === requestedAccountId)

      if (!accountExists) {
        setSelectedAccount('all')
        setSelectedChat(null)
        setCurrentView('chats')
        return
      }

      setSelectedAccount(requestedAccountId)

      if (lastState.view === 'messages' && lastState.chatId) {
        const chatExists = chats.some(c => c.id === lastState.chatId)
        if (chatExists) {
          setSelectedChat(lastState.chatId)
          setCurrentView('messages')
          return
        }
      }

      setSelectedChat(null)
      setCurrentView('chats')
    })
  }, [isAuthenticated, accounts, chats])

  // Save state when account changes
  useEffect(() => {
    if (isAuthenticated) {
      saveLastOpenedState({
        accountId: selectedAccount,
        chatId: selectedChat,
        view: currentView
      })
    }
  }, [selectedAccount, selectedChat, currentView, isAuthenticated])

  const handleSaveSettings = useCallback(async (baseUrl: string, token: string) => {
    setError(null)
    await updateApiConfig(baseUrl, token)
    setApiConfig({ baseUrl, token })
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
      setApiConfig(null)
      await clearApiConfig()
    }
  }, [loadRealData])

  const handleSaveSpeechSettings = useCallback(async (baseUrl: string, token: string, model: string) => {
    const nextConfig = {
      baseUrl: baseUrl.trim(),
      token: token.trim(),
      model: model.trim(),
    }

    await updateSpeechApiConfig(nextConfig.baseUrl, nextConfig.token, nextConfig.model)
    setSpeechConfig(nextConfig)
    setShowSettings(false)
  }, [])

  const handleLogout = useCallback(async () => {
    setIsAuthenticated(false)
    setAccounts([])
    setChats([])
    setSelectedAccount(null)
    setSelectedChat(null)
    setCurrentView('accounts')
    setApiConfig(null)
    await clearApiConfig()
    await clearLastOpenedState()
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
    if (!apiConfig?.token || !selectedChat) return
    
    const client = new BeeperClient(apiConfig)
    try {
      await client.sendMessage(selectedChat, { text: content })
      console.log('[App] Message sent:', content)
    } catch (err) {
      console.error('[App] Failed to send message:', err)
      setError('Failed to send message')
    }
  }, [apiConfig, selectedChat])

  // Filter chats by selected account
  const filteredChats = selectedAccount && selectedAccount !== 'all'
    ? chats.filter(c => c.accountID === selectedAccount)
    : chats

  return (
    <>
      {/* Glasses UI - renders nothing but controls the glasses display */}
      <GlassesUI beeperConfig={apiConfig} speechConfig={speechConfig} />
      
      {/* Web/Dev Mode UI */}
      <DevModeUI
        isGlassesConnected={isGlassesConnected}
        currentView={currentView}
        selectedChannel={selectedAccount}
        selectedConversation={selectedChat}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        accounts={accounts}
        chats={filteredChats}
        error={error}
        showSettings={showSettings}
        isSettingsDefaultOpen={!isAuthenticated && !isLoading}
        speechConfig={speechConfig}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        onCloseSettings={() => setShowSettings(false)}
        onSaveSettings={handleSaveSettings}
        onSaveSpeechSettings={handleSaveSpeechSettings}
        onChannelSelect={handleAccountSelect}
        onConversationSelect={handleChatSelect}
        onBack={handleBack}
        onSendMessage={handleSendMessage}
      />
    </>
  )
}
