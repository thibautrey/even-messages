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
import { mapGlassEvent } from "even-toolkit/action-map";
import { buildActionBar, buildStaticActionBar } from "even-toolkit/action-bar";
import { bindKeyboard } from "even-toolkit/keyboard";
import { useCallback, useEffect, useState, useRef } from "react";

import { buildHeaderLine } from "even-toolkit/text-utils";
import { line } from "even-toolkit/types";
import { useFlashPhase } from "even-toolkit/useFlashPhase";
import { useGlasses } from "even-toolkit/useGlasses";
import {
  CreateStartUpPageContainer,
  waitForEvenAppBridge,
  type EvenAppBridge,
  type EvenHubEvent,
  ImageContainerProperty,
  ImageRawDataUpdate,
  ListContainerProperty,
  ListItemContainerProperty,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
} from "@evenrealities/even_hub_sdk";
import { getServiceIcon } from "./platformIcons";
import {
  getChatIconStripPng,
  CHAT_ICON_X,
  CHAT_ICON_START_Y,
  CHAT_ICON_WIDTH,
  CHAT_ROW_HEIGHT,
} from "./platformImages";
import type { SpeechApiConfig } from "../services";

// ═══════════════════════════════════════════════════════════════
// DISPLAY CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Even G2: 576px wide, ~288px tall
// Font: 22px Courier New monospace (~12px per char)
// Visible width: ~48 chars, but leaving padding, use 40 chars
const MAX_VISIBLE_ITEMS = 8; // Max items visible on screen
const DISPLAY_WIDTH = 60; // Max characters per line
const DISPLAY_LINES = 8; // Max lines on Even G2 display (288px / ~40px per line)
const STICKY_FOOTER_LINES = 2; // separator + bottom action/menu line
const SEPARATOR_LINE = "----------------------------------------"; // 40 dashes
const GLASSES_DISPLAY_WIDTH = 576;
const GLASSES_DISPLAY_HEIGHT = 288;
const CHAT_TEXT_PREFIX = "    ";
const ENABLE_CUSTOM_GLASSES_RENDERER = false;

const BASE_PAGE_CONTAINER = {
  OVERLAY_ID: 1,
  OVERLAY_NAME: "overlay",
  TEXT_ID: 2,
  TEXT_NAME: "main-text",
  CHAT_IMAGE_ID: 3,
  CHAT_IMAGE_NAME: "chat-icons",
} as const;

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

const QUICK_REPLY_CANCEL = "Cancel";
const VOICE_NOT_CONFIGURED_STATUS = "Speech not configured in Settings";
const VOICE_NOT_SUPPORTED_STATUS = "Live mic transcription unavailable";

const NATIVE_REPLY_CONTAINER = {
  QUICK_TITLE_ID: 201,
  QUICK_LIST_ID: 202,
  VOICE_CARD_ID: 211,
  VOICE_SEND_ID: 212,
  QUICK_TITLE_NAME: "reply-title",
  QUICK_LIST_NAME: "reply-list",
  VOICE_CARD_NAME: "voice-card",
  VOICE_SEND_NAME: "voice-send",
} as const;

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
  voiceTranscript: string;
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

function getVisibleChatWindow(
  chats: BeeperChat[],
  highlightedIdx: number,
): { start: number; visible: BeeperChat[] } {
  const maxItems = MAX_VISIBLE_ITEMS - 2; // Leave room for header and action bar
  const maxStart = Math.max(0, chats.length - maxItems);
  const start = Math.max(0, Math.min(maxStart, highlightedIdx - 1));

  return {
    start,
    visible: chats.slice(start, start + maxItems),
  };
}

function buildGlassesText(lines: DisplayLine[]): string {
  return lines
    .map((entry) => {
      if (entry.style === "separator") {
        return "─".repeat(44);
      }
      if (entry.style === "inverted" || entry.inverted) {
        return `▶ ${entry.text}`;
      }
      return `  ${entry.text}`;
    })
    .join("\n");
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
      return Math.max(0, QUICK_REPLIES.length - 1);
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

  if (state.isLoading) {
    // Show loading indicator
    lines.push(line("Loading...", "normal"));
    lines.push(line("", "normal"));
    lines.push(line("", "normal"));
    lines.push(line("", "normal"));
  } else if (state.chats.length === 0) {
    lines.push(line("No chats found", "normal"));
  } else {
    const { start, visible } = getVisibleChatWindow(state.chats, highlightedIdx);

    visible.forEach((chat, idx) => {
      const globalIdx = start + idx;
      const isSelected = globalIdx === highlightedIdx;

      // Format: > Contact Name..............[!2]
      const name = truncateName(chat.title, 24);
      const namePadded = padRight(name, 24);
      const suffix =
        chat.unreadCount > 0 ? `${ICONS.UNREAD}${chat.unreadCount}]` : "";
      const suffixPadded = padRight(suffix, 6);

      const lineText = `${isSelected ? ICONS.SELECTED : " "} ${CHAT_TEXT_PREFIX}${namePadded}${suffixPadded}`;
      lines.push(line(lineText, isSelected ? "inverted" : "normal"));
    });
  }

  lines.push(sep());

  // Show current position in list
  const posText = state.isLoading ? "" : `${highlightedIdx + 1}/${state.chats.length}`;
  lines.push(line(buildStaticActionBar(["Back"], -1) + (posText ? "  " + posText : ""), "meta"));

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

  // Show loading indicator if loading
  if (state.isLoading) {
    lines.push(line("Loading messages...", "normal"));
    lines.push(line("", "normal"));
    lines.push(line("", "normal"));
    lines.push(line("", "normal"));
    lines.push(line("", "normal"));
    lines.push(sep());
    lines.push(line(buildStaticActionBar(["Back"], 0), "meta"));
    return lines;
  }

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

  const msg = state.messages[state.selectedMessageIndex];
  const sender = msg
    ? truncateName(msg.senderName || "Unknown", 16)
    : "Unknown";
  lines.push(line(buildHeaderLine(`Reply: ${sender}`, ""), "inverted"));

  const selectedReply = QUICK_REPLIES[Math.min(highlightedIdx, QUICK_REPLIES.length - 1)] || "";
  const availableReplyRows = Math.max(0, DISPLAY_LINES - 1 - STICKY_FOOTER_LINES);
  const optionLines: DisplayLine[] = QUICK_REPLIES.map((reply, idx) => {
    const isSelected = idx === highlightedIdx;
    const prefix = isSelected ? ICONS.SELECTED : " ";
    return line(`${prefix} ${truncate(reply, 34)}`, isSelected ? "inverted" : "normal");
  });

  const visibleCount = Math.min(optionLines.length, availableReplyRows);
  const windowStart = Math.max(
    0,
    Math.min(
      highlightedIdx - Math.floor(visibleCount / 2),
      Math.max(0, optionLines.length - visibleCount),
    ),
  );

  lines.push(...optionLines.slice(windowStart, windowStart + visibleCount));
  lines.push(sep());
  const footerLabel =
    selectedReply === "Voice"
      ? "Click to speak"
      : `Send : ${truncate(selectedReply, 34)}`;
  lines.push(line(footerLabel, "meta"));

  return lines;
}

