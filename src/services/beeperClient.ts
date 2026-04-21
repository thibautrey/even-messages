/**
 * Beeper Desktop API Client
 * 
 * Base URL: http://localhost:23373 (configurable)
 * Auth: Bearer token
 * 
 * API Docs: http://localhost:23373/v1/spec
 */

export interface BeeperConfig {
  baseUrl: string
  token: string
}

const DEFAULT_BASE_URL = 'http://localhost:23373'

export interface BeeperAccount {
  accountID: string
  user: {
    id: string
    username?: string
    fullName?: string
    cannotMessage?: boolean
    isSelf?: boolean
  }
}

export interface BeeperChat {
  id: string
  localChatID?: string
  accountID: string
  title: string
  type: 'single' | 'group'
  participants: {
    items: BeeperUser[]
    hasMore: boolean
    total: number
  }
  lastActivity: string
  unreadCount: number
  lastReadMessageSortKey?: string
  isArchived: boolean
  isMuted: boolean
  isPinned: boolean
}

export interface BeeperUser {
  id: string
  username?: string
  fullName?: string
  cannotMessage?: boolean
  isSelf?: boolean
}

export interface BeeperTextEntity {
  from: number
  to: number
  link?: string
  mentionedUser?: {
    id: string
  }
  children?: BeeperTextEntity[]
}

export interface BeeperMessage {
  id: string
  chatID: string
  accountID: string
  senderID: string
  senderName: string
  timestamp: string
  sortKey: string
  type: 'TEXT' | 'NOTICE' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'AUDIO' | 'FILE' | 'STICKER' | 'LOCATION' | 'REACTION'
  text?: string
  textEntities?: BeeperTextEntity[]
  isSender: boolean
  attachments?: BeeperAttachment[]
  isUnread?: boolean
  linkedMessageID?: string
  reactions?: BeeperReaction[]
}

export interface BeeperAttachment {
  id: string
  type: string
  url?: string
  mimeType?: string
  filename?: string
  size?: number
  thumbnailUrl?: string
}

export interface BeeperReaction {
  emoji: string
  users: BeeperUser[]
}

export interface SendMessagePayload {
  text: string
  replyToMessageID?: string
  attachment?: {
    id?: string
    url?: string
    type?: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeTextEntity(entity: unknown): BeeperTextEntity | null {
  if (!isRecord(entity)) return null

  const { from, to, link, mentionedUser, children } = entity
  if (typeof from !== "number" || typeof to !== "number") {
    return null
  }

  const normalized: BeeperTextEntity = { from, to }

  if (typeof link === "string" && link.trim()) {
    normalized.link = link
  }

  if (isRecord(mentionedUser) && typeof mentionedUser.id === "string") {
    normalized.mentionedUser = { id: mentionedUser.id }
  }

  if (Array.isArray(children)) {
    const normalizedChildren = children
      .map(normalizeTextEntity)
      .filter((child): child is BeeperTextEntity => child !== null)
    if (normalizedChildren.length > 0) {
      normalized.children = normalizedChildren
    }
  }

  return normalized
}

function parseStructuredTextPayload(rawText?: string): {
  text: string
  textEntities: BeeperTextEntity[]
} | null {
  if (!rawText) return null

  const trimmed = rawText.trim()
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!isRecord(parsed) || typeof parsed.text !== "string") {
      return null
    }

    const textEntities = Array.isArray(parsed.textEntities)
      ? parsed.textEntities
          .map(normalizeTextEntity)
          .filter((entity): entity is BeeperTextEntity => entity !== null)
      : []

    return {
      text: parsed.text,
      textEntities,
    }
  } catch {
    return null
  }
}

function getNormalizedMessageTextParts(msg: BeeperMessage): {
  text: string
  textEntities: BeeperTextEntity[]
} {
  const embedded = parseStructuredTextPayload(msg.text)
  const text = stripReactionActorPrefix(
    msg,
    embedded?.text ?? msg.text ?? "",
  )
  const textEntities =
    msg.textEntities && msg.textEntities.length > 0
      ? msg.textEntities
      : embedded?.textEntities ?? []

  return { text, textEntities }
}

