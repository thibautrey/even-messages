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
import { useCallback, useEffect, useState, useRef } from "react";

import { buildHeaderLine } from "even-toolkit/text-utils";
import { line } from "even-toolkit/types";
import { useFlashPhase } from "even-toolkit/useFlashPhase";
import { useGlasses } from "even-toolkit/useGlasses";
import { waitForEvenAppBridge, type EvenAppBridge, type EvenHubEvent } from "@evenrealities/even_hub_sdk";
import { getServiceIcon } from "./platformIcons";

// ═══════════════════════════════════════════════════════════════
// DISPLAY CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Even G2: 576px wide, ~288px tall
// Font: 22px Courier New monospace (~12px per char)
// Visible width: ~48 chars, but leaving padding, use 40 chars
const MAX_VISIBLE_ITEMS = 8; // Max items visible on screen
const DISPLAY_WIDTH = 60; // Max characters per line
const DISPLAY_LINES = 8; // Max lines on Even G2 display (288px / ~40px per line)
const SEPARATOR_LINE = "----------------------------------------"; // 40 dashes

// Storage key for persisting state (using Even SDK storage)
const STORAGE_KEY = "even-messages-state";

// Saved state interface
interface SavedState {
  selectedAccount: string | null;
  selectedChat: string | null;
  chatScrollPosition?: number;
}

// Bridge instance for storage
let bridgeInstance: EvenAppBridge | null = null;

async function getBridge(): Promise<EvenAppBridge | null> {
  if (bridgeInstance) return bridgeInstance;
  try {
    bridgeInstance = await waitForEvenAppBridge();
    return bridgeInstance;
  } catch (e) {
    console.warn("[GlassesUI] Failed to get bridge:", e);
    return null;
  }
}

// ASCII indicators (safe for glasses font)
const ICONS = {
  SELECTED: ">",
  BACK: "<",
  UNREAD: "[!",
};

// Quick reply presets (2 columns x 4 rows = 8 replies)
const QUICK_REPLIES = [
  "Voice",
  "Got it",
  "OK",
  "Thanks!",
  "See you",
  "On way",
  "Call me",
  "Busy",
  "Later",
];

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE (Using Even SDK Storage)
// ═══════════════════════════════════════════════════════════════

async function loadSavedState(): Promise<SavedState> {
  try {
    const bridge = await getBridge();
    if (bridge) {
      const saved = await bridge.getLocalStorage(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
    // Fallback to browser localStorage for development
    const fallback = localStorage.getItem(STORAGE_KEY);
    if (fallback) {
      return JSON.parse(fallback);
    }
  } catch (e) {
    console.warn("[GlassesUI] Failed to load saved state:", e);
  }
  return { selectedAccount: null, selectedChat: null };
}

async function saveState(state: SavedState): Promise<void> {
  try {
    const bridge = await getBridge();
    if (bridge) {
      await bridge.setLocalStorage(STORAGE_KEY, JSON.stringify(state));
      return;
    }
  } catch (e) {
    console.warn("[GlassesUI] SDK storage failed, using fallback:", e);
  }
  // Fallback to browser localStorage for development
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[GlassesUI] Failed to save state:", e);
  }
}

// Strip emoji and other unsupported Unicode characters for glasses display
// Glasses only support basic Latin, numbers, punctuation, and common symbols
function stripUnsupportedChars(text: string): string {
  // Remove emoji (U+1F000 to U+1FFFF range)
  // Also remove other symbols like playing cards, misc symbols, dingbats beyond what we use
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "[emoji]") // Misc symbols and emoji
    .replace(/[\u{1FA00}-\u{1FAFF}]/gu, "[emoji]") // Symbols and Pictographs Extended-A (includes U+1FAF0 Love-You gesture)
    .replace(/[\u{2600}-\u{26FF}]/gu, "") // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
    .replace(/[\u{1F000}-\u{1F02F}]/gu, "") // Mahjong tiles
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, "") // Playing cards
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport and map symbols
    .replace(/[\u{1F700}-\u{1F77F}]/gu, ""); // Alchemical symbols
}