function buildVoiceReplyDisplay(state: AppState): DisplayLine[] {
  const lines: DisplayLine[] = [];
  const msg = state.messages[state.selectedMessageIndex];
  const sender = msg
    ? truncateName(msg.senderName || "Unknown", 16)
    : "Unknown";
  const status = state.voiceStatus || "Speak now";
  const isVoiceReady = state.voiceTranscript.trim().length > 0;
  const isSpeechUnavailable =
    status === VOICE_NOT_CONFIGURED_STATUS || status === VOICE_NOT_SUPPORTED_STATUS;

  lines.push(line(buildHeaderLine(`Voice: ${sender}`, ""), "inverted"));

  const voiceBody = state.voiceTranscript || status;
  const bodyLines = [
    line(
      isVoiceReady ? "Review reply" : isSpeechUnavailable ? "Voice unavailable" : "Listening...",
      "normal",
    ),
    line(truncate(voiceBody, 38), "normal"),
  ];
  const availableBodyLines = Math.max(0, DISPLAY_LINES - 1 - STICKY_FOOTER_LINES);

  lines.push(...bodyLines.slice(0, availableBodyLines));
  lines.push(sep());
  lines.push(
    line(
      isVoiceReady
        ? "Click to send"
        : isSpeechUnavailable
          ? status === VOICE_NOT_CONFIGURED_STATUS
            ? "Configure Speech in Settings"
            : "Live mic capture not available"
          : "Speak now",
      "meta",
    ),
  );

  return lines;
}

function getSelectedSender(state: AppState): string {
  const msg = state.messages[state.selectedMessageIndex];
  return truncateName(msg?.senderName || "Unknown", 20);
}

function buildQuickReplyItems(): string[] {
  return [...QUICK_REPLIES, QUICK_REPLY_CANCEL].map((item) =>
    truncate(stripUnsupportedChars(item), 64),
  );
}

function buildVoiceCardContent(state: AppState): string {
  const sender = getSelectedSender(state);
  const transcript = stripUnsupportedChars(state.voiceTranscript.trim());
  const status = stripUnsupportedChars(state.voiceStatus || "Speak now");
  const body = transcript || status;

  return truncate(`Voice reply\n${sender}\n\n${body}`, 950);
}

function areMessagesEqual(a: BeeperMessage[], b: BeeperMessage[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.sortKey !== right.sortKey ||
      left.timestamp !== right.timestamp ||
      left.text !== right.text ||
      left.senderName !== right.senderName ||
      left.isSender !== right.isSender ||
      left.type !== right.type
    ) {
      return false;
    }
  }

  return true;
}

