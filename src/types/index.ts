// Core types for Even Messages app

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: Attachment[];
  reactions?: Reaction[];
  isFromMe: boolean;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  mimeType: string;
  filename?: string;
  size?: number;
  thumbnailUrl?: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface Conversation {
  id: string;
  channelId: string;
  name: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  isMuted: boolean;
  isPinned: boolean;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  icon?: string;
  color?: string;
  isConnected: boolean;
  accountId?: string;
  conversationCount: number;
  unreadCount: number;
}

export type ChannelType = 
  | 'whatsapp'
  | 'signal'
  | 'telegram'
  | 'slack'
  | 'discord'
  | 'matrix'
  | 'irc'
  | 'email'
  | 'sms'
  | 'imessage'
  | 'other';

export interface BeeperMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
  editedAt?: number;
  reactions: Array<{
    emoji: string;
    users: Array<{ id: string; name: string }>;
  }>;
  attachments: Array<{
    id: string;
    type: 'image' | 'video' | 'audio' | 'file';
    url: string;
    mimeType: string;
    filename?: string;
    size?: number;
    thumbnailUrl?: string;
  }>;
  replyTo?: string;
  isFromMe: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface BeeperConversation {
  id: string;
  name: string;
  avatar?: string;
  participants: Array<{ id: string; name: string; avatar?: string }>;
  isGroup: boolean;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  lastMessage?: BeeperMessage;
  updatedAt: number;
}

export interface BeeperChannel {
  id: string;
  type: string;
  name: string;
  icon?: string;
  color?: string;
  isConnected: boolean;
  accountId?: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  attachments?: File[];
  replyTo?: string;
}

export interface AppState {
  // Channels
  channels: Channel[];
  selectedChannelId: string | null;
  
  // Conversations
  conversations: Conversation[];
  selectedConversationId: string | null;
  
  // Messages
  messages: Record<string, Message[]>;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  selectChannel: (channelId: string) => void;
  selectConversation: (conversationId: string) => void;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  loadConversations: (channelId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
}