// Helper: create a separator line (using meta style so text renders)
function sep(): DisplayLine {
  return line(SEPARATOR_LINE, "meta");
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Screen = "accounts" | "chats" | "messages" | "quickReply" | "voiceReply";

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
  messageScrollOffset: number; // For scrolling through messages
  demoMode: boolean; // Easter egg: force demo mode with fake data
  voiceStatus: string | null;
  voiceAudioBytes: number;
}

interface BrowserSpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

// Demo mode trigger: 5 clicks within 1 second
const DEMO_MODE_CLICKS = 5;
const DEMO_MODE_WINDOW_MS = 1000;

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

// Calculate the scroll position to show maximum messages while keeping the bottom visible
function getMaxScrollForMessages(messages: BeeperMessage[]): number {
  if (messages.length === 0) return 0;
  
  const LINES_FOR_MESSAGES = DISPLAY_LINES - 3; // header, separator, action bar
  
  // Start from bottom and work backwards to find the scroll that shows max messages
  // Keep going until adding the next message would overflow
  let lastValidScroll = Math.max(0, messages.length - 1); // Default to bottom (1 msg)
  
  for (let scroll = Math.max(0, messages.length - 1); scroll >= 0; scroll--) {
    let lineCount = 0;
    
    for (let i = scroll; i < messages.length; i++) {
      const msg = messages[i];
      const sender = msg.isSender ? ">" : truncateName(msg.senderName || "?", 8);
      const prefix = `[00:00] ${sender}: `;
      const content = stripUnsupportedChars(msg.text || "[media]");
      const wrappedLines = wordWrap(content, DISPLAY_WIDTH - prefix.length);
      
      lineCount += wrappedLines.length;
      
      // Stop counting once we've exceeded capacity
      if (lineCount > LINES_FOR_MESSAGES) {
        break;
      }
    }
    
    if (lineCount <= LINES_FOR_MESSAGES) {
      // This scroll position is valid - keep track of it
      lastValidScroll = scroll;
    } else {
      // First invalid position - return the last valid one
      return lastValidScroll;
    }
  }
  
  return lastValidScroll;
}

// Word-wrap text to fit within maxWidth, breaking words as needed
function wordWrap(text: string, maxWidth: number): string[] {
  if (!text || text.length === 0) return [""];
  if (text.length <= maxWidth) return [text];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of text.split(" ")) {
    if (!word) continue;

    // If single word is longer than maxWidth, break it mid-word
    if (word.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      // Break long word into chunks (no hyphen, just clean break)
      let remaining = word;
      while (remaining.length > maxWidth) {
        lines.push(remaining.slice(0, maxWidth));
        remaining = remaining.slice(maxWidth);
      }
      currentLine = remaining;
      continue;
    }

    // Check if adding this word would exceed maxWidth
    const testLine = currentLine ? currentLine + " " + word : word;
    if (testLine.length > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
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
    case "voiceReply":
      return 0;
  }
}

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

