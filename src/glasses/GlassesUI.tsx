/**
 * Even Messages - Glasses UI Component
 *
 * Optimized for Even G2 display: 576x288 pixels
 * Uses full width for maximum readability.
 */

import {
  BeeperAccount,
  BeeperChat,
  BeeperClient,
  BeeperMessage,
} from "../services/beeperClient";
import { DisplayLine, GlassAction, GlassNavState } from "even-toolkit/types";
import {
  activateKeepAlive,
  deactivateKeepAlive,
} from "even-toolkit/keep-alive";
import { buildActionBar, buildStaticActionBar } from "even-toolkit/action-bar";
import { useCallback, useEffect, useState } from "react";

import { buildHeaderLine } from "even-toolkit/text-utils";
import { line } from "even-toolkit/types";
import { useFlashPhase } from "even-toolkit/useFlashPhase";
import { useGlasses } from "even-toolkit/useGlasses";

// ═══════════════════════════════════════════════════════════════
// DISPLAY CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Even G2: 576px wide, ~288px tall
// Font: 22px Courier New monospace (~12px per char)
// Visible width: ~48 chars, but leaving padding, use 40 chars
const MAX_VISIBLE_ITEMS = 8; // Max items visible on screen
const DISPLAY_WIDTH = 70; // Max characters per line
const SEPARATOR_LINE = "----------------------------------------"; // 40 dashes

// ASCII indicators (safe for glasses font)
const ICONS = {
  SELECTED: ">",
  BACK: "<",
  DIRECT: "[Direct]",
  GROUP: "[Group]",
  UNREAD: "[Unread]",
};

// Quick reply presets (2 columns x 4 rows = 8 replies)
const QUICK_REPLIES = [
  "Got it",
  "OK",
  "Thanks!",
  "See you",
  "On way",
  "Call me",
  "Busy",
  "Later",
];

// Helper: create a separator line (using meta style so text renders)
function sep(): DisplayLine {
  return line(SEPARATOR_LINE, "meta");
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Screen = "accounts" | "chats" | "messages" | "quickReply";

interface AppState {
  accounts: BeeperAccount[];
  chats: BeeperChat[];
  messages: BeeperMessage[];
  currentScreen: Screen;
  selectedAccount: string | null;
  selectedChat: string | null;
  selectedMessageIndex: number;
  highlightedIndex: number;
  isLoading: boolean;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Glasses display is ~40 chars wide at default font

function padRight(text: string, len: number): string {
  while (text.length < len) text += " ";
  return text.slice(0, len);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 2) + "..";
}

// Truncate name: show first word + first letter of second word (if any)
function truncateName(text: string, max: number): string {
  if (text.length <= max) return text;

  const words = text.split(" ");
  if (words.length === 1) {
    return words[0].slice(0, max);
  }

  // First word + first letter of second word
  const first = words[0];
  const second = words[1] ? words[1][0] : "";
  const result = `${first} ${second}`.trim();

  return result.slice(0, max);
}

// Word-wrap text to fit within maxWidth, breaking at word boundaries
function wordWrap(text: string, maxWidth: number): string[] {
  if (text.length <= maxWidth) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    // If single word is longer than maxWidth, break it
    if (word.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = "";
      }
      // Break long word into chunks
      for (let i = 0; i < word.length; i += maxWidth - 1) {
        lines.push(word.slice(i, i + maxWidth - 1) + "-");
      }
      continue;
    }

    // Check if adding this word would exceed maxWidth
    const testLine = currentLine ? currentLine + " " + word : word;
    if (testLine.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine.trim());
      }
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.length > 0 ? lines : [text];
}

function formatTime(timestamp: string): string {
  return new Date(timestamp)
    .toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    .slice(0, 5);
}

function getServiceIcon(accountId: string): string {
  const icons: Record<string, string> = {
    whatsapp: "[W]",
    signal: "[S]",
    telegram: "[T]",
    matrix: "[M]",
    beeper: "[B]",
  };
  return icons[accountId] || "[*]";
}

