# Even Messages - Implementation Plan

## Overview
An Even Glasses messaging application that integrates with the Beeper Desktop API to display messages on Even Glasses. The app runs inside the Even App WebView and uses the Even Hub SDK to render content on the glasses display.

## Tech Stack
- **Framework**: TypeScript + Vite + React
- **Even SDK**: `@evenrealities/even_hub_sdk` - Low-level bridge for Even App communication
- **Messaging API**: Beeper Desktop API (http://localhost:23373/v1/spec)
- **Display**: Even Glasses (WebView inside Even App)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Even App                              │
│  ┌─────────────────────────────────────────────────┐     │
│  │              Even Messages (WebView)             │     │
│  │                                                   │     │
│  │  ┌─────────────────────────────────────────┐    │     │
│  │  │  EvenMessagesApp (GlassesUI)            │    │     │
│  │  │  - createStartUpPageContainer()        │    │     │
│  │  │  - rebuildPageContainer()              │    │     │
│  │  └─────────────────────────────────────────┘    │     │
│  │                       │                         │     │
│  │  ┌─────────────────────────────────────────┐    │     │
│  │  │  BeeperClient (REST + WebSocket)        │    │     │
│  │  │  - GET /v1/accounts                    │    │     │
│  │  │  - GET /v1/chats                       │    │     │
│  │  │  - GET /v1/chats/{id}/messages         │    │     │
│  │  │  - POST /v1/chats/{id}/messages        │    │     │
│  │  └─────────────────────────────────────────┘    │     │
│  └─────────────────────────────────────────────────┘     │
│                         │                               │
│                         ▼                               │
│              ┌─────────────────────┐                   │
│              │   Even Glasses       │                   │
│              │   (640x480 canvas)   │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## Even Hub SDK Constraints
- **Coordinate System**: Origin (0,0) at top-left, X increases right (0-576), Y increases down (0-288)
- **Max Containers**: 4 per page
- **Event Capture**: Only ONE container can have `isEventCapture=1`
- **Container Types**: List, Text, Image
- **Container Name**: Max 16 characters
- **Text Content**: Max 1000 characters
- **List Items**: Max 20 items, 64 chars each

## Beeper Desktop API

### Base URL
```
http://localhost:23373
```

### Authentication
```
Authorization: Bearer {token}
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/info` | Get API info |
| GET | `/v1/accounts` | List connected accounts (channels) |
| GET | `/v1/chats` | List all chats across accounts |
| GET | `/v1/chats/{chatID}` | Get a specific chat |
| GET | `/v1/chats/{chatID}/messages` | List messages in a chat |
| POST | `/v1/chats/{chatID}/messages` | Send a message |
| WS | `/v1/ws?access_token={token}` | WebSocket for real-time updates |

### Data Models

**Account:**
```typescript
{
  accountID: string
  user: {
    id: string
    username?: string
    fullName?: string
  }
}
```

**Chat:**
```typescript
{
  id: string
  accountID: string
  title: string
  type: 'single' | 'group'
  participants: { items: User[]; hasMore: boolean; total: number }
  lastActivity: string (ISO date)
  unreadCount: number
  isArchived: boolean
  isMuted: boolean
  isPinned: boolean
}
```

**Message:**
```typescript
{
  id: string
  chatID: string
  senderID: string
  senderName: string
  timestamp: string (ISO date)
  sortKey: string
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | ...
  text?: string
  isSender: boolean
  attachments?: Attachment[]
  reactions?: Reaction[]
}
```

### WebSocket Events
```typescript
{ type: 'chat.upserted', data: Chat }
{ type: 'chat.deleted', data: { chatID: string } }
{ type: 'message.upserted', data: Message }
{ type: 'message.deleted', data: { chatID: string; messageID: string } }
```

## UI Views

### 1. Accounts View (Entry)
```
┌──────────────────────────────────┐
│ 📱 Even Messages                  │  ← Text container
├──────────────────────────────────┤
│ 📱 WhatsApp                      │
│ 📱 Signal                        │  ← List container
│ 📱 Telegram                      │    (isEventCapture=1)
└──────────────────────────────────┘
```

### 2. Chats View
```
┌──────────────────────────────────┐
│ ← Back to Accounts               │  ← Text (tap to go back)
├──────────────────────────────────┤
│ 👤 John Doe (2)                  │
│ 👤 Alice Smith                   │  ← List container
│ 👥 Family Group (5)              │    (isEventCapture=1)
└──────────────────────────────────┘
```

### 3. Messages View
```
┌──────────────────────────────────┐
│ ← Back to Chats                  │  ← Text (tap to go back)
├──────────────────────────────────┤
│ [14:00] John: Hey, are you...   │
│ [14:05] ✓ You: Yes! I will...   │  ← List container
│ [14:10] John: Great! See you... │    (isEventCapture=1)
└──────────────────────────────────┘
```

### 4. Quick Reply View
```
┌──────────────────────────────────┐
│ Quick Reply                      │  ← Text container
├──────────────────────────────────┤
│ 👍 Got it                        │
│ 👍👍                              │  ← List container
│ Thanks!                          │    (isEventCapture=1)
└──────────────────────────────────┘
```

## Navigation Flow

```
Accounts → (select) → Chats → (select) → Messages → (select) → Quick Reply
    ↑                     │                       │
    └─────────────────────┴───────────────────────┘
                    (tap back text)
```

## Project Structure
```
even-messages/
├── src/
│   ├── glasses/
│   │   ├── GlassesUI.ts      # Main glasses UI renderer
│   │   └── index.ts
│   ├── components/
│   │   ├── DevModeUI.tsx     # Web dev mode for testing
│   │   └── DevModeUI.module.css
│   ├── services/
│   │   ├── beeperClient.ts   # Beeper API client
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx               # Root React component
│   └── main.tsx              # Entry point
├── index.html
├── package.json
└── IMPLEMENTATION_PLAN.md
```

## Implementation Phases

### Phase 1: Core Setup ✅
- [x] Project structure
- [x] Even Hub SDK integration
- [x] GlassesUI class with proper SDK usage
- [x] Navigation flow (accounts → chats → messages → quick reply)
- [x] Event handling

### Phase 2: Beeper Integration ✅
- [x] BeeperClient service with correct API endpoints
  - [x] GET /v1/accounts
  - [x] GET /v1/chats
  - [x] GET /v1/chats/{id}/messages
  - [x] POST /v1/chats/{id}/messages
  - [x] WebSocket for real-time updates
- [x] OAuth2 PKCE authentication flow
  - [x] Browser-based authorization
  - [x] Token exchange
  - [x] Token storage in localStorage
- [x] Connect to Beeper on startup
- [x] Handle new message notifications
- [x] Real-time message display

### Phase 3: Device Status
- [ ] Battery level display
- [ ] Connection status handling
- [ ] Wearing detection

### Phase 4: Polish
- [ ] Loading states
- [ ] Error handling
- [ ] Offline mode
- [ ] Performance optimization

## TODO

1. **Test with Beeper Desktop**
   - Run Beeper Desktop
   - Get API token from settings
   - Test all endpoints

2. **Test on Actual Hardware**
   - Run inside Even App WebView
   - Test navigation gestures
   - Verify display rendering

3. **Security**
   - Secure token storage
   - Token refresh flow

## References
- [Even Hub SDK npm](https://www.npmjs.com/package/@evenrealities/even_hub_sdk)
- [Beeper Desktop API Spec](http://localhost:23373/v1/spec)