// ═══════════════════════════════════════════════════════════════
// DISPLAY BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildAccountsDisplay(
  state: AppState,
  highlightedIdx: number,
): DisplayLine[] {
  const lines: DisplayLine[] = [];

  // Header: "Even Messages" + time (+ DEMO indicator if active)
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const title = state.demoMode ? "Even [DEMO]" : "Even Messages";
  lines.push(line(buildHeaderLine(title, time), "inverted"));

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

      // Format: > Contact Name..............[!2]
      const name = truncateName(chat.title, 28);
      const namePadded = padRight(name, 28);
      const suffix =
        chat.unreadCount > 0 ? `${ICONS.UNREAD}${chat.unreadCount}]` : "";
      const suffixPadded = padRight(suffix, 6);

      const lineText = `${isSelected ? ICONS.SELECTED : " "} ${namePadded}${suffixPadded}`;
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

  // Calculate scroll window
  const totalMessages = state.messages.length;
  const maxScroll = Math.max(0, totalMessages - 1);
  const scrollOffset = Math.min(state.messageScrollOffset, maxScroll);

  // Track line count: header (1) + separator (1) + action bar (1) = 3 fixed
  // We need room for 1 more line for "[more above" indicator if needed
  let usedLines = 3; // separator + action bar + buffer
  const MAX_MESSAGE_LINES = DISPLAY_LINES - usedLines;

  // Show indicator if there are more messages above
  const hasMoreAbove = scrollOffset > 0;
  if (hasMoreAbove) {
    lines.push(line("[more above]", "meta"));
    usedLines++;
  }

  // Get messages to display, respecting line limit
  const visibleMessages: BeeperMessage[] = [];
  const moreBelowIndices: { above: number; below: number } = {
    above: 0,
    below: 0,
  };
  let currentLineCount = 0;

  // Start from scroll position and go forward
  for (
    let i = scrollOffset;
    i < totalMessages && currentLineCount < MAX_MESSAGE_LINES;
    i++
  ) {
    const msg = state.messages[i];
    const time = formatTime(msg.timestamp);
    const sender = msg.isSender ? ">" : truncateName(msg.senderName || "?", 8);
    const prefix = `[${time}] ${sender}: `;

    // Strip unsupported characters and wrap message content
    const content = stripUnsupportedChars(msg.text || "[media]");
    const wrappedLines = wordWrap(content, DISPLAY_WIDTH - prefix.length);
    const msgLineCount = wrappedLines.length;

    // Check if this message fits
    if (currentLineCount + msgLineCount <= MAX_MESSAGE_LINES) {
      visibleMessages.push(msg);
      currentLineCount += msgLineCount;
    } else {
      // Calculate how many messages are below
      moreBelowIndices.below = totalMessages - i;
      break;
    }
  }

  // Render visible messages
  if (visibleMessages.length === 0) {
    lines.push(line("No messages yet - send one!", "normal"));
  } else {
    visibleMessages.forEach((msg) => {
      const time = formatTime(msg.timestamp);
      const sender = msg.isSender
        ? ">"
        : truncateName(msg.senderName || "?", 8);
      const prefix = `[${time}] ${sender}: `;

      // Strip unsupported characters and wrap message content
      const content = stripUnsupportedChars(msg.text || "[media]");
      let wrappedLines = wordWrap(content, DISPLAY_WIDTH - prefix.length);
      // Filter out any empty lines
      wrappedLines = wrappedLines.filter((line) => line.length > 0);

      // Skip if no content
      if (wrappedLines.length === 0) return;

      // First line with prefix
      lines.push(line(`${prefix}${wrappedLines[0]}`, "normal"));

      // Continuation lines (at the beginning of the view)
      for (let i = 1; i < wrappedLines.length; i++) {
        if (wrappedLines[i]) {
          lines.push(line(wrappedLines[i], "normal"));
        }
      }
    });
  }

  // Show indicator if there are more messages below
  const lastShownIndex = scrollOffset + visibleMessages.length - 1;
  const hasMoreBelow = lastShownIndex < totalMessages - 1;
  if (hasMoreBelow) {
    lines.push(line("[more below]", "meta"));
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
  const sender = msg
    ? truncateName(msg.senderName || "Unknown", 16)
    : "Unknown";
  lines.push(line(buildHeaderLine(`Reply: ${sender}`, ""), "inverted"));

  // Quick replies in 2 columns.
  // Keep the list fixed and only move the selection marker.
  for (let i = 0; i < QUICK_REPLIES.length; i += 2) {
    const reply1 = QUICK_REPLIES[i] || "";
    const reply2 = QUICK_REPLIES[i + 1] || "";
    const isSel1 = i === highlightedIdx;
    const isSel2 = i + 1 === highlightedIdx;

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

function buildVoiceReplyDisplay(state: AppState): DisplayLine[] {
  const lines: DisplayLine[] = [];
  const msg = state.messages[state.selectedMessageIndex];
  const sender = msg
    ? truncateName(msg.senderName || "Unknown", 16)
    : "Unknown";

  lines.push(line(buildHeaderLine(`Voice: ${sender}`, ""), "inverted"));
  lines.push(line("Listening...", "normal"));
  lines.push(line(truncate(state.voiceStatus || "Speak now", 38), "normal"));
  lines.push(sep());
  lines.push(line(buildStaticActionBar(["Cancel"], 0), "meta"));

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
    messageScrollOffset: 0,
    demoMode: false,
    voiceStatus: null,
    voiceAudioBytes: 0,
  });

  // Ref to store saved state for use in effects
  const savedStateRef = useRef<SavedState>({ selectedAccount: null, selectedChat: null });
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isVoiceCancelledRef = useRef<boolean>(false);
  const evenHubUnsubscribeRef = useRef<(() => void) | null>(null);

  // Ref for WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to prevent double-loadMessages after sending (debounce)
  const suppressReloadRef = useRef<boolean>(false);
  const suppressReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beeper = beeperConfig ? new BeeperClient(beeperConfig) : null;

  const stopVoiceReply = useCallback(async (cancelled = false) => {
    isVoiceCancelledRef.current = cancelled;

    if (speechRecognitionRef.current) {
      const recognition = speechRecognitionRef.current;
      speechRecognitionRef.current = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    }

    if (evenHubUnsubscribeRef.current) {
      evenHubUnsubscribeRef.current();
      evenHubUnsubscribeRef.current = null;
    }

    const bridge = await getBridge();
    if (bridge) {
      try {
        await bridge.audioControl(false);
      } catch (e) {
        console.warn("[GlassesUI] Failed to close microphone:", e);
      }
    }
  }, []);

  const startVoiceReply = useCallback(async () => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setState((s) => ({
        ...s,
        currentScreen: "quickReply",
        voiceStatus: "Speech not supported",
        voiceAudioBytes: 0,
      }));
      return;
    }

    isVoiceCancelledRef.current = false;
    setState((s) => ({
      ...s,
      currentScreen: "voiceReply",
      voiceStatus: "Speak now",
      voiceAudioBytes: 0,
    }));

    const bridge = await getBridge();
    if (bridge) {
      try {
        evenHubUnsubscribeRef.current = bridge.onEvenHubEvent((event: EvenHubEvent) => {
          if (event.listEvent) {
            console.log("[GlassesUI] List selected:", event.listEvent.currentSelectItemName);
          } else if (event.textEvent) {
            console.log("[GlassesUI] Text event:", event.textEvent);
          } else if (event.sysEvent) {
            console.log("[GlassesUI] System event:", event.sysEvent.eventType);
          } else if (event.audioEvent) {
            const pcm = event.audioEvent.audioPcm;
            const pcmLength = pcm?.length || 0;
            console.log("[GlassesUI] Audio PCM length:", pcmLength);
            setState((s) => ({
              ...s,
              voiceAudioBytes: s.voiceAudioBytes + pcmLength,
            }));
          }
        });
        await bridge.audioControl(true);
      } catch (e) {
        console.warn("[GlassesUI] Failed to open microphone:", e);
      }
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript?.trim() || "";
      if (!transcript) return;

      setState((s) => ({ ...s, voiceStatus: transcript }));

      if (result.isFinal) {
        stopVoiceReply(false);
        sendMessage(transcript);
        setState((s) => ({
          ...s,
          currentScreen: "messages",
          highlightedIndex: 0,
          voiceStatus: null,
          voiceAudioBytes: 0,
        }));
      }
    };

    recognition.onerror = (event) => {
      const errorMessage = event.error || "Voice failed";
      stopVoiceReply(false);
      setState((s) => ({
        ...s,
        currentScreen: "quickReply",
        voiceStatus: errorMessage,
        voiceAudioBytes: 0,
      }));
    };

    recognition.onend = () => {
      speechRecognitionRef.current = null;
      if (isVoiceCancelledRef.current) {
        setState((s) => ({ ...s, voiceStatus: null, voiceAudioBytes: 0 }));
        return;
      }
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  }, [stopVoiceReply]);

  // Flash phase for blinking action indicators
  const flashPhase = useFlashPhase(true);

  // Demo mode: click timestamps tracked in onGlassAction
  const clickTimestamps = useRef<number[]>([]);

  // Load saved state and initial data
  useEffect(() => {
    async function init() {
      // First, load the saved state from storage
      const savedState = await loadSavedState();
      savedStateRef.current = savedState;

      // Set initial state based on saved state
      setState((s) => ({
        ...s,
        currentScreen: savedState.selectedChat
          ? "messages"
          : savedState.selectedAccount
            ? "chats"
            : "accounts",
        selectedAccount: savedState.selectedAccount,
        selectedChat: savedState.selectedChat,
        messageScrollOffset: savedState.chatScrollPosition || 0,
      }));

      // Then load data
      await loadData(savedState);
    }

    async function loadData(savedState: SavedState) {
      try {
        let accounts: BeeperAccount[] = [];
        if (beeper) {
          accounts = await beeper.listAccounts();
        }

        // If we have a saved state with an account, load chats for that account first
        // Otherwise, use demo data if no real accounts
        const shouldUseDemo = accounts.length === 0;

        if (savedState.selectedChat && !shouldUseDemo) {
          // We have a saved chat and real accounts - try to restore it
          await restoreSavedChat(accounts, savedState.selectedAccount, savedState.selectedChat);
        } else {
          // No saved chat or demo mode - set initial state normally
          const initialChats = shouldUseDemo ? getDemoChats() : [];

          setState((s) => ({
            ...s,
            accounts,
            chats: initialChats,
            isLoading: false,
          }));

          // Demo mode: check if saved chat exists in demo data
          if (savedState.selectedChat && shouldUseDemo) {
            const chatExists = initialChats.some(
              (c) => c.id === savedState.selectedChat,
            );
            if (chatExists) {
              loadMessages(savedState.selectedChat);
            } else {
              // Chat no longer exists, go back to chats list
              await saveState({ selectedAccount: null, selectedChat: null });
              setState((s) => ({
                ...s,
                currentScreen: savedState.selectedAccount ? "chats" : "accounts",
                selectedAccount: savedState.selectedAccount,
                selectedChat: null,
              }));
            }
          }
        }
      } catch (e) {
        console.warn("[GlassesUI] Using demo data");
        const demoChats = getDemoChats();

        setState((s) => ({
          ...s,
          chats: demoChats,
          isLoading: false,
        }));

        // If we had a saved chat, try to restore it in demo mode
        if (savedState.selectedChat) {
          const chatExists = demoChats.some(
            (c) => c.id === savedState.selectedChat,
          );
          if (chatExists) {
            loadMessages(savedState.selectedChat);
          } else {
            // Chat no longer exists, go back to chats list
            await saveState({ selectedAccount: null, selectedChat: null });
            setState((s) => ({
              ...s,
              currentScreen: savedState.selectedAccount ? "chats" : "accounts",
              selectedAccount: savedState.selectedAccount,
              selectedChat: null,
            }));
          }
        }
      }
    }

    async function restoreSavedChat(
      accounts: BeeperAccount[],
      savedAccountId: string | null,
      savedChatId: string
    ) {
      if (!beeper) return;

      try {
        // Load chats for the saved account (or all chats if no specific account)
        const result = await beeper.listChats(
          savedAccountId ? { accountIDs: [savedAccountId] } : undefined
        );
        const loadedChats = result.chats;

        // Check if the saved chat exists in loaded chats
        const chatExists = loadedChats.some((c) => c.id === savedChatId);

        if (chatExists) {
          // Restore the chat view
          setState((s) => ({
            ...s,
            accounts,
            chats: loadedChats,
            selectedAccount: savedAccountId,
            selectedChat: savedChatId,
            currentScreen: "messages",
            highlightedIndex: 0,
            isLoading: true,
          }));
          loadMessages(savedChatId);
        } else {
          // Chat no longer exists, clear saved state and show chats for the account
          await saveState({ selectedAccount: savedAccountId, selectedChat: null });
          setState((s) => ({
            ...s,
            accounts,
            chats: loadedChats,
            selectedAccount: savedAccountId,
            selectedChat: null,
            currentScreen: savedAccountId ? "chats" : "accounts",
            isLoading: false,
          }));
        }
      } catch (err) {
        console.error("[GlassesUI] Failed to restore saved chat:", err);
        // Fall back to accounts view
        await saveState({ selectedAccount: null, selectedChat: null });
        setState((s) => ({
          ...s,
          accounts,
          chats: [],
          currentScreen: "accounts",
          selectedAccount: null,
          selectedChat: null,
          isLoading: false,
        }));
      }
    }

    init();

    // Keep alive
    activateKeepAlive("even-messages");
    return () => deactivateKeepAlive();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Skip in demo mode or if no beeper client
    if (!beeper || state.demoMode) return;

    let ws: WebSocket | null = null;
    let isMounted = true;

    function connect() {
      if (!isMounted || state.demoMode || !beeper) return;

      try {
        ws = beeper.createWebSocket((event) => {
          if (!isMounted) return;

          switch (event.type) {
            case 'message.upserted': {
              const msg = event.data as BeeperMessage;
              // If this message is for the currently viewed chat, reload messages
              if (msg.chatID === state.selectedChat) {
                // Skip reload if we just sent a message (debounce to prevent duplicates)
                if (suppressReloadRef.current) {
                  console.log('[GlassesUI] Skipping WebSocket reload - message was just sent');
                  suppressReloadRef.current = false;
                  if (suppressReloadTimeoutRef.current) {
                    clearTimeout(suppressReloadTimeoutRef.current);
                    suppressReloadTimeoutRef.current = null;
                  }
                } else if (!msg.isSender) {
                  // Only reload for incoming messages, not our own sent messages
                  console.log('[GlassesUI] New incoming message in current chat, reloading:', msg.text?.slice(0, 30));
                  loadMessages(state.selectedChat!);
                } else {
                  console.log('[GlassesUI] Our own message received via WebSocket, skipping reload');
                }
              }
              // Update chat list to refresh unread counts (always do this)
              loadChats(state.selectedAccount);
              break;
            }
            case 'chat.upserted': {
              console.log('[GlassesUI] Chat updated, refreshing list');
              loadChats(state.selectedAccount);
              break;
            }
            case 'message.deleted': {
              const deleted = event.data as { chatID: string; messageID: string };
              if (deleted.chatID === state.selectedChat) {
                loadMessages(state.selectedChat!);
              }
              break;
            }
            case 'chat.deleted': {
              console.log('[GlassesUI] Chat deleted');
              // If we're viewing the deleted chat, go back
              if (state.currentScreen === 'messages') {
                setState((s) => ({
                  ...s,
                  currentScreen: 'chats',
                  selectedChat: null,
                  messageScrollOffset: 0,
                }));
              }
              loadChats(state.selectedAccount);
              break;
            }
          }
        });
        wsRef.current = ws;
      } catch (e) {
        console.warn('[GlassesUI] WebSocket connection failed:', e);
        // Schedule reconnect
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (ws) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [beeper, state.demoMode, state.selectedChat, state.selectedAccount]);

  useEffect(() => {
    return () => {
      stopVoiceReply(true);
    };
  }, [stopVoiceReply]);

  // Persist state changes to storage
  useEffect(() => {
    const persistState = async () => {
      await saveState({
        selectedAccount: state.selectedAccount,
        selectedChat: state.selectedChat,
        chatScrollPosition: state.messageScrollOffset,
      });
    };
    persistState();
  }, [state.selectedAccount, state.selectedChat, state.messageScrollOffset]);

  // Handle selection
  // Note: highlightedIndex comes from nav state (useGlasses), not app state
  const handleSelect = useCallback(
    (s: AppState, highlightedIndex: number): Partial<AppState> => {
      const updates: Partial<AppState> = {};

      switch (s.currentScreen) {
        case "accounts": {
          // "All Chats" is index 0
          if (highlightedIndex === 0) {
            updates.selectedAccount = null;
          } else {
            // Find the account at this index
            const seen = new Set<string>();
            let itemIdx = 1;
            for (const account of s.accounts) {
              if (!seen.has(account.accountID)) {
                seen.add(account.accountID);
                if (itemIdx === highlightedIndex) {
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
          if (highlightedIndex < s.chats.length) {
            const chat = s.chats[highlightedIndex];
            updates.currentScreen = "messages";
            updates.selectedChat = chat.id;
            updates.isLoading = true;
            updates.selectedMessageIndex = 0;
            // messageScrollOffset will be set to max (bottom) in loadMessages

            loadMessages(chat.id);
          }
          break;
        }

        case "messages": {
          // Always go to quick reply - scroll position doesn't matter
          updates.currentScreen = "quickReply";
          updates.highlightedIndex = 0;
          break;
        }

        case "quickReply": {
          if (highlightedIndex < QUICK_REPLIES.length) {
            const reply = QUICK_REPLIES[highlightedIndex];
            if (reply === "Voice") {
              updates.currentScreen = "voiceReply";
              updates.voiceStatus = "Starting mic...";
              updates.voiceAudioBytes = 0;
              startVoiceReply();
            } else {
              sendMessage(reply);
              updates.currentScreen = "messages";
              updates.highlightedIndex = 0;
              updates.voiceStatus = null;
              updates.voiceAudioBytes = 0;
            }
          } else {
            // Cancel - go back
            updates.currentScreen = "messages";
            updates.voiceStatus = null;
            updates.voiceAudioBytes = 0;
          }
          break;
        }

        case "voiceReply": {
          stopVoiceReply(true);
          updates.currentScreen = "quickReply";
          updates.voiceStatus = null;
          updates.voiceAudioBytes = 0;
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
        updates.messageScrollOffset = 0; // Reset scroll for next visit
        break;
      case "quickReply":
        updates.currentScreen = "messages";
        updates.voiceStatus = null;
        updates.voiceAudioBytes = 0;
        break;
      case "voiceReply":
        stopVoiceReply(true);
        updates.currentScreen = "quickReply";
        updates.voiceStatus = null;
        updates.voiceAudioBytes = 0;
        break;
    }

    return updates;
  }, [stopVoiceReply]);

  // Load chats
  function loadChats(accountId: string | null) {
    async function doLoad() {
      // In demo mode, always use demo data
      if (state.demoMode) {
        setState((s) => ({
          ...s,
          chats: getDemoChats(),
          isLoading: false,
        }));
        return;
      }
      
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
      // In demo mode, always use demo data
      if (state.demoMode) {
        const demoMessages = getDemoMessages();
        const initialScroll = getMaxScrollForMessages(demoMessages);
        
        setState((s) => ({
          ...s,
          messages: demoMessages,
          isLoading: false,
          highlightedIndex: 0,
          messageScrollOffset: initialScroll,
        }));
        return;
      }
      
      try {
        let messages: BeeperMessage[] = [];
        if (beeper) {
          const result = await beeper.listMessages(chatId);
          messages = result.messages.reverse();
        }
        const finalMessages =
          messages.length > 0 ? messages : getDemoMessages();

        // Start at the position that fills the screen (latest message at bottom)
        // getMaxScrollForMessages returns the scroll offset that shows maximum messages
        const initialScroll = getMaxScrollForMessages(finalMessages);

        setState((s) => ({
          ...s,
          messages: finalMessages,
          isLoading: false,
          highlightedIndex: 0,
          messageScrollOffset: initialScroll,
        }));
      } catch {
        const demoMessages = getDemoMessages();
        const initialScroll = getMaxScrollForMessages(demoMessages);

        setState((s) => ({
          ...s,
          messages: demoMessages,
          isLoading: false,
          highlightedIndex: 0,
          messageScrollOffset: initialScroll,
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
          console.log("[GlassesUI] Message sent, reloading messages:", text);
          
          // Set suppress flag to prevent WebSocket from triggering another loadMessages
          suppressReloadRef.current = true;
          if (suppressReloadTimeoutRef.current) {
            clearTimeout(suppressReloadTimeoutRef.current);
          }
          suppressReloadTimeoutRef.current = setTimeout(() => {
            suppressReloadRef.current = false;
            suppressReloadTimeoutRef.current = null;
          }, 2000); // Suppress for 2 seconds
          
          loadMessages(state.selectedChat);
        } catch (e) {
          console.error("[GlassesUI] Send failed:", e);
          // Reload messages on failure to clear any pending state
          loadMessages(state.selectedChat);
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
        case "voiceReply":
          lines = buildVoiceReplyDisplay(snapshot);
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
  // Note: We use a ref to access latest handlers to avoid stale closure issues
  const handleSelectRef = useRef(handleSelect);
  const handleBackRef = useRef(handleBack);
  
  // Update refs when handlers change
  useEffect(() => {
    handleSelectRef.current = handleSelect;
  }, [handleSelect]);
  
  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);
  
  const onGlassAction = useCallback(
    (
      action: GlassAction,
      nav: GlassNavState,
      snapshot: AppState,
    ): GlassNavState => {
      switch (action.type) {
        case "HIGHLIGHT_MOVE": {
          // Handle scrolling in messages screen
          if (snapshot.currentScreen === "messages") {
            const messages = snapshot.messages;
            if (messages.length === 0) return nav;
            
            const currentScroll = snapshot.messageScrollOffset;
            // Calculate max scroll based on actual display capacity
            const maxScroll = getMaxScrollForMessages(messages);
            
            // Block scrolling beyond boundaries
            if (action.direction === "down" && currentScroll >= maxScroll) {
              return nav; // Already at bottom, do nothing
            }
            if (action.direction === "up" && currentScroll <= 0) {
              return nav; // Already at top, do nothing
            }
            
            const newScroll = currentScroll + (action.direction === "down" ? 1 : -1);
            setState((s) => ({ ...s, messageScrollOffset: newScroll }));
            return nav;
          }

          // Normal highlight navigation for other screens
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
          // Track clicks for demo mode easter egg
          const now = Date.now();
          clickTimestamps.current.push(now);
          clickTimestamps.current = clickTimestamps.current.filter(
            t => now - t < DEMO_MODE_WINDOW_MS
          );
          
          // Check for 5 rapid clicks to toggle demo mode
          if (clickTimestamps.current.length >= DEMO_MODE_CLICKS) {
            clickTimestamps.current = [];
            setState((s) => {
              const newDemoMode = !s.demoMode;
              console.log(`[GlassesUI] Demo mode ${newDemoMode ? 'ENABLED' : 'DISABLED'}`);
              // Reset to accounts screen when toggling demo mode
              return { 
                ...s, 
                demoMode: newDemoMode,
                currentScreen: "accounts",
                selectedAccount: null,
                selectedChat: null,
                accounts: newDemoMode ? [] : s.accounts,
                chats: newDemoMode ? [] : s.chats,
                messages: newDemoMode ? [] : s.messages,
              };
            });
            return nav;
          }
          
          // Use ref to get latest handler and pass nav.highlightedIndex (source of truth)
          setState((s) => {
            const updates = handleSelectRef.current(s, nav.highlightedIndex);
            return { ...s, ...updates };
          });
          return nav;
        }

        case "GO_BACK": {
          setState((s) => {
            const updates = handleBackRef.current(s);
            return { ...s, ...updates };
          });
          return nav;
        }
      }
    },
    [], // Empty deps - we use refs to access latest handlers
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