function areChatsEqual(a: BeeperChat[], b: BeeperChat[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.accountID !== right.accountID ||
      left.title !== right.title ||
      left.lastActivity !== right.lastActivity ||
      left.unreadCount !== right.unreadCount ||
      left.lastReadMessageSortKey !== right.lastReadMessageSortKey ||
      left.isArchived !== right.isArchived ||
      left.isMuted !== right.isMuted ||
      left.isPinned !== right.isPinned
    ) {
      return false;
    }
  }

  return true;
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
  speechConfig,
}: {
  beeperConfig: { baseUrl: string; token: string } | null;
  speechConfig?: SpeechApiConfig | null;
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
    voiceTranscript: "",
    voiceAudioBytes: 0,
  });

  // Ref to store saved state for use in effects
  const savedStateRef = useRef<SavedState>({ selectedAccount: null, selectedChat: null });
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isVoiceCancelledRef = useRef<boolean>(false);
  const evenHubUnsubscribeRef = useRef<(() => void) | null>(null);
  const nativeOverlayEventUnsubscribeRef = useRef<(() => void) | null>(null);
  const nativeOverlayScreenRef = useRef<Screen | null>(null);

  const messagesPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatsPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMessagesPollInFlightRef = useRef<boolean>(false);
  const isChatsPollInFlightRef = useRef<boolean>(false);
  const stateRef = useRef<AppState>(state);
  const navRef = useRef<GlassNavState>({
    highlightedIndex: 0,
    screen: state.currentScreen,
  });
  const previousScreenRef = useRef<Screen>(state.currentScreen);
  const glassesBridgeRef = useRef<EvenAppBridge | null>(null);
  const glassesInitializedRef = useRef<boolean>(false);
  const glassesLayoutRef = useRef<"text" | "chats" | null>(null);
  const glassesTextRef = useRef<string>("");
  const glassesChatIconSignatureRef = useRef<string>("");
  const glassesChatIconsEnabledRef = useRef<boolean>(false);
  const isRenderingGlassesRef = useRef<boolean>(false);
  const pendingGlassesRenderRef = useRef<boolean>(false);
  const [navVersion, setNavVersion] = useState(0);

  // Ref to prevent duplicate message refreshes right after sending
  const suppressReloadRef = useRef<boolean>(false);
  const suppressReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beeper = beeperConfig ? new BeeperClient(beeperConfig) : null;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  const stopNativeOverlayEvents = useCallback(() => {
    if (nativeOverlayEventUnsubscribeRef.current) {
      nativeOverlayEventUnsubscribeRef.current();
      nativeOverlayEventUnsubscribeRef.current = null;
    }
    nativeOverlayScreenRef.current = null;
  }, []);

  const hideNativeOverlay = useCallback(async () => {
    const hadOverlay =
      nativeOverlayScreenRef.current !== null ||
      nativeOverlayEventUnsubscribeRef.current !== null;

    stopNativeOverlayEvents();

    if (!hadOverlay) {
      return;
    }

    const bridge = await getBridge();
    if (!bridge) return;

    try {
      await bridge.rebuildPageContainer(
        new RebuildPageContainer({
          containerTotalNum: 0,
          listObject: [],
          textObject: [],
          imageObject: [],
        }),
      );
    } catch (e) {
      console.warn("[GlassesUI] Failed to clear native overlay:", e);
    }
  }, [stopNativeOverlayEvents]);

  const dismissVoiceReply = useCallback(async () => {
    await stopVoiceReply(true);
    await hideNativeOverlay();
    setState((s) => ({
      ...s,
      currentScreen: "messages",
      highlightedIndex: 0,
      voiceStatus: null,
      voiceTranscript: "",
      voiceAudioBytes: 0,
    }));
  }, [hideNativeOverlay, stopVoiceReply]);

  const submitVoiceReply = useCallback(async () => {
    const transcript = state.voiceTranscript.trim();
    if (!transcript) {
      return;
    }

    await stopVoiceReply(false);
    await hideNativeOverlay();
    sendMessage(transcript);
    setState((s) => ({
      ...s,
      currentScreen: "messages",
      highlightedIndex: 0,
      voiceStatus: null,
      voiceTranscript: "",
      voiceAudioBytes: 0,
    }));
  }, [hideNativeOverlay, state.voiceTranscript, stopVoiceReply]);

  const startVoiceReply = useCallback(async () => {
    if (!speechConfig?.baseUrl || !speechConfig?.token || !speechConfig?.model) {
      setState((s) => ({
        ...s,
        currentScreen: "voiceReply",
        voiceStatus: VOICE_NOT_CONFIGURED_STATUS,
        voiceTranscript: "",
        voiceAudioBytes: 0,
      }));
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setState((s) => ({
        ...s,
        currentScreen: "voiceReply",
        voiceStatus: VOICE_NOT_SUPPORTED_STATUS,
        voiceTranscript: "",
        voiceAudioBytes: 0,
      }));
      return;
    }

    isVoiceCancelledRef.current = false;
    setState((s) => ({
      ...s,
      currentScreen: "voiceReply",
      voiceStatus: "Speak now",
      voiceTranscript: "",
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

      setState((s) => ({
        ...s,
        voiceStatus: result.isFinal ? "Ready to send" : "Listening...",
        voiceTranscript: transcript,
      }));
    };

    recognition.onerror = (event) => {
      const errorMessage = event.error || "Voice failed";
      void stopVoiceReply(false);
      setState((s) => ({
        ...s,
        currentScreen: "voiceReply",
        voiceStatus: errorMessage,
        voiceTranscript: "",
        voiceAudioBytes: 0,
      }));
    };

    recognition.onend = () => {
      speechRecognitionRef.current = null;
      if (isVoiceCancelledRef.current) {
        setState((s) => ({ ...s, voiceStatus: null, voiceTranscript: "", voiceAudioBytes: 0 }));
        return;
      }

      setState((s) => ({
        ...s,
        voiceStatus: s.voiceTranscript ? "Ready to send" : "Speak now",
      }));
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  }, [speechConfig, stopVoiceReply]);

  const showQuickReplyOverlay = useCallback(async () => {
    const bridge = await getBridge();
    if (!bridge) return;

    const sender = getSelectedSender(stateRef.current);
    const quickReplyTitle = `Reply to ${sender}`;
    const replyItems = buildQuickReplyItems();
    const quickReplyTitleContainer = new TextContainerProperty({
      containerID: NATIVE_REPLY_CONTAINER.QUICK_TITLE_ID,
      containerName: NATIVE_REPLY_CONTAINER.QUICK_TITLE_NAME,
      xPosition: 32,
      yPosition: 22,
      width: 512,
      height: 34,
      content: truncate(quickReplyTitle, 80),
      borderWidth: 0,
      paddingLength: 0,
      isEventCapture: 0,
    });
    const quickReplyListItems = new ListItemContainerProperty({
      itemCount: replyItems.length,
      itemWidth: 0,
      isItemSelectBorderEn: 1,
      itemName: replyItems,
    });
    const quickReplyListContainer = new ListContainerProperty({
      containerID: NATIVE_REPLY_CONTAINER.QUICK_LIST_ID,
      containerName: NATIVE_REPLY_CONTAINER.QUICK_LIST_NAME,
      xPosition: 24,
      yPosition: 58,
      width: 528,
      height: 200,
      borderWidth: 1,
      borderColor: 15,
      borderRdaius: 8,
      paddingLength: 8,
      isEventCapture: 1,
      itemContainer: quickReplyListItems,
    });

    const rebuildContainer = new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [quickReplyTitleContainer],
      listObject: [quickReplyListContainer],
      imageObject: [],
    });

    await bridge.rebuildPageContainer(rebuildContainer);

    stopNativeOverlayEvents();
    nativeOverlayScreenRef.current = "quickReply";
    nativeOverlayEventUnsubscribeRef.current = bridge.onEvenHubEvent((event: EvenHubEvent) => {
      if (nativeOverlayScreenRef.current !== "quickReply") {
        return;
      }

      const action = mapGlassEvent(event);
      if (action?.type === "GO_BACK") {
        void hideNativeOverlay();
        setState((s) => ({
          ...s,
          currentScreen: "messages",
          highlightedIndex: 0,
        }));
        return;
      }

      if (!event.listEvent) {
        return;
      }

      const selectedName = event.listEvent.currentSelectItemName;
      if (!selectedName) {
        return;
      }
      if (selectedName === QUICK_REPLY_CANCEL) {
        void hideNativeOverlay();
        setState((s) => ({
          ...s,
          currentScreen: "messages",
          highlightedIndex: 0,
        }));
        return;
      }

      if (selectedName === "Voice") {
        setState((s) => ({
          ...s,
          currentScreen: "voiceReply",
          voiceStatus: "Starting mic...",
          voiceTranscript: "",
          voiceAudioBytes: 0,
        }));
        void startVoiceReply();
        return;
      }

      void hideNativeOverlay();
      sendMessage(selectedName);
      setState((s) => ({
        ...s,
        currentScreen: "messages",
        highlightedIndex: 0,
      }));
    });
  }, [hideNativeOverlay, startVoiceReply, stopNativeOverlayEvents]);

  const showVoiceReplyOverlay = useCallback(async () => {
    const bridge = await getBridge();
    if (!bridge) return;

    const voiceContent = buildVoiceCardContent(state);
    const showSend = state.voiceTranscript.trim().length > 0;
    const containerTotalNum = showSend ? 2 : 1;
    const voiceCardContainer = new TextContainerProperty({
      containerID: NATIVE_REPLY_CONTAINER.VOICE_CARD_ID,
      containerName: NATIVE_REPLY_CONTAINER.VOICE_CARD_NAME,
      xPosition: 64,
      yPosition: 28,
      width: 448,
      height: 180,
      content: voiceContent,
      borderWidth: 2,
      borderColor: 15,
      borderRdaius: 10,
      paddingLength: 14,
      isEventCapture: showSend ? 0 : 1,
    });
    const sendButtonItems = new ListItemContainerProperty({
      itemCount: 1,
      itemWidth: 0,
      isItemSelectBorderEn: 1,
      itemName: ["Send"],
    });
    const sendButtonContainer = new ListContainerProperty({
      containerID: NATIVE_REPLY_CONTAINER.VOICE_SEND_ID,
      containerName: NATIVE_REPLY_CONTAINER.VOICE_SEND_NAME,
      xPosition: 176,
      yPosition: 218,
      width: 224,
      height: 42,
      borderWidth: 1,
      borderColor: 15,
      borderRdaius: 10,
      paddingLength: 6,
      isEventCapture: 1,
      itemContainer: sendButtonItems,
    });

    const rebuildContainer = new RebuildPageContainer({
      containerTotalNum,
      textObject: [voiceCardContainer],
      listObject: showSend ? [sendButtonContainer] : [],
      imageObject: [],
    });

    await bridge.rebuildPageContainer(rebuildContainer);

    stopNativeOverlayEvents();
    nativeOverlayScreenRef.current = "voiceReply";
    nativeOverlayEventUnsubscribeRef.current = bridge.onEvenHubEvent((event: EvenHubEvent) => {
      if (nativeOverlayScreenRef.current !== "voiceReply") {
        return;
      }

      if (event.listEvent && event.listEvent.currentSelectItemName === "Send") {
        void submitVoiceReply();
        return;
      }

      if (event.textEvent || event.sysEvent) {
        void dismissVoiceReply();
      }
    });
  }, [dismissVoiceReply, state, stopNativeOverlayEvents, submitVoiceReply]);

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
        currentScreen: savedState.selectedChat ? "messages" : "chats",
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
              void loadMessages(savedState.selectedChat);
            } else {
              // Chat no longer exists, go back to chats list
              await saveState({ selectedAccount: savedState.selectedAccount, selectedChat: null });
              setState((s) => ({
                ...s,
                currentScreen: "chats",
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
            void loadMessages(savedState.selectedChat);
          } else {
            // Chat no longer exists, go back to chats list
            await saveState({ selectedAccount: savedState.selectedAccount, selectedChat: null });
            setState((s) => ({
              ...s,
              currentScreen: "chats",
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
          void loadMessages(savedChatId);
        } else {
          // Chat no longer exists, clear saved state and show chats for the account
          await saveState({ selectedAccount: savedAccountId, selectedChat: null });
          setState((s) => ({
            ...s,
            accounts,
            chats: loadedChats,
            selectedAccount: savedAccountId,
            selectedChat: null,
            currentScreen: "chats",
            isLoading: false,
          }));
        }
      } catch (err) {
        console.error("[GlassesUI] Failed to restore saved chat:", err);
        // Fall back to the conversations list
        await saveState({ selectedAccount: savedAccountId, selectedChat: null });
        setState((s) => ({
          ...s,
          accounts,
          chats: [],
          currentScreen: "chats",
          selectedAccount: savedAccountId,
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

  // Poll Beeper instead of relying on the desktop WebSocket.
  useEffect(() => {
    if (!beeper || state.demoMode || !state.selectedChat) return;

    const selectedChatId = state.selectedChat;

    const pollMessages = async () => {
      if (isMessagesPollInFlightRef.current) return;
      isMessagesPollInFlightRef.current = true;

      try {
        if (nativeOverlayScreenRef.current) {
          return;
        }
        if (stateRef.current.currentScreen !== "messages") {
          return;
        }
        if (suppressReloadRef.current) {
          return;
        }
        await loadMessages(selectedChatId, { preserveScroll: true, silent: true });
      } catch (e) {
        console.warn('[GlassesUI] Message polling failed:', e);
      } finally {
        isMessagesPollInFlightRef.current = false;
      }
    };

    pollMessages();
    messagesPollIntervalRef.current = setInterval(pollMessages, 1000);

    return () => {
      if (messagesPollIntervalRef.current) {
        clearInterval(messagesPollIntervalRef.current);
        messagesPollIntervalRef.current = null;
      }
      isMessagesPollInFlightRef.current = false;
    };
  }, [beeper, state.demoMode, state.selectedChat]);

  useEffect(() => {
    if (!beeper || state.demoMode) return;

    const pollChats = async () => {
      if (isChatsPollInFlightRef.current) return;
      isChatsPollInFlightRef.current = true;

      try {
        if (nativeOverlayScreenRef.current) {
          return;
        }
        await loadChats(state.selectedAccount, { silent: true, preserveExisting: true });
      } catch (e) {
        console.warn('[GlassesUI] Chat polling failed:', e);
      } finally {
        isChatsPollInFlightRef.current = false;
      }
    };

    pollChats();
    chatsPollIntervalRef.current = setInterval(pollChats, 2000);

    return () => {
      if (chatsPollIntervalRef.current) {
        clearInterval(chatsPollIntervalRef.current);
        chatsPollIntervalRef.current = null;
      }
      isChatsPollInFlightRef.current = false;
    };
  }, [beeper, state.demoMode, state.selectedAccount]);

  useEffect(() => {
    return () => {
      stopVoiceReply(true);
    };
  }, [stopVoiceReply]);

  useEffect(() => {
    if (!ENABLE_CUSTOM_GLASSES_RENDERER) {
      if (nativeOverlayScreenRef.current) {
        void hideNativeOverlay();
      }
      return;
    }

    if (state.currentScreen === "quickReply") {
      void showQuickReplyOverlay();
      return;
    }

    if (state.currentScreen === "voiceReply") {
      void showVoiceReplyOverlay();
      return;
    }

    if (!nativeOverlayScreenRef.current) {
      return;
    }

    void hideNativeOverlay();
  }, [
    hideNativeOverlay,
    showQuickReplyOverlay,
    showVoiceReplyOverlay,
    state.currentScreen,
    state.selectedMessageIndex,
    state.voiceStatus,
    state.voiceTranscript,
  ]);

  useEffect(() => {
    return () => {
      stopNativeOverlayEvents();
    };
  }, [stopNativeOverlayEvents]);

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
          void loadChats(updates.selectedAccount ?? null);
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

            void loadMessages(chat.id);
          }
          break;
        }

        case "messages": {
          updates.currentScreen = "quickReply";
          updates.highlightedIndex = 0;
          navRef.current = {
            ...navRef.current,
            highlightedIndex: 0,
            screen: "quickReply",
          };
          break;
        }

        case "quickReply": {
          const selectedReply = QUICK_REPLIES[highlightedIndex];
          if (!selectedReply) {
            break;
          }

          if (selectedReply === "Voice") {
            updates.currentScreen = "voiceReply";
            updates.highlightedIndex = 0;
            updates.voiceStatus = "Starting mic...";
            updates.voiceTranscript = "";
            updates.voiceAudioBytes = 0;
            void startVoiceReply();
            break;
          }

          sendMessage(selectedReply);
          updates.currentScreen = "messages";
          updates.highlightedIndex = 0;
          break;
        }

        case "voiceReply": {
          if (s.voiceTranscript.trim()) {
            void submitVoiceReply();
          }
          updates.highlightedIndex = 0;
          break;
        }
      }

      return updates;
    },
    [beeper, startVoiceReply, submitVoiceReply],
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
        updates.voiceTranscript = "";
        updates.voiceAudioBytes = 0;
        break;
      case "voiceReply":
        void dismissVoiceReply();
        updates.voiceStatus = null;
        updates.voiceTranscript = "";
        updates.voiceAudioBytes = 0;
        break;
    }

    return updates;
  }, [dismissVoiceReply]);

  // Load chats
  async function loadChats(
    accountId: string | null,
    options?: { silent?: boolean; preserveExisting?: boolean },
  ) {
    if (!options?.silent) {
      setState((s) => ({
        ...s,
        chats: options?.preserveExisting ? s.chats : [],
        isLoading: true,
      }));
    }

    if (state.demoMode) {
      const demoChats = getDemoChats();
      setState((s) => {
        const sameChats = areChatsEqual(s.chats, demoChats);
        if (sameChats && s.isLoading === false) {
          return s;
        }

        return {
          ...s,
          chats: demoChats,
          isLoading: false,
        };
      });
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
      const finalChats = chats.length > 0 ? chats : getDemoChats();
      setState((s) => {
        const sameChats = areChatsEqual(s.chats, finalChats);
        const sameLoading = options?.silent ? true : s.isLoading === false;

        if (sameChats && sameLoading) {
          return s;
        }

        return {
          ...s,
          chats: finalChats,
          isLoading: options?.silent ? s.isLoading : false,
        };
      });
    } catch {
      const demoChats = getDemoChats();
      setState((s) => {
        const sameChats = areChatsEqual(s.chats, demoChats);
        const sameLoading = options?.silent ? true : s.isLoading === false;

        if (sameChats && sameLoading) {
          return s;
        }

        return {
          ...s,
          chats: demoChats,
          isLoading: options?.silent ? s.isLoading : false,
        };
      });
    }
  }

  // Load messages
  async function loadMessages(
    chatId: string,
    options?: { preserveScroll?: boolean; silent?: boolean },
  ) {
    if (!options?.silent) {
      setState((s) => ({
        ...s,
        messages: [],
        isLoading: true,
      }));
    }

    if (state.demoMode) {
      const demoMessages = getDemoMessages();
      const initialScroll = getMaxScrollForMessages(demoMessages);

      setState((s) => {
        const nextScroll = options?.preserveScroll
          ? Math.min(s.messageScrollOffset, initialScroll)
          : initialScroll;
        const sameMessages = areMessagesEqual(s.messages, demoMessages);
        const sameLoading = s.isLoading === false;
        const sameHighlight = options?.silent ? true : s.highlightedIndex === 0;
        const sameScroll = s.messageScrollOffset === nextScroll;

        if (sameMessages && sameLoading && sameHighlight && sameScroll) {
          return s;
        }

        return {
          ...s,
          messages: demoMessages,
          isLoading: false,
          highlightedIndex: options?.silent ? s.highlightedIndex : 0,
          messageScrollOffset: nextScroll,
        };
      });
      return;
    }

    try {
      let messages: BeeperMessage[] = [];
      if (beeper) {
        const result = await beeper.listMessages(chatId);
        messages = result.messages.reverse();
      }
      const finalMessages = messages.length > 0 ? messages : getDemoMessages();
      const initialScroll = getMaxScrollForMessages(finalMessages);

      setState((s) => {
        const nextScroll = options?.preserveScroll
          ? Math.min(s.messageScrollOffset, initialScroll)
          : initialScroll;
        const sameMessages = areMessagesEqual(s.messages, finalMessages);
        const sameLoading = options?.silent ? true : s.isLoading === false;
        const sameHighlight = options?.silent ? true : s.highlightedIndex === 0;
        const sameScroll = s.messageScrollOffset === nextScroll;

        if (sameMessages && sameLoading && sameHighlight && sameScroll) {
          return s;
        }

        return {
          ...s,
          messages: finalMessages,
          isLoading: options?.silent ? s.isLoading : false,
          highlightedIndex: options?.silent ? s.highlightedIndex : 0,
          messageScrollOffset: nextScroll,
        };
      });
    } catch {
      const demoMessages = getDemoMessages();
      const initialScroll = getMaxScrollForMessages(demoMessages);

      setState((s) => {
        const nextScroll = options?.preserveScroll
          ? Math.min(s.messageScrollOffset, initialScroll)
          : initialScroll;
        const sameMessages = areMessagesEqual(s.messages, demoMessages);
        const sameLoading = options?.silent ? true : s.isLoading === false;
        const sameHighlight = options?.silent ? true : s.highlightedIndex === 0;
        const sameScroll = s.messageScrollOffset === nextScroll;

        if (sameMessages && sameLoading && sameHighlight && sameScroll) {
          return s;
        }

        return {
          ...s,
          messages: demoMessages,
          isLoading: options?.silent ? s.isLoading : false,
          highlightedIndex: options?.silent ? s.highlightedIndex : 0,
          messageScrollOffset: nextScroll,
        };
      });
    }
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
          
          void loadMessages(state.selectedChat);
        } catch (e) {
          console.error("[GlassesUI] Send failed:", e);
          // Reload messages on failure to clear any pending state
          void loadMessages(state.selectedChat);
        }
      } else {
        console.log("[GlassesUI] Would send:", text);
      }
    }
    doSend();
  }

  const getDisplayLines = useCallback(
    (snapshot: AppState, nav: GlassNavState): DisplayLine[] => {
      switch (snapshot.currentScreen) {
        case "accounts":
          return buildAccountsDisplay(snapshot, nav.highlightedIndex);
        case "chats":
          return buildChatsDisplay(snapshot, nav.highlightedIndex);
        case "messages":
          return buildMessagesDisplay(snapshot, nav.highlightedIndex, flashPhase);
        case "quickReply":
          return buildQuickReplyDisplay(snapshot, nav.highlightedIndex);
        case "voiceReply":
          return buildVoiceReplyDisplay(snapshot);
        default:
          return [line("Even Messages", "inverted")];
      }
    },
    [flashPhase],
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
      // Native overlays manage their own input lifecycle. If we also let the
      // toolkit bridge process the same gesture, actions like double-click/back
      // get handled twice and the display can end up in an invalid state.
      if (nativeOverlayScreenRef.current) {
        return nav;
      }

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
              // Reset to the conversations list when toggling demo mode
              return { 
                ...s, 
                demoMode: newDemoMode,
                currentScreen: "chats",
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

  const toDisplayData = useCallback(
    (snapshot: AppState, nav: GlassNavState) => ({
      lines: getDisplayLines(snapshot, nav),
    }),
    [getDisplayLines],
  );

  const ensureGlassesStartup = useCallback(async (bridge: EvenAppBridge) => {
    if (glassesInitializedRef.current) {
      return;
    }

    const startupContainer = new CreateStartUpPageContainer({
      containerTotalNum: 2,
      textObject: [
        new TextContainerProperty({
          containerID: BASE_PAGE_CONTAINER.OVERLAY_ID,
          containerName: BASE_PAGE_CONTAINER.OVERLAY_NAME,
          xPosition: 0,
          yPosition: 0,
          width: GLASSES_DISPLAY_WIDTH,
          height: GLASSES_DISPLAY_HEIGHT,
          borderWidth: 0,
          borderColor: 0,
          borderRdaius: 0,
          paddingLength: 0,
          content: "",
          isEventCapture: 1,
        }),
        new TextContainerProperty({
          containerID: BASE_PAGE_CONTAINER.TEXT_ID,
          containerName: BASE_PAGE_CONTAINER.TEXT_NAME,
          xPosition: 0,
          yPosition: 0,
          width: GLASSES_DISPLAY_WIDTH,
          height: GLASSES_DISPLAY_HEIGHT,
          borderWidth: 0,
          borderColor: 0,
          borderRdaius: 0,
          paddingLength: 6,
          content: "",
          isEventCapture: 0,
        }),
      ],
      imageObject: [],
      listObject: [],
    });

    await bridge.createStartUpPageContainer(startupContainer);
    glassesInitializedRef.current = true;
    glassesLayoutRef.current = "text";
  }, []);

  const renderTextPage = useCallback(
    async (bridge: EvenAppBridge, text: string) => {
      if (glassesLayoutRef.current !== "text") {
        await bridge.rebuildPageContainer(
          new RebuildPageContainer({
            containerTotalNum: 2,
            textObject: [
              new TextContainerProperty({
                containerID: BASE_PAGE_CONTAINER.OVERLAY_ID,
                containerName: BASE_PAGE_CONTAINER.OVERLAY_NAME,
                xPosition: 0,
                yPosition: 0,
                width: GLASSES_DISPLAY_WIDTH,
                height: GLASSES_DISPLAY_HEIGHT,
                borderWidth: 0,
                borderColor: 0,
                borderRdaius: 0,
                paddingLength: 0,
                content: "",
                isEventCapture: 1,
              }),
              new TextContainerProperty({
                containerID: BASE_PAGE_CONTAINER.TEXT_ID,
                containerName: BASE_PAGE_CONTAINER.TEXT_NAME,
                xPosition: 0,
                yPosition: 0,
                width: GLASSES_DISPLAY_WIDTH,
                height: GLASSES_DISPLAY_HEIGHT,
                borderWidth: 0,
                borderColor: 0,
                borderRdaius: 0,
                paddingLength: 6,
                content: text,
                isEventCapture: 0,
              }),
            ],
            imageObject: [],
            listObject: [],
          }),
        );
        glassesLayoutRef.current = "text";
        glassesTextRef.current = text;
        glassesChatIconSignatureRef.current = "";
        return;
      }

      if (glassesTextRef.current === text) {
        return;
      }

      await bridge.textContainerUpgrade(
        new TextContainerUpgrade({
          containerID: BASE_PAGE_CONTAINER.TEXT_ID,
          containerName: BASE_PAGE_CONTAINER.TEXT_NAME,
          contentOffset: 0,
          contentLength: 2000,
          content: text,
        }),
      );
      glassesTextRef.current = text;
    },
    [],
  );

  const renderChatsPage = useCallback(
    async (bridge: EvenAppBridge, snapshot: AppState, nav: GlassNavState) => {
      const lines = buildChatsDisplay(snapshot, nav.highlightedIndex);
      const text = buildGlassesText(lines);
      const { visible } = getVisibleChatWindow(snapshot.chats, nav.highlightedIndex);
      const platformIds = visible.map((chat) => chat.accountID);
      const iconSignature = platformIds.join("|");
      const iconRows = MAX_VISIBLE_ITEMS - 2;
      const shouldRenderIcons = glassesChatIconsEnabledRef.current && visible.length > 0;
      const targetLayout: "text" | "chats" = shouldRenderIcons ? "chats" : "text";

      if (targetLayout === "text") {
        await renderTextPage(bridge, text);
        return;
      }

      if (glassesLayoutRef.current !== "chats") {
        await bridge.rebuildPageContainer(
          new RebuildPageContainer({
            containerTotalNum: 3,
            textObject: [
              new TextContainerProperty({
                containerID: BASE_PAGE_CONTAINER.OVERLAY_ID,
                containerName: BASE_PAGE_CONTAINER.OVERLAY_NAME,
                xPosition: 0,
                yPosition: 0,
                width: GLASSES_DISPLAY_WIDTH,
                height: GLASSES_DISPLAY_HEIGHT,
                borderWidth: 0,
                borderColor: 0,
                borderRdaius: 0,
                paddingLength: 0,
                content: "",
                isEventCapture: 1,
              }),
              new TextContainerProperty({
                containerID: BASE_PAGE_CONTAINER.TEXT_ID,
                containerName: BASE_PAGE_CONTAINER.TEXT_NAME,
                xPosition: 0,
                yPosition: 0,
                width: GLASSES_DISPLAY_WIDTH,
                height: GLASSES_DISPLAY_HEIGHT,
                borderWidth: 0,
                borderColor: 0,
                borderRdaius: 0,
                paddingLength: 6,
                content: text,
                isEventCapture: 0,
              }),
            ],
            imageObject: [
              new ImageContainerProperty({
                containerID: BASE_PAGE_CONTAINER.CHAT_IMAGE_ID,
                containerName: BASE_PAGE_CONTAINER.CHAT_IMAGE_NAME,
                xPosition: CHAT_ICON_X,
                yPosition: CHAT_ICON_START_Y,
                width: CHAT_ICON_WIDTH,
                height: iconRows * CHAT_ROW_HEIGHT,
              }),
            ],
            listObject: [],
          }),
        );
        glassesLayoutRef.current = "chats";
        glassesTextRef.current = text;
        glassesChatIconSignatureRef.current = "";
      } else if (glassesTextRef.current !== text) {
        await bridge.textContainerUpgrade(
          new TextContainerUpgrade({
            containerID: BASE_PAGE_CONTAINER.TEXT_ID,
            containerName: BASE_PAGE_CONTAINER.TEXT_NAME,
            contentOffset: 0,
            contentLength: 2000,
            content: text,
          }),
        );
        glassesTextRef.current = text;
      }

      if (glassesChatIconSignatureRef.current === iconSignature) {
        return;
      }

      const iconStripBytes = await getChatIconStripPng(
        platformIds,
        iconRows,
        CHAT_ROW_HEIGHT,
        CHAT_ICON_WIDTH,
      );

      try {
        await bridge.updateImageRawData(
          new ImageRawDataUpdate({
            containerID: BASE_PAGE_CONTAINER.CHAT_IMAGE_ID,
            containerName: BASE_PAGE_CONTAINER.CHAT_IMAGE_NAME,
            imageData: iconStripBytes,
          }),
        );
      } catch (e) {
        glassesChatIconsEnabledRef.current = false;
        glassesLayoutRef.current = null;
        glassesChatIconSignatureRef.current = "";
        console.warn("[GlassesUI] Disabling chat icons after image update failure:", e);
        await renderTextPage(bridge, text);
        return;
      }
      glassesChatIconSignatureRef.current = iconSignature;
    },
    [renderTextPage],
  );

  const flushGlassesDisplay = useCallback(async () => {
    const bridge = glassesBridgeRef.current;
    if (!bridge) {
      return;
    }

    if (nativeOverlayScreenRef.current) {
      return;
    }

    if (isRenderingGlassesRef.current) {
      pendingGlassesRenderRef.current = true;
      return;
    }

    isRenderingGlassesRef.current = true;
    pendingGlassesRenderRef.current = false;

    try {
      await ensureGlassesStartup(bridge);

      const snapshot = stateRef.current;
      const nav = navRef.current;

      if (snapshot.currentScreen === "chats") {
        await renderChatsPage(bridge, snapshot, nav);
      } else {
        const lines = getDisplayLines(snapshot, nav);
        const text = buildGlassesText(lines);
        await renderTextPage(bridge, text);
      }
    } catch (e) {
      console.warn("[GlassesUI] Failed to render glasses display:", e);
    } finally {
      isRenderingGlassesRef.current = false;
      if (pendingGlassesRenderRef.current) {
        pendingGlassesRenderRef.current = false;
        void flushGlassesDisplay();
      }
    }
  }, [ensureGlassesStartup, getDisplayLines, renderChatsPage, renderTextPage]);

  useEffect(() => {
    navRef.current.screen = state.currentScreen;
  }, [state.currentScreen]);

  useEffect(() => {
    if (previousScreenRef.current !== state.currentScreen) {
      navRef.current = {
        highlightedIndex: 0,
        screen: state.currentScreen,
      };
      previousScreenRef.current = state.currentScreen;
      setNavVersion((v) => v + 1);
      return;
    }

    navRef.current = {
      ...navRef.current,
      screen: state.currentScreen,
    };
  }, [state.currentScreen]);

  useEffect(() => {
    void flushGlassesDisplay();
  }, [state, navVersion, flushGlassesDisplay]);

  useEffect(() => {
    if (!ENABLE_CUSTOM_GLASSES_RENDERER) {
      return;
    }
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    async function initGlasses() {
      try {
        const bridge = await waitForEvenAppBridge();
        if (disposed) return;

        glassesBridgeRef.current = bridge;
        unsubscribe = bridge.onEvenHubEvent((event: EvenHubEvent) => {
          if (nativeOverlayScreenRef.current) {
            return;
          }

          const action = mapGlassEvent(event);
          if (!action) {
            return;
          }

          const snapshot = stateRef.current;
          const nextNav = onGlassAction(action, navRef.current, snapshot);
          navRef.current = {
            ...nextNav,
            screen: stateRef.current.currentScreen,
          };
          setNavVersion((v) => v + 1);
          void flushGlassesDisplay();
        });

        await ensureGlassesStartup(bridge);
        void flushGlassesDisplay();
      } catch (e) {
        console.warn("[GlassesUI] Failed to initialize glasses bridge:", e);
      }
    }

    initGlasses();
    const unbindKeyboard = bindKeyboard((action) => {
      const snapshot = stateRef.current;
      const nextNav = onGlassAction(action, navRef.current, snapshot);
      navRef.current = {
        ...nextNav,
        screen: stateRef.current.currentScreen,
      };
      setNavVersion((v) => v + 1);
      void flushGlassesDisplay();
    });

    return () => {
      disposed = true;
      unsubscribe?.();
      unbindKeyboard();
      glassesBridgeRef.current = null;
      glassesInitializedRef.current = false;
      glassesLayoutRef.current = null;
      glassesTextRef.current = "";
      glassesChatIconSignatureRef.current = "";
      glassesChatIconsEnabledRef.current = false;
    };
  }, [ensureGlassesStartup, flushGlassesDisplay, onGlassAction]);

  if (!ENABLE_CUSTOM_GLASSES_RENDERER) {
    return (
      <ToolkitGlassesBridge
        state={state}
        currentScreen={state.currentScreen}
        toDisplayData={toDisplayData}
        onGlassAction={onGlassAction}
      />
    );
  }

  // This is a headless component - renders nothing in DOM
  return null;
}

function ToolkitGlassesBridge({
  state,
  currentScreen,
  toDisplayData,
  onGlassAction,
}: {
  state: AppState;
  currentScreen: Screen;
  toDisplayData: (snapshot: AppState, nav: GlassNavState) => { lines: DisplayLine[] };
  onGlassAction: (
    action: GlassAction,
    nav: GlassNavState,
    snapshot: AppState,
  ) => GlassNavState;
}) {
  const deriveScreen = useCallback(
    (_path: string) => currentScreen,
    [currentScreen],
  );

  useGlasses({
    getSnapshot: () => state,
    toDisplayData,
    onGlassAction,
    deriveScreen,
    appName: "even-messages",
  });

  return null;
}

export default GlassesUI;
