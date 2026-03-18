/**
 * Even Messages - Glasses UI Component
 * 
 * Uses even-toolkit useGlasses hook for proper React integration.
 * Handles: Up/Down (navigation), Click (select), Double-click (back).
 */

import { useState, useCallback, useEffect } from 'react'
import { useGlasses } from 'even-toolkit/useGlasses'
import { GlassAction, GlassNavState, DisplayLine } from 'even-toolkit/types'
import { line, separator } from 'even-toolkit/types'
import { buildHeaderLine } from 'even-toolkit/text-utils'
import { buildActionBar, buildStaticActionBar } from 'even-toolkit/action-bar'
import { useFlashPhase } from 'even-toolkit/useFlashPhase'
import { activateKeepAlive, deactivateKeepAlive } from 'even-toolkit/keep-alive'
import { BeeperClient, BeeperAccount, BeeperChat, BeeperMessage } from '../services/beeperClient'

// ═══════════════════════════════════════════════════════════════
// DISPLAY CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_LINES = 5      // Max visible lines on glasses

// ASCII indicators (safe for glasses font)
const ICONS = {
  SELECTED: '>',
  BACK: '<',
  ACTION: '*',
  DIRECT: '[D]',
  GROUP: '[G]',
  UNREAD: '[!',
}

// Quick reply presets
const QUICK_REPLIES = [
  'Got it', 'OK', 'Thanks!', 'See you',
  'On way', 'Call me', 'Busy', 'Later'
]

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Screen = 'accounts' | 'chats' | 'messages' | 'quickReply'

interface AppState {
  accounts: BeeperAccount[]
  chats: BeeperChat[]
  messages: BeeperMessage[]
  currentScreen: Screen
  selectedAccount: string | null
  selectedChat: string | null
  selectedMessageIndex: number
  highlightedIndex: number
  isLoading: boolean
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 2) + '..'
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  }).slice(0, 5)
}

function getServiceIcon(accountId: string): string {
  const icons: Record<string, string> = {
    whatsapp: '[W]',
    signal: '[S]',
    telegram: '[T]',
    matrix: '[M]',
    beeper: '[B]',
  }
  return icons[accountId] || '[*]'
}

