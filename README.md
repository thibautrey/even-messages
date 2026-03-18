# Even Messages

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Even%20G2%20Glasses-6366f1?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/Framework-React-61dafb?style=for-the-badge" alt="Framework">
  <img src="https://img.shields.io/badge/Backend-Beeper%20API-e1306c?style=for-the-badge" alt="Backend">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  Read and reply to messages from WhatsApp, Signal, Telegram, and more — directly from your Even G2 smart glasses.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/evenrealities/.github/main/even-g2.png" alt="Even G2 Glasses" width="400">
</p>

---

## ✨ Features

- **📱 Multi-Platform Support** — Connect WhatsApp, Signal, Telegram, and any Beeper-supported messaging service
- **👓 Glasses-First UX** — Optimized text-only interface for Even G2's 576×288 display
- **⚡ Quick Replies** — Send preset responses with a single tap
- **🔔 Unread Badges** — See at a glance which conversations have new messages
- **🔄 Real-time Sync** — Messages update automatically via Beeper Desktop API
- **💻 Dev Mode** — Full web interface for development and testing

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- [Beeper Desktop](https://www.beeper.com/) running locally
- Even G2 smart glasses (optional, works in browser for dev)

### Installation

```bash
# Clone the repository
git clone git@github.com:thibautrey/even-messages.git
cd even-messages

# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration

1. Open the app at `http://localhost:5173`
2. Click **Settings** in the top-right corner
3. Enter your Beeper Desktop API credentials:
   - **Base URL**: `http://localhost:23373`
   - **Token**: Your Beeper API token (found in Beeper settings)

---

## 📖 Usage

### Glasses Controls

| Gesture | Action |
|---------|--------|
| Scroll Up/Down | Navigate list |
| Tap | Select / Confirm |
| Double-tap | Go back |

### Screen Flow

```
┌─────────────┐
│  ACCOUNTS   │  Select messaging platform
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    CHATS    │  Browse conversations
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  MESSAGES   │  Read thread
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ QUICK REPLY │  Send preset response
└─────────────┘
```

### Display Conventions

```
Even Msg        14:30    ← Header with time
────────────────────────
> [D] John Doe       [!2]   ← Selected item
  [G] Family Group   [!5]   ← Group chat with unread
  [D] Alice Smith           
────────────────────────
* Reply                  ← Action available
```

**Indicators:**
- `>` — Currently selected item
- `[D]` — Direct message
- `[G]` — Group chat
- `[!n]` — n unread messages
- `*` — Action available

---

## 🏗️ Architecture

```
even-messages/
├── src/
│   ├── glasses/
│   │   └── GlassesUI.tsx    # Even G2 display logic
│   ├── components/
│   │   └── DevModeUI.tsx    # Web interface for dev
│   └── services/
│       └── beeperClient.ts   # Beeper API integration
├── dist/                     # Production build
└── package.json
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| [even-toolkit](https://www.npmjs.com/package/even-toolkit) | Even G2 SDK for React |
| [Vite](https://vitejs.dev/) | Build tooling |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [TailwindCSS](https://tailwindcss.com/) | Styling |

---

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start dev server with hot reload
npm run build    # Production build
npm run preview  # Preview production build
```

### Testing on Glasses

1. Build the project: `npm run build`
2. Serve the `dist/` folder (or deploy to Even App)
3. Connect your Even G2 glasses
4. Navigate using tap and scroll gestures

### Browser Simulation

When running in a browser (outside Even App), keyboard controls simulate glasses:

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate |
| Enter | Select |
| Escape | Back |

---

## 📡 API Reference

### Beeper Desktop API

The app connects to Beeper Desktop's local API:

```
Base URL: http://localhost:23373
Headers:  Authorization: Bearer <token>
```

**Endpoints Used:**
- `GET /v1/accounts` — List connected accounts
- `GET /v1/chats` — List conversations
- `GET /v1/messages/:chatId` — Fetch messages
- `POST /v1/messages/:chatId` — Send message

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Even Realities](https://evenrealities.com/) for the G2 smart glasses platform
- [Beeper](https://www.beeper.com/) for unified messaging API
- [even-toolkit](https://www.npmjs.com/package/even-toolkit) contributors

---

<p align="center">
  Made with ❤️ for Even G2 glasses
</p>