function getMaxIndex(state: AppState): number {
  switch (state.currentScreen) {
    case "accounts": {
      const uniqueAccounts = new Set(state.accounts.map((a) => a.accountID));
      return Math.max(0, uniqueAccounts.size); // +1 for "All Chats" at index 0
    }
    case "chats":
      return Math.max(0, state.chats.length);
    case "messages":
      return Math.max(0, state.messages.length - 1);
    case "quickReply":
      return QUICK_REPLIES.length; // +1 for Cancel
  }
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildAccountsDisplay(
  state: AppState,
  highlightedIdx: number,
): DisplayLine[] {
  const lines: DisplayLine[] = [];

  // Header: "Even Messages" + time
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  lines.push(line(buildHeaderLine("Even Messages", time), "inverted"));

  // "All Chats" option
  const allSelected = highlightedIdx === 0;
  lines.push(
    line(
      `${allSelected ? ICONS.SELECTED : " "} * All Chats`,
      allSelected ? "inverted" : "normal",
    ),
  );

  // Unique accounts
  const seen = new Set<string>();
  let itemIdx = 1; // Start at 1 since 0 is "All Chats"

  state.accounts.forEach((a) => {
    if (!seen.has(a.accountID)) {
      seen.add(a.accountID);
      const isSelected = highlightedIdx === itemIdx;
      const icon = getServiceIcon(a.accountID);
      const name = a.user.fullName || a.user.username || "Unknown";

      // Full width line
      const lineText = `${isSelected ? ICONS.SELECTED : " "} ${icon} ${padRight(truncateName(name, 28), 28)}`;
      lines.push(line(lineText, isSelected ? "inverted" : "normal"));
      itemIdx++;
    }
  });

  lines.push(sep());
  lines.push(line(buildStaticActionBar(["Select"], -1), "meta"));

  return lines;
}

function buildChatsDisplay(
  state: AppState,
  highlightedIdx: number,
): DisplayLine[] {
  const lines: DisplayLine[] = [];

  // Header with back + account name + count
  const accountName = state.selectedAccount
    ? state.accounts.find((a) => a.accountID === state.selectedAccount)?.user
        .fullName || "Chats"
    : "All Platforms";
  lines.push(
    line(
      buildHeaderLine(
        `${ICONS.BACK} ${truncate(accountName, 20)}`,
        `${state.chats.length}`,
      ),
      "inverted",
    ),
  );

  if (state.chats.length === 0) {
    lines.push(line("No chats found", "normal"));
  } else {
    // Calculate visible window
    let start = Math.max(0, highlightedIdx - 1);
    const maxItems = MAX_VISIBLE_ITEMS - 2; // Leave room for header and action bar
    const visible = state.chats.slice(start, start + maxItems);

    visible.forEach((chat, _i) => {
      const globalIdx = start + visible.indexOf(chat);
      const isSelected = globalIdx === highlightedIdx;
      const typeIcon = chat.type === "group" ? ICONS.GROUP : ICONS.DIRECT;

      // Format: > [D] Contact Name..............[!2]
      const name = truncateName(chat.title, 26);
      const namePadded = padRight(name, 26);
      const suffix =
        chat.unreadCount > 0 ? `${ICONS.UNREAD}${chat.unreadCount}]` : "";
      const suffixPadded = padRight(suffix, 6);

      const lineText = `${isSelected ? ICONS.SELECTED : " "} ${typeIcon} ${namePadded}${suffixPadded}`;
      lines.push(line(lineText, isSelected ? "inverted" : "normal"));
    });
  }

  lines.push(sep());

  // Show current position in list
  const posText = `${highlightedIdx + 1}/${state.chats.length}`;
  lines.push(line(buildStaticActionBar(["Back"], -1) + "  " + posText, "meta"));

  return lines;
}

function buildMessagesDisplay(
  state: AppState,
  _highlightedIdx: number,
  flashPhase: boolean,
): DisplayLine[] {
  const lines: DisplayLine[] = [];

  // Header with back + chat name
  const chat = state.chats.find((c) => c.id === state.selectedChat);
  const chatName = chat ? truncateName(chat.title, 20) : "Messages";
  lines.push(
    line(buildHeaderLine(`${ICONS.BACK} ${chatName}`, ""), "inverted"),
  );

  // Messages - show last 5
  const visibleMessages = state.messages.slice(-5);

  if (visibleMessages.length === 0) {
    lines.push(line("No messages yet - send one!", "normal"));
  } else {
    visibleMessages.forEach((msg) => {
      const time = formatTime(msg.timestamp);
      const sender = msg.isSender ? ">" : truncateName(msg.senderName || "?", 8);
      const prefix = `[${time}] ${sender}: `;

      // Wrap message content at word boundaries
      const content = msg.text || "[media]";
      const wrappedLines = wordWrap(content, DISPLAY_WIDTH - prefix.length);

      // First line with prefix
      lines.push(line(`${prefix}${wrappedLines[0]}`, "normal"));

      // Continuation lines (indented)
      for (let i = 1; i < wrappedLines.length; i++) {
        lines.push(line(`             ${wrappedLines[i]}`, "normal"));
      }
    });
  }

  lines.push(sep());

  // Reply action (blinking)
  const hasIncoming = visibleMessages.some((m) => !m.isSender);
  if (hasIncoming) {
    const actionBar = buildActionBar(["Reply"], 0, "Reply", flashPhase);
    lines.push(line(actionBar, "meta"));
  } else {
    lines.push(line(buildStaticActionBar(["Back"], 0), "meta"));
  }

  return lines;
}

function buildQuickReplyDisplay(
  state: AppState,
  highlightedIdx: number,
): DisplayLine[] {
  const lines: DisplayLine[] = [];

  // Header
  const msg = state.messages[state.selectedMessageIndex];
  const sender = msg ? truncateName(msg.senderName || "Unknown", 16) : "Unknown";
  lines.push(line(buildHeaderLine(`Reply: ${sender}`, ""), "inverted"));

  // Quick replies in 2 columns
  // Format: "Got it"    "OK"
  const start = Math.floor(highlightedIdx / 2) * 2;
  const visibleReplies = QUICK_REPLIES.slice(start, start + 6);

  for (let i = 0; i < visibleReplies.length; i += 2) {
    const reply1 = visibleReplies[i] || "";
    const reply2 = visibleReplies[i + 1] || "";
    const idx1 = start + i;
    const idx2 = start + i + 1;
    const isSel1 = idx1 === highlightedIdx;
    const isSel2 = idx2 === highlightedIdx;

    const sel1 = isSel1 ? ICONS.SELECTED : " ";
    const sel2 = isSel2 ? ICONS.SELECTED : " ";
    const lineText = `${sel1}"${padRight(reply1, 12)}"  ${sel2}"${padRight(reply2, 12)}"`;
    lines.push(line(lineText, "normal"));
  }

  lines.push(sep());

  // Cancel
  const isCancelSelected = highlightedIdx >= QUICK_REPLIES.length;
  const cancelBar = buildStaticActionBar(["Cancel"], isCancelSelected ? 0 : -1);
  lines.push(line(cancelBar, "meta"));

  return lines;
}

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════

function getDemoChats(): BeeperChat[] {
  return [
    {
      id: "1",
      accountID: "whatsapp",
      title: "John Doe",
      type: "single",
      participants: { items: [], hasMore: false, total: 2 },
      lastActivity: new Date().toISOString(),
      unreadCount: 2,
      isArchived: false,
      isMuted: false,
      isPinned: false,
    },
    {
      id: "2",
      accountID: "whatsapp",
      title: "Alice Smith",
      type: "single",
      participants: { items: [], hasMore: false, total: 2 },
      lastActivity: new Date().toISOString(),
      unreadCount: 0,
      isArchived: false,
      isMuted: false,
      isPinned: false,
    },
    {
      id: "3",
      accountID: "whatsapp",
      title: "Family Group",
      type: "group",
      participants: { items: [], hasMore: false, total: 8 },
      lastActivity: new Date().toISOString(),
      unreadCount: 5,
      isArchived: false,
      isMuted: false,
      isPinned: true,
    },
    {
      id: "4",
      accountID: "signal",
      title: "Work Team",
      type: "group",
      participants: { items: [], hasMore: false, total: 12 },
      lastActivity: new Date().toISOString(),
      unreadCount: 1,
      isArchived: false,
      isMuted: false,
      isPinned: false,
    },
    {
      id: "5",
      accountID: "telegram",
      title: "Bob Wilson",
      type: "single",
      participants: { items: [], hasMore: false, total: 2 },
      lastActivity: new Date().toISOString(),
      unreadCount: 0,
      isArchived: false,
      isMuted: false,
      isPinned: false,
    },
    {
      id: "6",
      accountID: "whatsapp",
      title: "Mom",
      type: "single",
      participants: { items: [], hasMore: false, total: 2 },
      lastActivity: new Date().toISOString(),
      unreadCount: 1,
      isArchived: false,
      isMuted: false,
      isPinned: false,
    },
    {
      id: "7",
      accountID: "signal",
      title: "Best Friend",
      type: "single",
      participants: { items: [], hasMore: false, total: 2 },
      lastActivity: new Date().toISOString(),
      unreadCount: 3,
      isArchived: false,
      isMuted: false,
      isPinned: false,
    },
  ];
}

function getDemoMessages(): BeeperMessage[] {
  return [
    {
      id: "1",
      chatID: "1",
      accountID: "demo",
      senderID: "john",
      senderName: "John Doe",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      sortKey: "1",
      type: "TEXT",
      text: "Hey, are you coming tonight?",
      isSender: false,
      isUnread: false,
    },
    {
      id: "2",
      chatID: "1",
      accountID: "demo",
      senderID: "me",
      senderName: "You",
      timestamp: new Date(Date.now() - 3000000).toISOString(),
      sortKey: "2",
      type: "TEXT",
      text: "Yes! Around 8pm",
      isSender: true,
      isUnread: false,
    },
    {
      id: "3",
      chatID: "1",
      accountID: "demo",
      senderID: "john",
      senderName: "John Doe",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      sortKey: "3",
      type: "TEXT",
      text: "Great! See you then",
      isSender: false,
      isUnread: false,
    },
    {
      id: "4",
      chatID: "1",
      accountID: "demo",
      senderID: "me",
      senderName: "You",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      sortKey: "4",
      type: "TEXT",
      text: "Thanks for invite!",
      isSender: true,
      isUnread: false,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function GlassesUI({
  beeperConfig,
}: {
  beeperConfig: { baseUrl: string; token: string } | null;
}) {
  const [state, setState] = useState<AppState>({
    accounts: [],
    chats: [],
    messages: [],
    currentScreen: "accounts",
    selectedAccount: null,
    selectedChat: null,
    selectedMessageIndex: 0,
    highlightedIndex: 0,
    isLoading: true,
  });

  const beeper = beeperConfig ? new BeeperClient(beeperConfig) : null;

  // Flash phase for blinking action indicators
  const flashPhase = useFlashPhase(true);

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        let accounts: BeeperAccount[] = [];
        if (beeper) {
          accounts = await beeper.listAccounts();
        }

        setState((s) => ({
          ...s,
          accounts,
          chats: accounts.length === 0 ? getDemoChats() : [],
          isLoading: false,
        }));
      } catch (e) {
        console.warn("[GlassesUI] Using demo data");
        setState((s) => ({
          ...s,
          chats: getDemoChats(),
          isLoading: false,
        }));
      }
    }
    load();

    // Keep alive
    activateKeepAlive("even-messages");
    return () => deactivateKeepAlive();
  }, []);

  // Handle selection
  const handleSelect = useCallback(
    (s: AppState): Partial<AppState> => {
      const updates: Partial<AppState> = {};

      switch (s.currentScreen) {
        case "accounts": {
          // "All Chats" is index 0
          if (s.highlightedIndex === 0) {
            updates.selectedAccount = null;
          } else {
            // Find the account at this index
            const seen = new Set<string>();
            let itemIdx = 1;
            for (const account of s.accounts) {
              if (!seen.has(account.accountID)) {
                seen.add(account.accountID);
                if (itemIdx === s.highlightedIndex) {
                  updates.selectedAccount = account.accountID;
                  break;
                }
                itemIdx++;
              }
            }
          }
          updates.currentScreen = "chats";
          updates.highlightedIndex = 0;
          updates.isLoading = true;

          // Load chats
          loadChats(updates.selectedAccount ?? null);
          break;
        }

        case "chats": {
          if (s.highlightedIndex < s.chats.length) {
            const chat = s.chats[s.highlightedIndex];
            updates.currentScreen = "messages";
            updates.selectedChat = chat.id;
            updates.isLoading = true;
            updates.selectedMessageIndex = 0;

            loadMessages(chat.id);
          }
          break;
        }

        case "messages": {
          const firstIncoming = s.messages.find((m) => !m.isSender);
          if (firstIncoming) {
            updates.currentScreen = "quickReply";
            updates.selectedMessageIndex = s.messages.indexOf(firstIncoming);
            updates.highlightedIndex = 0;
          }
          break;
        }

        case "quickReply": {
          if (s.highlightedIndex < QUICK_REPLIES.length) {
            const reply = QUICK_REPLIES[s.highlightedIndex];
            sendMessage(reply);
            updates.currentScreen = "messages";
            updates.highlightedIndex = 0;
          } else {
            // Cancel - go back
            updates.currentScreen = "messages";
          }
          break;
        }
      }

      return updates;
    },
    [beeper],
  );

  // Handle back
  const handleBack = useCallback((s: AppState): Partial<AppState> => {
    const updates: Partial<AppState> = { highlightedIndex: 0 };

    switch (s.currentScreen) {
      case "accounts":
        // Can't go back
        break;
      case "chats":
        updates.currentScreen = "accounts";
        updates.selectedAccount = null;
        break;
      case "messages":
        updates.currentScreen = "chats";
        updates.selectedChat = null;
        break;
      case "quickReply":
        updates.currentScreen = "messages";
        break;
    }

    return updates;
  }, []);

  // Load chats
  function loadChats(accountId: string | null) {
    async function doLoad() {
      try {
        let chats: BeeperChat[] = [];
        if (beeper) {
          const result = await beeper.listChats(
            accountId ? { accountIDs: [accountId] } : undefined,
          );
          chats = result.chats;
        }
        setState((s) => ({
          ...s,
          chats: chats.length > 0 ? chats : getDemoChats(),
          isLoading: false,
        }));
      } catch {
        setState((s) => ({ ...s, chats: getDemoChats(), isLoading: false }));
      }
    }
    doLoad();
  }

  // Load messages
  function loadMessages(chatId: string) {
    async function doLoad() {
      try {
        let messages: BeeperMessage[] = [];
        if (beeper) {
          const result = await beeper.listMessages(chatId);
          messages = result.messages.reverse();
        }
        setState((s) => ({
          ...s,
          messages: messages.length > 0 ? messages : getDemoMessages(),
          isLoading: false,
          highlightedIndex: 0,
        }));
      } catch {
        setState((s) => ({
          ...s,
          messages: getDemoMessages(),
          isLoading: false,
          highlightedIndex: 0,
        }));
      }
    }
    doLoad();
  }

  // Send message
  function sendMessage(text: string) {
    async function doSend() {
      if (beeper && state.selectedChat) {
        try {
          await beeper.sendMessage(state.selectedChat, { text });
          const chatId = state.selectedChat;
          if (chatId) loadMessages(chatId);
        } catch (e) {
          console.error("[GlassesUI] Send failed:", e);
        }
      } else {
        console.log("[GlassesUI] Would send:", text);
      }
    }
    doSend();
  }

  // Convert state to display data
  const toDisplayData = useCallback(
    (snapshot: AppState, nav: GlassNavState) => {
      let lines: DisplayLine[];

      switch (snapshot.currentScreen) {
        case "accounts":
          lines = buildAccountsDisplay(snapshot, nav.highlightedIndex);
          break;
        case "chats":
          lines = buildChatsDisplay(snapshot, nav.highlightedIndex);
          break;
        case "messages":
          lines = buildMessagesDisplay(
            snapshot,
            nav.highlightedIndex,
            flashPhase,
          );
          break;
        case "quickReply":
          lines = buildQuickReplyDisplay(snapshot, nav.highlightedIndex);
          break;
        default:
          lines = [line("Even Messages", "inverted")];
      }

      return { lines };
    },
    [flashPhase],
  );

  // Derive screen from path
  const deriveScreen = useCallback(
    (_path: string) => {
      return state.currentScreen;
    },
    [state.currentScreen],
  );

  // Handle glass actions
  const onGlassAction = useCallback(
    (
      action: GlassAction,
      nav: GlassNavState,
      snapshot: AppState,
    ): GlassNavState => {
      switch (action.type) {
        case "HIGHLIGHT_MOVE": {
          const maxIdx = getMaxIndex(snapshot);
          const newIdx = Math.max(
            0,
            Math.min(
              maxIdx,
              nav.highlightedIndex + (action.direction === "down" ? 1 : -1),
            ),
          );
          return { ...nav, highlightedIndex: newIdx };
        }

        case "SELECT_HIGHLIGHTED": {
          setState((s) => {
            const updates = handleSelect(s);
            return { ...s, ...updates };
          });
          return nav;
        }

        case "GO_BACK": {
          setState((s) => {
            const updates = handleBack(s);
            return { ...s, ...updates };
          });
          return nav;
        }
      }
    },
    [handleSelect, handleBack],
  );

  // Connect to glasses
  useGlasses({
    getSnapshot: () => state,
    toDisplayData,
    onGlassAction,
    deriveScreen,
    appName: "even-messages",
  });

  // This is a headless component - renders nothing in DOM
  return null;
}

export default GlassesUI;