function stripReactionActorPrefix(msg: BeeperMessage, text: string): string {
  if (msg.type !== "REACTION" || !text) {
    return text
  }

  const candidates = [msg.senderName, msg.senderID]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .sort((a, b) => b.length - a.length)

  for (const actor of candidates) {
    if (text.startsWith(`${actor} `)) {
      return text.slice(actor.length + 1)
    }
  }

  return text
}

function normalizeMessage(message: BeeperMessage): BeeperMessage {
  const embedded = parseStructuredTextPayload(message.text)
  if (!embedded) {
    return message
  }

  return {
    ...message,
    text: embedded.text,
    textEntities:
      message.textEntities && message.textEntities.length > 0
        ? message.textEntities
        : embedded.textEntities,
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    const cleaned = url.replace(/^https?:\/\//, "").replace(/^www\./, "")
    return cleaned.split("/")[0]
  }
}

export function formatMessageText(msg: BeeperMessage): string {
  const { text, textEntities } = getNormalizedMessageTextParts(msg)
  if (!text || textEntities.length === 0) {
    return text || "[media]"
  }

  type Entity =
    | { type: "link"; from: number; to: number; label: string }
    | { type: "mention"; from: number; to: number; label: string }

  const entities: Entity[] = []
  function collect(list: BeeperTextEntity[]) {
    for (const e of list) {
      if (e.from == null || e.to == null) continue

      if (e.link) {
        entities.push({
          type: "link",
          from: e.from,
          to: e.to,
          label: `[Link] ${extractDomain(e.link)}`,
        })
      } else if (e.mentionedUser) {
        const raw = text.slice(e.from, e.to)
        const label =
          raw === "{{sender}}"
            ? msg.senderName || msg.senderID || "[User]"
            : "[User]"
        entities.push({ type: "mention", from: e.from, to: e.to, label })
      }

      if (e.children && e.children.length > 0) {
        collect(e.children)
      }
    }
  }
  collect(textEntities)

  if (entities.length === 0) return text

  // Sort by from ascending, longer spans first (outer before inner)
  entities.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from
    return b.to - a.to
  })

  // Merge overlapping: keep the first (outer) one, skip nested/overlapping
  const merged: Entity[] = []
  for (const ent of entities) {
    const last = merged[merged.length - 1]
    if (last && ent.from < last.to) continue // overlapping or nested
    merged.push(ent)
  }

  // Build result string
  let result = ""
  let pos = 0
  for (const ent of merged) {
    if (ent.from > pos) {
      result += text.slice(pos, ent.from)
    }
    result += ent.label
    pos = ent.to
  }
  if (pos < text.length) {
    result += text.slice(pos)
  }

  return result
}

/**
 * Beeper Desktop API Client
 */
export class BeeperClient {
  private baseUrl: string
  private token: string