function getMaxIndex(state: AppState): number {
  switch (state.currentScreen) {
    case 'accounts': {
      // All Chats + unique accounts
      const uniqueAccounts = new Set(state.accounts.map(a => a.accountID))
      return Math.max(0, uniqueAccounts.size)
    }
    case 'chats':
      return Math.max(0, state.chats.length)
    case 'messages':
      return Math.max(0, Math.min(state.messages.length - 1, MAX_LINES - 1))
    case 'quickReply':
      return Math.max(0, QUICK_REPLIES.length) // +1 for Cancel
  }
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildAccountsDisplay(state: AppState, highlightedIdx: number, _flashPhase: boolean): DisplayLine[] {
  const lines: DisplayLine[] = []
  
  // Header with time
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  lines.push(line(buildHeaderLine('Even Msg', time), 'inverted'))
  
  // "All Chats" option
  const allSelected = highlightedIdx === 0
  lines.push(line(
    `${allSelected ? ICONS.SELECTED : ' '} ${ICONS.ACTION} All Chats`,
    allSelected ? 'inverted' : 'normal'
  ))
  
  // Unique accounts
  const seen = new Set<string>()
  let itemIdx = 1 // Start at 1 since 0 is "All Chats"
  state.accounts.forEach(a => {
    if (!seen.has(a.accountID)) {
      seen.add(a.accountID)
      const isSelected = highlightedIdx === itemIdx
      const icon = getServiceIcon(a.accountID)
      const name = a.user.fullName || a.user.username || 'Unknown'
      lines.push(line(
        `${isSelected ? ICONS.SELECTED : ' '} ${icon} ${truncate(name, 22)}`,
        isSelected ? 'inverted' : 'normal'
      ))
      itemIdx++
    }
  })
  
  lines.push(separator())
  lines.push(line(buildStaticActionBar(['Select'], highlightedIdx >= itemIdx ? 0 : -1), 'meta'))
  
  return lines
}

function buildChatsDisplay(state: AppState, highlightedIdx: number, _flashPhase: boolean): DisplayLine[] {
  const lines: DisplayLine[] = []
  
  // Header with back and count
  const accountName = state.selectedAccount
    ? state.accounts.find(a => a.accountID === state.selectedAccount)?.user.fullName || 'Chats'
    : 'All Chats'
  lines.push(line(buildHeaderLine(`${ICONS.BACK} ${truncate(accountName, 10)}`, `${state.chats.length}`), 'inverted'))
  
  if (state.chats.length === 0) {
    lines.push(line('No chats found', 'normal'))
  } else {
    // Show visible chats with wrap-around
    const start = Math.max(0, highlightedIdx - 1)
    const visible = state.chats.slice(start, start + MAX_LINES - 1)
    
    visible.forEach(chat => {
      const isSelected = state.chats.indexOf(chat) === highlightedIdx
      const typeIcon = chat.type === 'group' ? ICONS.GROUP : ICONS.DIRECT
      const name = truncate(chat.title, 18)
      
      let suffix = ''
      if (chat.unreadCount > 0) {
        suffix = ` ${ICONS.UNREAD}${chat.unreadCount}]`
      }
      
      lines.push(line(
        `${isSelected ? ICONS.SELECTED : ' '} ${typeIcon} ${name}${suffix}`,
        isSelected ? 'inverted' : 'normal'
      ))
    })
  }
  
  lines.push(separator())
  // Highlight back if on last item (Quick Reply option)
  const backSelected = highlightedIdx >= state.chats.length
  lines.push(line(buildStaticActionBar(['Back'], backSelected ? 0 : -1), 'meta'))
  
  return lines
}

function buildMessagesDisplay(state: AppState, _highlightedIdx: number, flashPhase: boolean): DisplayLine[] {
  const lines: DisplayLine[] = []
  
  // Header with back
  const chat = state.chats.find(c => c.id === state.selectedChat)
  const chatName = chat ? truncate(chat.title, 14) : 'Messages'
  lines.push(line(buildHeaderLine(`${ICONS.BACK} ${chatName}`, ''), 'inverted'))
  
  // Messages (show last N)
  const visibleMessages = state.messages.slice(-(MAX_LINES - 2))
  
  if (visibleMessages.length === 0) {
    lines.push(line('No messages yet', 'normal'))
  } else {
    visibleMessages.forEach(msg => {
      const time = formatTime(msg.timestamp)
      const sender = msg.isSender ? '>' : truncate(msg.senderName || '?', 6)
      const content = truncate(msg.text || '[media]', 18)
      
      lines.push(line(
        `[${time}] ${sender}: ${content}`,
        'normal'
      ))
    })
  }
  
  lines.push(separator())
  
  // Reply action
  const hasIncoming = visibleMessages.some(m => !m.isSender)
  if (hasIncoming) {
    const actionBar = buildActionBar(['Reply'], 0, 'Reply', flashPhase)
    lines.push(line(actionBar, 'meta'))
  } else {
    lines.push(line(buildStaticActionBar(['Back'], 0), 'meta'))
  }
  
  return lines
}

function buildQuickReplyDisplay(state: AppState, highlightedIdx: number, _flashPhase: boolean): DisplayLine[] {
  const lines: DisplayLine[] = []
  
  // Header
  const msg = state.messages[state.selectedMessageIndex]
  const sender = msg ? truncate(msg.senderName || 'Unknown', 14) : 'Unknown'
  lines.push(line(buildHeaderLine(`Reply to ${sender}`, ''), 'inverted'))
  
  // Quick replies in 2 columns (2 per row)
  const start = Math.floor(highlightedIdx / 2) * 2
  const visibleReplies = QUICK_REPLIES.slice(start, start + 4)
  
  for (let i = 0; i < visibleReplies.length; i += 2) {
    const reply1 = visibleReplies[i] || ''
    const reply2 = visibleReplies[i + 1] || ''
    const idx1 = start + i
    const idx2 = start + i + 1
    const isSel1 = idx1 === highlightedIdx
    const isSel2 = idx2 === highlightedIdx
    
    lines.push(line(
      `${isSel1 ? ICONS.SELECTED : ' '}"${truncate(reply1, 10)}"  ${isSel2 ? ICONS.SELECTED : ' '}"${truncate(reply2, 10)}"`,
      'normal'
    ))
  }
  
  lines.push(separator())
  
  // Cancel or confirm based on highlighted
  const isCancelSelected = highlightedIdx >= QUICK_REPLIES.length
  lines.push(line(buildStaticActionBar(['Cancel'], isCancelSelected ? 0 : -1), 'meta'))
  
  return lines
}

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════

function getDemoChats(): BeeperChat[] {
  return [
    { id: '1', accountID: 'whatsapp', title: 'John Doe', type: 'single', participants: { items: [], hasMore: false, total: 2 }, lastActivity: new Date().toISOString(), unreadCount: 2, isArchived: false, isMuted: false, isPinned: false },
    { id: '2', accountID: 'whatsapp', title: 'Alice Smith', type: 'single', participants: { items: [], hasMore: false, total: 2 }, lastActivity: new Date().toISOString(), unreadCount: 0, isArchived: false, isMuted: false, isPinned: false },
    { id: '3', accountID: 'whatsapp', title: 'Family Group', type: 'group', participants: { items: [], hasMore: false, total: 8 }, lastActivity: new Date().toISOString(), unreadCount: 5, isArchived: false, isMuted: false, isPinned: true },
    { id: '4', accountID: 'signal', title: 'Work Team', type: 'group', participants: { items: [], hasMore: false, total: 12 }, lastActivity: new Date().toISOString(), unreadCount: 1, isArchived: false, isMuted: false, isPinned: false },
    { id: '5', accountID: 'telegram', title: 'Bob Wilson', type: 'single', participants: { items: [], hasMore: false, total: 2 }, lastActivity: new Date().toISOString(), unreadCount: 0, isArchived: false, isMuted: false, isPinned: false },
  ]
}

function getDemoMessages(): BeeperMessage[] {
  return [
    { id: '1', chatID: '1', accountID: 'demo', senderID: 'john', senderName: 'John Doe', timestamp: new Date(Date.now() - 3600000).toISOString(), sortKey: '1', type: 'TEXT', text: 'Hey, are you coming tonight?', isSender: false, isUnread: false },
    { id: '2', chatID: '1', accountID: 'demo', senderID: 'me', senderName: 'You', timestamp: new Date(Date.now() - 3000000).toISOString(), sortKey: '2', type: 'TEXT', text: 'Yes! Around 8pm', isSender: true, isUnread: false },
    { id: '3', chatID: '1', accountID: 'demo', senderID: 'john', senderName: 'John Doe', timestamp: new Date(Date.now() - 1800000).toISOString(), sortKey: '3', type: 'TEXT', text: 'Great! See you then', isSender: false, isUnread: false },
    { id: '4', chatID: '1', accountID: 'demo', senderID: 'me', senderName: 'You', timestamp: new Date(Date.now() - 600000).toISOString(), sortKey: '4', type: 'TEXT', text: 'Thanks for invite!', isSender: true, isUnread: false },
  ]
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function GlassesUI({ beeperConfig }: { beeperConfig: { baseUrl: string; token: string } | null }) {
  const [state, setState] = useState<AppState>({
    accounts: [],
    chats: [],
    messages: [],
    currentScreen: 'accounts',
    selectedAccount: null,
    selectedChat: null,
    selectedMessageIndex: 0,
    highlightedIndex: 0,
    isLoading: true,
  })
  
  const beeper = beeperConfig ? new BeeperClient(beeperConfig) : null
  
  // Flash phase for blinking action indicators
  const flashPhase = useFlashPhase(true)
  
  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        let accounts: BeeperAccount[] = []
        if (beeper) {
          accounts = await beeper.listAccounts()
        }
        
        setState(s => ({
          ...s,
          accounts,
          chats: accounts.length === 0 ? getDemoChats() : [],
          isLoading: false,
        }))
      } catch (e) {
        console.warn('[GlassesUI] Using demo data')
        setState(s => ({
          ...s,
          chats: getDemoChats(),
          isLoading: false,
        }))
      }
    }
    load()
    
    // Keep alive
    activateKeepAlive('even-messages')
    return () => deactivateKeepAlive()
  }, [])
  
  // Handle selection
  const handleSelect = useCallback((s: AppState): Partial<AppState> => {
    const updates: Partial<AppState> = {}
    
    switch (s.currentScreen) {
      case 'accounts': {
        // "All Chats" is index 0
        if (s.highlightedIndex === 0) {
          updates.selectedAccount = null
        } else {
          // Find the account at this index
          const seen = new Set<string>()
          let itemIdx = 1
          for (const account of s.accounts) {
            if (!seen.has(account.accountID)) {
              seen.add(account.accountID)
              if (itemIdx === s.highlightedIndex) {
                updates.selectedAccount = account.accountID
                break
              }
              itemIdx++
            }
          }
        }
        updates.currentScreen = 'chats'
        updates.highlightedIndex = 0
        updates.isLoading = true
        
        // Load chats
        loadChats(updates.selectedAccount ?? null)
        break
      }
      
      case 'chats': {
        if (s.highlightedIndex < s.chats.length) {
          const chat = s.chats[s.highlightedIndex]
          updates.currentScreen = 'messages'
          updates.selectedChat = chat.id
          updates.isLoading = true
          updates.selectedMessageIndex = 0
          
          loadMessages(chat.id)
        } else {
          // Quick Reply - go back to messages (need at least one message)
          updates.currentScreen = 'messages'
          updates.highlightedIndex = 0
        }
        break
      }
      
      case 'messages': {
        // Just show reply screen
        const firstIncoming = s.messages.find(m => !m.isSender)
        if (firstIncoming) {
          updates.currentScreen = 'quickReply'
          updates.selectedMessageIndex = s.messages.indexOf(firstIncoming)
          updates.highlightedIndex = 0
        }
        break
      }
      
      case 'quickReply': {
        if (s.highlightedIndex < QUICK_REPLIES.length) {
          const reply = QUICK_REPLIES[s.highlightedIndex]
          sendMessage(reply)
          updates.currentScreen = 'messages'
          updates.highlightedIndex = 0
        } else {
          // Cancel - go back
          updates.currentScreen = 'messages'
        }
        break
      }
    }
    
    return updates
  }, [beeper])
  
  // Handle back
  const handleBack = useCallback((s: AppState): Partial<AppState> => {
    const updates: Partial<AppState> = { highlightedIndex: 0 }
    
    switch (s.currentScreen) {
      case 'accounts':
        // Can't go back
        break
      case 'chats':
        updates.currentScreen = 'accounts'
        updates.selectedAccount = null
        break
      case 'messages':
        updates.currentScreen = 'chats'
        updates.selectedChat = null
        break
      case 'quickReply':
        updates.currentScreen = 'messages'
        break
    }
    
    return updates
  }, [])
  
  // Load chats
  function loadChats(accountId: string | null) {
    async function doLoad() {
      try {
        let chats: BeeperChat[] = []
        if (beeper) {
          const result = await beeper.listChats(accountId ? { accountIDs: [accountId] } : undefined)
          chats = result.chats
        }
        setState(s => ({ ...s, chats: chats.length > 0 ? chats : getDemoChats(), isLoading: false }))
      } catch {
        setState(s => ({ ...s, chats: getDemoChats(), isLoading: false }))
      }
    }
    doLoad()
  }
  
  // Load messages
  function loadMessages(chatId: string) {
    async function doLoad() {
      try {
        let messages: BeeperMessage[] = []
        if (beeper) {
          const result = await beeper.listMessages(chatId)
          messages = result.messages.reverse()
        }
        setState(s => ({ 
          ...s, 
          messages: messages.length > 0 ? messages : getDemoMessages(), 
          isLoading: false,
          highlightedIndex: 0,
        }))
      } catch {
        setState(s => ({ ...s, messages: getDemoMessages(), isLoading: false, highlightedIndex: 0 }))
      }
    }
    doLoad()
  }
  
  // Send message
  function sendMessage(text: string) {
    async function doSend() {
      if (beeper && state.selectedChat) {
        try {
          await beeper.sendMessage(state.selectedChat, { text })
          const chatId = state.selectedChat
          if (chatId) loadMessages(chatId)
        } catch (e) {
          console.error('[GlassesUI] Send failed:', e)
        }
      } else {
        console.log('[GlassesUI] Would send:', text)
      }
    }
    doSend()
  }
  
  // Convert state to display data
  const toDisplayData = useCallback((snapshot: AppState, nav: GlassNavState) => {
    let lines: DisplayLine[]
    
    switch (snapshot.currentScreen) {
      case 'accounts':
        lines = buildAccountsDisplay(snapshot, nav.highlightedIndex, flashPhase)
        break
      case 'chats':
        lines = buildChatsDisplay(snapshot, nav.highlightedIndex, flashPhase)
        break
      case 'messages':
        lines = buildMessagesDisplay(snapshot, nav.highlightedIndex, flashPhase)
        break
      case 'quickReply':
        lines = buildQuickReplyDisplay(snapshot, nav.highlightedIndex, flashPhase)
        break
      default:
        lines = [line('Even Messages', 'inverted')]
    }
    
    return { lines }
  }, [flashPhase])
  
  // Derive screen from path
  const deriveScreen = useCallback((_path: string) => {
    return state.currentScreen
  }, [state.currentScreen])
  
  // Handle glass actions
  const onGlassAction = useCallback((action: GlassAction, nav: GlassNavState, snapshot: AppState): GlassNavState => {
    const newHighlightedIndex = nav.highlightedIndex
    
    switch (action.type) {
      case 'HIGHLIGHT_MOVE': {
        const maxIdx = getMaxIndex(snapshot)
        const newIdx = Math.max(0, Math.min(maxIdx, newHighlightedIndex + (action.direction === 'down' ? 1 : -1)))
        return { ...nav, highlightedIndex: newIdx }
      }
      
      case 'SELECT_HIGHLIGHTED': {
        setState(s => {
          const updates = handleSelect(s)
          return { ...s, ...updates }
        })
        return nav
      }
      
      case 'GO_BACK': {
        setState(s => {
          const updates = handleBack(s)
          return { ...s, ...updates }
        })
        return nav
      }
    }
    
    return nav
  }, [handleSelect, handleBack])
  
  // Connect to glasses
  useGlasses({
    getSnapshot: () => state,
    toDisplayData,
    onGlassAction,
    deriveScreen,
    appName: 'even-messages',
  })
  
  // This is a headless component - renders nothing in DOM
  return null
}

export default GlassesUI
