import { useState, useRef, useEffect } from 'react'
import { BeeperAccount, BeeperChat, getBeeperConfig } from '../services'
import styles from './DevModeUI.module.css'

interface DevModeUIProps {
  isGlassesConnected: boolean
  currentView: 'accounts' | 'chats' | 'messages'
  selectedChannel: string | null
  selectedConversation: string | null
  isAuthenticated?: boolean
  isAuthenticating?: boolean
  accounts?: BeeperAccount[]
  chats?: BeeperChat[]
  error?: string | null
  showSettings?: boolean
  onLogin?: () => void
  onLogout?: () => void
  onOpenSettings?: () => void
  onCloseSettings?: () => void
  onSaveSettings?: (baseUrl: string, token: string) => void
  onChannelSelect: (id: string) => void
  onConversationSelect: (id: string) => void
  onBack: () => void
  onSendMessage: (content: string) => void
  // Expose scroll-to-bottom ref for parent to trigger
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>
}

export function DevModeUI({
  isGlassesConnected,
  currentView,
  selectedChannel,
  selectedConversation,
  isAuthenticated = false,
  isAuthenticating = false,
  accounts = [],
  chats = [],
  error,
  showSettings = false,
  onLogin,
  onLogout,
  onOpenSettings,
  onCloseSettings,
  onSaveSettings,
  onChannelSelect,
  onConversationSelect,
  onBack,
  onSendMessage,
}: DevModeUIProps) {
  // Format chat for display
  const formatChat = (chat: BeeperChat) => {
    const unread = chat.unreadCount > 0 ? ` (${chat.unreadCount})` : ''
    const group = chat.type === 'group' ? '[G]' : '[D]'
    const title = chat.title.length > 25 ? chat.title.slice(0, 25) + '...' : chat.title
    return { ...chat, displayName: `${group} ${title}${unread}` }
  }

  const displayedChats = chats.map(formatChat)

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1>Even Messages</h1>
        <div className={styles.status}>
          <span className={isGlassesConnected ? styles.connected : styles.disconnected}>
            {isGlassesConnected ? 'Glasses Connected' : 'Glasses Disconnected'}
          </span>
          {isAuthenticated && (
            <span className={styles.beeperStatus}>
              Beeper Connected
            </span>
          )}
          <button className={styles.settingsButton} onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorDismiss} onClick={() => {}}>Dismiss</button>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onSave={onSaveSettings!}
          onClose={onCloseSettings!}
        />
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {!isAuthenticated ? (
          /* Login View */
          <div className={styles.loginSection}>
            <div className={styles.loginCard}>
              <h2>Connect to Beeper</h2>
              <p>
                Authenticate with your Beeper account to access messages from WhatsApp, Signal, Telegram, and more.
              </p>
              <button
                className={styles.loginButton}
                onClick={onLogin}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? 'Opening browser...' : 'Login with Beeper'}
              </button>
              <p className={styles.loginHint}>
                This will open Beeper in your browser for authentication.
              </p>
              <div className={styles.divider}>
                <span>or</span>
              </div>
              <button
                className={styles.manualButton}
                onClick={onOpenSettings}
              >
                Enter API URL and Token Manually
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation */}
            <nav className={styles.breadcrumb}>
              <button 
                onClick={() => onChannelSelect('')}
                className={currentView === 'accounts' ? styles.active : ''}
              >
                Accounts
              </button>
              {selectedChannel && (
                <>
                  <span className={styles.separator}>/</span>
                  <button 
                    onClick={() => onConversationSelect('')}
                    className={currentView === 'chats' ? styles.active : ''}
                  >
                    {selectedChannel === 'all' 
                      ? 'All Chats' 
                      : accounts.find(a => a.accountID === selectedChannel)?.user.fullName 
                      || accounts.find(a => a.accountID === selectedChannel)?.user.username 
                      || 'Chats'
                    }
                  </button>
                </>
              )}
              {selectedConversation && (
                <>
                  <span className={styles.separator}>/</span>
                  <span className={styles.active}>
                    {displayedChats.find(c => c.id === selectedConversation)?.title || 'Chat'}
                  </span>
                </>
              )}
              <button className={styles.logoutButton} onClick={onLogout}>
                Logout
              </button>
            </nav>

            {/* Accounts View */}
            {currentView === 'accounts' && (
              <div className={styles.list}>
                <h2>Select an Account</h2>
                <p className={styles.countInfo}>{accounts.length} connected accounts</p>
                
                {accounts.map(account => (
                  <button
                    key={account.accountID}
                    className={styles.listItem}
                    onClick={() => onChannelSelect(account.accountID)}
                  >
                    <span className={styles.icon}></span>
                    <div className={styles.accountInfo}>
                      <span className={styles.name}>
                        {account.user.fullName || account.user.username || 'Unknown'}
                      </span>
                      <span className={styles.accountId}>
                        {account.user.username ? `@${account.user.username}` : account.accountID}
                      </span>
                    </div>
                  </button>
                ))}
                
                <button
                  className={`${styles.listItem} ${styles.allChats}`}
                  onClick={() => onChannelSelect('all')}
                >
                  <span className={styles.icon}></span>
                  <div className={styles.accountInfo}>
                    <span className={styles.name}>All Chats</span>
                    <span className={styles.accountId}>{chats.length} conversations</span>
                  </div>
                </button>
              </div>
            )}

            {/* Chats View */}
            {currentView === 'chats' && (
              <div className={styles.list}>
                <button className={styles.backButton} onClick={onBack}>
                  Back to Accounts
                </button>
                <h2>Conversations</h2>
                <p className={styles.countInfo}>{displayedChats.length} chats</p>
                
                {displayedChats.length === 0 ? (
                  <p className={styles.emptyState}>No conversations found</p>
                ) : (
                  displayedChats.map(chat => (
                    <button
                      key={chat.id}
                      className={styles.listItem}
                      onClick={() => onConversationSelect(chat.id)}
                    >
                      <span className={styles.icon}>{chat.type === 'group' ? 'G' : 'D'}</span>
                      <div className={styles.convInfo}>
                        <span className={styles.name}>{chat.title}</span>
                        <span className={styles.preview}>
                          {chat.participants.total} participants
                        </span>
                      </div>
                      {chat.unreadCount > 0 && (
                        <span className={styles.badge}>{chat.unreadCount}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Messages View */}
            {currentView === 'messages' && (
              <MessagesView
                chatId={selectedConversation}
                onBack={onBack}
                onSendMessage={onSendMessage}
                scrollToBottomRef={undefined}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Even Messages - Development Mode</p>
        <p className={styles.apiInfo}>Beeper API: http://localhost:23373</p>
      </footer>
    </div>
  )
}

// Settings Modal Component
function SettingsModal({ onSave, onClose }: { onSave: (baseUrl: string, token: string) => void; onClose: () => void }) {
  const savedConfig = getBeeperConfig()
  const [baseUrl, setBaseUrl] = useState(savedConfig?.baseUrl || 'http://localhost:23373')
  const [token, setToken] = useState(savedConfig?.token || '')
  const [showToken, setShowToken] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (baseUrl.trim() && token.trim()) {
      onSave(baseUrl.trim(), token.trim())
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>API Settings</h2>
          <button className={styles.modalClose} onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="baseUrl">Beeper API URL</label>
            <input
              id="baseUrl"
              type="url"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="http://localhost:23373"
              required
            />
            <span className={styles.hint}>
              The base URL of the Beeper Desktop API server
            </span>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="token">API Token</label>
            <div className={styles.tokenInputWrapper}>
              <input
                id="token"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Enter your Beeper API token"
                required
              />
              <button
                type="button"
                className={styles.toggleToken}
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className={styles.hint}>
              Get your token from Beeper Desktop settings or OAuth flow
            </span>
          </div>
          
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              Save & Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Messages View Component
function MessagesView({ 
  chatId, 
  onBack, 
  onSendMessage,
  scrollToBottomRef,
}: { 
  chatId: string | null
  onBack: () => void
  onSendMessage: (content: string) => void
  scrollToBottomRef?: React.MutableRefObject<(() => void) | null>
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const messageListRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(0)

  // Auto-scroll to bottom when messages load
  const scrollToBottom = (smooth = false) => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      })
      setHasNewMessages(false)
    }
  }

  // Expose scroll function to parent via ref
  useEffect(() => {
    if (scrollToBottomRef) {
      scrollToBottomRef.current = () => scrollToBottom(true)
    }
    return () => {
      if (scrollToBottomRef) {
        scrollToBottomRef.current = null
      }
    }
  }, [scrollToBottomRef])

  // Load messages
  useEffect(() => {
    if (chatId) {
      loadMessages()
      prevMessagesLengthRef.current = 0
      setHasNewMessages(false)
    }
  }, [chatId])

  // Auto-scroll to bottom when messages change and we're at the bottom
  useEffect(() => {
    if (messages.length === 0) return
    
    // Check if we were already at the bottom or if this is first load
    const isAtBottom = messageListRef.current && 
      (messageListRef.current.scrollHeight - messageListRef.current.scrollTop - messageListRef.current.clientHeight) < 100
    
    if (isAtBottom || prevMessagesLengthRef.current === 0) {
      // Scroll to bottom on initial load or if we were at bottom
      setTimeout(() => scrollToBottom(), 100)
    } else if (messages.length > prevMessagesLengthRef.current) {
      // New message arrived while scrolled up - show badge
      setHasNewMessages(true)
    }
    
    prevMessagesLengthRef.current = messages.length
  }, [messages.length])

  async function loadMessages() {
    if (!chatId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const config = getBeeperConfig()
      if (!config?.token) {
        setError('Not authenticated')
        return
      }
      
      const { BeeperClient } = await import('../services')
      const client = new BeeperClient(config)
      const result = await client.listMessages(chatId)
      setMessages(result.messages.reverse()) // Oldest first for display
    } catch (err) {
      console.error('Failed to load messages:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement
    if (input.value.trim()) {
      onSendMessage(input.value.trim())
      input.value = ''
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get message preview text based on type
  const getMessageContent = (msg: any) => {
    const config = getBeeperConfig()
    const baseUrl = config?.baseUrl || 'http://localhost:23373'
    
    // Text message
    if (msg.text && msg.text.trim()) {
      return msg.text
    }
    
    // Media message - show type indicator
    const attachment = msg.attachments?.[0]
    if (attachment) {
      switch (msg.type) {
        case 'IMAGE':
        case 'VIDEO':
          if (attachment.srcURL) {
            // For images, return the URL to load via assets/serve
            const encodedUrl = encodeURIComponent(attachment.srcURL)
            return `::image:${baseUrl}/v1/assets/serve?url=${encodedUrl}`
          }
          return '[Image]'
        case 'VOICE':
        case 'AUDIO':
          if (attachment.isVoiceNote) {
            return '[Voice note]'
          }
          return '[Audio]'
        case 'FILE':
          return `[File: ${attachment.filename || 'attachment'}]`
        case 'STICKER':
          return '[Sticker]'
        case 'LOCATION':
          return '[Location]'
        default:
          return '[Media]'
      }
    }
    
    // Notice/system message
    if (msg.type === 'NOTICE') {
      return msg.text || '[Notice]'
    }
    
    // Reaction
    if (msg.type === 'REACTION') {
      return '[Reaction]'
    }
    
    return '[Media]'
  }

  return (
    <div className={styles.messages}>
      <button className={styles.backButton} onClick={onBack}>
        Back to Conversations
      </button>
      
      {isLoading ? (
        <div className={styles.loading}>Loading messages...</div>
      ) : error ? (
        <div className={styles.errorState}>{error}</div>
      ) : (
        <>
          {/* New messages badge */}
          {hasNewMessages && (
            <button 
              className={styles.newMessagesBadge} 
              onClick={() => scrollToBottom(true)}
            >
              New messages ▼
            </button>
          )}
          
          <div className={styles.messageList} ref={messageListRef}>
            {messages.length === 0 ? (
              <p className={styles.emptyState}>No messages yet</p>
            ) : (
              messages.map(msg => {
                const content = getMessageContent(msg)
                const isImage = content.startsWith('::image:')
                
                return (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.isSender ? styles.outgoing : styles.incoming}`}
                  >
                    {!msg.isSender && (
                      <span className={styles.sender}>{msg.senderName}</span>
                    )}
                    {isImage ? (
                      <img 
                        src={content.replace('::image:', '')} 
                        alt="Shared image" 
                        className={styles.messageImage}
                      />
                    ) : (
                      <p className={styles.content}>{content}</p>
                    )}
                    <span className={styles.time}>
                      {formatTime(msg.timestamp)}
                      {msg.isSender && (
                        <span className={styles.msgStatus}>
                          {msg.reactions?.length ? ' +reactions' : ''}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <form className={styles.inputArea} onSubmit={handleSubmit}>
            <input
              name="message"
              type="text"
              placeholder="Type a message..."
              className={styles.input}
            />
            <button type="submit" className={styles.sendButton}>Send</button>
          </form>
        </>
      )}
    </div>
  )
}