  constructor(config: BeeperConfig) {
    // Remove trailing /v1 if present to avoid double paths
    let baseUrl = config.baseUrl.replace(/\/v1\/?$/, '')
    baseUrl = baseUrl.replace(/\/$/, '')
    this.baseUrl = baseUrl || DEFAULT_BASE_URL
    this.token = config.token
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Get API info
   */
  async getInfo(): Promise<{ app?: { version: string } }> {
    const response = await fetch(`${this.baseUrl}/v1/info`, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get info: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * List connected accounts (channels)
   */
  async listAccounts(): Promise<BeeperAccount[]> {
    const response = await fetch(`${this.baseUrl}/v1/accounts`, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to list accounts: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.accounts || []
  }

  /**
   * List all chats across accounts
   */
  async listChats(options?: {
    cursor?: string
    direction?: 'after' | 'before'
    accountIDs?: string[]
  }): Promise<{ chats: BeeperChat[]; cursor?: string }> {
    const params = new URLSearchParams()
    if (options?.cursor) params.set('cursor', options.cursor)
    if (options?.direction) params.set('direction', options.direction)
    if (options?.accountIDs?.length) {
      options.accountIDs.forEach(id => params.append('accountIDs', id))
    }
    
    const url = `${this.baseUrl}/v1/chats${params.size ? `?${params}` : ''}`
    
    const response = await fetch(url, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to list chats: ${response.statusText}`)
    }
    
    const data = await response.json()
    // API returns 'items' not 'chats'
    return {
      chats: data.items || data.chats || [],
      cursor: data.oldestCursor || data.cursor,
    }
  }

  /**
   * Get a specific chat by ID
   */
  async getChat(chatID: string): Promise<BeeperChat> {
    const response = await fetch(`${this.baseUrl}/v1/chats/${encodeURIComponent(chatID)}`, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get chat: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * List messages in a chat
   */
  async listMessages(chatID: string, options?: {
    cursor?: string
    direction?: 'after' | 'before'
  }): Promise<{ messages: BeeperMessage[]; cursor?: string }> {
    const params = new URLSearchParams()
    if (options?.cursor) params.set('cursor', options.cursor)
    if (options?.direction) params.set('direction', options.direction)
    
    const url = `${this.baseUrl}/v1/chats/${encodeURIComponent(chatID)}/messages${params.size ? `?${params}` : ''}`
    
    const response = await fetch(url, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to list messages: ${response.statusText}`)
    }
    
    const data = await response.json()
    // API returns 'items' not 'messages'
    return {
      messages: (data.items || data.messages || []).map(normalizeMessage),
      cursor: data.oldestCursor || data.cursor,
    }
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(chatID: string, payload: SendMessagePayload): Promise<{ pendingMessageID: string }> {
    const response = await fetch(`${this.baseUrl}/v1/chats/${encodeURIComponent(chatID)}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * Search chats
   */
  async searchChats(query: string): Promise<BeeperChat[]> {
    const response = await fetch(`${this.baseUrl}/v1/chats/search?q=${encodeURIComponent(query)}`, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to search chats: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.chats || []
  }

  /**
   * Search messages
   */
  async searchMessages(query: string): Promise<{ messages: BeeperMessage[] }> {
    const response = await fetch(`${this.baseUrl}/v1/messages/search?q=${encodeURIComponent(query)}`, {
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to search messages: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      ...data,
      messages: Array.isArray(data.messages)
        ? data.messages.map(normalizeMessage)
        : [],
    }
  }

  /**
   * Archive a chat
   */
  async archiveChat(chatID: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/chats/${encodeURIComponent(chatID)}/archive`, {
      method: 'POST',
      headers: this.headers,
    })
    
    if (!response.ok) {
      throw new Error(`Failed to archive chat: ${response.statusText}`)
    }
  }

  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocket(onMessage: (event: BeeperWebSocketEvent) => void): WebSocket {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/v1/ws'
    const ws = new WebSocket(`${wsUrl}?access_token=${this.token}`)
    
    ws.onopen = () => {
      console.log('[BeeperClient] WebSocket connected')
      // Subscribe to all chats
      ws.send(JSON.stringify({
        type: 'subscribe',
        chatIDs: ['*'],
      }))
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data as BeeperWebSocketEvent)
      } catch (error) {
        console.error('[BeeperClient] Failed to parse WebSocket message:', error)
      }
    }
    
    ws.onerror = (error) => {
      console.error('[BeeperClient] WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('[BeeperClient] WebSocket disconnected')
    }
    
    return ws
  }
}

export interface BeeperWebSocketEvent {
  type: 'chat.upserted' | 'chat.deleted' | 'message.upserted' | 'message.deleted'
  data: BeeperChat | BeeperMessage | { chatID: string; messageID: string }
}

export default BeeperClient
