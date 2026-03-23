/**
 * Platform Images for Even Messages
 * 
 * Converts SVG messaging app icons to PNG bytes for the Even G2 glasses display.
 * Images are resized to fit the conversation row height (~40px).
 */

// Normalize platform ID to standard form
function normalizePlatform(platformId: string): string {
  const normalized = platformId.toLowerCase().trim();
  const mappings: Record<string, string> = {
    'whatsapp': 'whatsapp',
    'signal': 'signal',
    'telegram': 'telegram',
    'slack': 'slack',
    'discord': 'discord',
    'matrix': 'matrix',
    'imessage': 'imessage',
    'sms': 'sms',
    'email': 'email',
    'irc': 'irc',
    'beeper': 'beeper',
    'messenger': 'messenger',
    'instagram': 'instagram',
    'whats': 'whatsapp',
    'wa': 'whatsapp',
    'tg': 'telegram',
    'sig': 'signal',
    'dm': 'imessage',
    'fb': 'messenger',
    'facebook': 'messenger',
    'ig': 'instagram',
  };
  return mappings[normalized] || 'other';
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Target size for conversation list icons
// Row height is approximately 40px, so icons should be around 32-36px
export const ICON_TARGET_WIDTH = 32;
export const ICON_TARGET_HEIGHT = 32;

// ═══════════════════════════════════════════════════════════════
// SVG DEFINITIONS
// ═══════════════════════════════════════════════════════════════

// WhatsApp SVG
const WHATSAPP_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#25D366"/>
  <path d="M32 18C24.268 18 18 24.044 18 31.5C18 34.446 18.98 37.175 20.643 39.4L19 46L25.869 44.205C27.719 45.349 29.915 46 32 46C39.732 46 46 39.956 46 32.5C46 25.044 39.732 18 32 18Z" fill="white"/>
  <path d="M37.5 35.5C36.9 36.4 35.6 37.2 34.7 37.3C33.5 37.4 32 36.9 29.5 34.5C27 32.1 26.4 30.5 26.4 29.3C26.5 28.4 27.3 27.1 28.2 26.5L29.3 25.8C29.6 25.6 30 25.7 30.2 26L31.9 28.8C32.1 29.1 32 29.5 31.7 29.7L30.6 30.5C30.4 30.7 30.3 31 30.5 31.3C31.1 32.2 31.8 33 32.6 33.6C33.3 34.2 34.1 34.9 35 35.5C35.3 35.7 35.6 35.6 35.8 35.4L36.6 34.3C36.8 34 37.2 33.9 37.5 34.1L40.3 35.8C40.6 36 40.7 36.4 40.5 36.7L39.8 37.8L37.5 35.5Z" fill="#25D366"/>
</svg>`;

// Facebook Messenger SVG
const MESSENGER_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#1877F2"/>
  <path d="M18 32C18 23.716 24.716 17 33 17C41.284 17 48 23.716 48 32C48 40.284 41.284 47 33 47C31.031 47 29.152 46.621 27.431 45.93L20 48L22.128 41.043C19.56 38.505 18 35.006 18 32Z" fill="white"/>
  <path d="M24 36L30 29L34 33L40 27L34 38L30 34L24 36Z" fill="#1877F2"/>
</svg>`;

// Instagram SVG
const INSTAGRAM_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ig" x1="12" y1="52" x2="52" y2="12" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FEDA75"/>
      <stop offset="0.35" stop-color="#FA7E1E"/>
      <stop offset="0.65" stop-color="#D62976"/>
      <stop offset="1" stop-color="#4F5BD5"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="48" height="48" rx="14" fill="url(#ig)"/>
  <rect x="18" y="18" width="28" height="28" rx="10" stroke="white" stroke-width="4"/>
  <circle cx="32" cy="32" r="7" stroke="white" stroke-width="4"/>
  <circle cx="42.5" cy="21.5" r="2.5" fill="white"/>
</svg>`;

// Signal SVG
const SIGNAL_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#3A76F0"/>
  <circle cx="32" cy="30" r="14" fill="white"/>
  <path d="M27 42L27.8 37.5C28.4 38 29.1 38.5 30 38.8L27 42Z" fill="white"/>
  <path d="M18 24.5C18.7 23.3 19.6 22.2 20.6 21.3" stroke="#3A76F0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
  <path d="M43.4 21.3C44.4 22.2 45.3 23.3 46 24.5" stroke="#3A76F0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
  <path d="M18.2 35.5C18.1 34.9 18 34.3 18 33.7" stroke="#3A76F0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
  <path d="M46 33.7C46 34.3 45.9 34.9 45.8 35.5" stroke="#3A76F0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
  <path d="M22.5 42.8C23.7 43.6 25 44.2 26.4 44.6" stroke="#3A76F0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
  <path d="M37.6 44.6C39 44.2 40.3 43.6 41.5 42.8" stroke="#3A76F0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 3"/>
</svg>`;

// Telegram SVG
const TELEGRAM_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#2AABEE"/>
  <path d="M46 19L17.5 30.2C16.5 30.6 16.6 32 17.7 32.3L24.2 34.3L27 42.5C27.3 43.4 28.5 43.5 29 42.7L33.1 36.7L39.9 42C40.7 42.6 41.8 42.2 42 41.2L47 20.5C47.3 19.3 46.6 18.7 46 19Z" fill="white"/>
  <path d="M24.2 34.3L41.5 23.5L28.5 35.8" stroke="#2AABEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// iMessage SVG
const IMESSAGE_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#34C759"/>
  <path d="M18 32C18 24.82 24.716 19 33 19C41.284 19 48 24.82 48 32C48 39.18 41.284 45 33 45C31.246 45 29.562 44.737 27.993 44.252L20 47L22.061 40.626C19.532 38.343 18 35.302 18 32Z" fill="white"/>
</svg>`;

// Slack SVG
const SLACK_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#4A154B"/>
  <path d="M22 20C22 15.5817 25.5817 12 30 12C34.4183 12 38 15.5817 38 20C38 24.4183 34.4183 28 30 28C28.5 28 27.1 27.6 25.9 26.9L22 28V20Z" fill="white"/>
  <path d="M30 30C34.4183 30 38 33.5817 38 38C38 42.4183 34.4183 46 30 46C25.5817 46 22 42.4183 22 38C22 36.5 22.4 35.1 23.1 33.9L22 30H30V30Z" fill="white"/>
  <path d="M44 30C48.4183 30 52 33.5817 52 38C52 42.4183 48.4183 46 44 46C39.5817 46 36 42.4183 36 38C36 36.5 36.4 35.1 37.1 33.9L36 30H44V30Z" fill="white"/>
  <path d="M22 34C17.5817 34 14 37.5817 14 42C14 46.4183 17.5817 50 22 50C26.4183 50 30 46.4183 30 42C30 40.5 29.6 39.1 28.9 37.9L28 41H22V34Z" fill="white"/>
</svg>`;

// Discord SVG  
const DISCORD_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#5865F2"/>
  <path d="M24 22C24 19.8 25.8 18 28 18C30.2 18 32 19.8 32 22C32 24.2 30.2 26 28 26C25.8 26 24 24.2 24 22Z" fill="white"/>
  <path d="M36 22C36 19.8 37.8 18 40 18C42.2 18 44 19.8 44 22C44 24.2 42.2 26 40 26C37.8 26 36 24.2 36 22Z" fill="white"/>
  <path d="M22 30C22 30 24 34 28 34C30 34 32 32 34 32C38 32 42 36 42 42C42 48 38 52 34 52C32 52 30 50 28 48C26 50 24 52 22 52C18 52 14 48 14 42C14 36 18 32 22 30Z" fill="white"/>
  <path d="M40 38C40 38 42 42 46 42C50 42 54 38 54 32C54 26 50 22 46 22C42 22 40 26 40 26" stroke="white" stroke-width="4"/>
</svg>`;

// SMS/Generic SVG
const SMS_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#8E8E93"/>
  <rect x="16" y="20" width="32" height="24" rx="4" fill="white"/>
  <path d="M24 44L20 52L28 44H24Z" fill="white"/>
  <path d="M40 44L44 52L36 44H40Z" fill="white"/>
</svg>`;

// Email SVG
const EMAIL_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#EA4335"/>
  <path d="M18 24L32 36L46 24V40H18V24Z" fill="white"/>
  <path d="M18 24L32 36L46 24V40H18V24Z" stroke="white" stroke-width="2"/>
  <path d="M18 42L32 32L46 42" stroke="white" stroke-width="2"/>
</svg>`;

// IRC SVG
const IRC_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#CC9933"/>
  <text x="32" y="42" font-family="Arial" font-size="28" font-weight="bold" fill="white" text-anchor="middle">#</text>
</svg>`;

// Beeper SVG
const BEEPER_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#6366F1"/>
  <rect x="20" y="16" width="24" height="32" rx="4" fill="white"/>
  <text x="32" y="40" font-family="Arial" font-size="24" font-weight="bold" fill="#6366F1" text-anchor="middle">B</text>
  <rect x="28" y="48" width="8" height="4" fill="white"/>
</svg>`;

// Matrix SVG
const MATRIX_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#0DBD8B"/>
  <rect x="16" y="16" width="12" height="12" fill="white"/>
  <rect x="32" y="16" width="12" height="12" fill="white" opacity="0.6"/>
  <rect x="16" y="32" width="12" height="12" fill="white" opacity="0.6"/>
  <rect x="32" y="32" width="12" height="12" fill="white"/>
  <rect x="48" y="16" width="0" height="0"/>
  <rect x="48" y="32" width="0" height="0"/>
</svg>`;

// Unknown/Other SVG
const OTHER_SVG = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="26" fill="#6B7280"/>
  <circle cx="32" cy="32" r="16" fill="white"/>
  <circle cx="32" cy="32" r="8" fill="#6B7280"/>
</svg>`;

// SVG map by platform name
const SVG_MAP: Record<string, string> = {
  whatsapp: WHATSAPP_SVG,
  signal: SIGNAL_SVG,
  telegram: TELEGRAM_SVG,
  slack: SLACK_SVG,
  discord: DISCORD_SVG,
  matrix: MATRIX_SVG,
  imessage: IMESSAGE_SVG,
  messenger: MESSENGER_SVG,
  instagram: INSTAGRAM_SVG,
  sms: SMS_SVG,
  email: EMAIL_SVG,
  irc: IRC_SVG,
  beeper: BEEPER_SVG,
  other: OTHER_SVG,
};

// ═══════════════════════════════════════════════════════════════
// CONVERSION UTILITIES
// ═══════════════════════════════════════════════════════════════

// Cache for converted images
const imageCache: Map<string, string> = new Map();

/**
 * Convert SVG string to PNG base64 data URL
 */
async function svgToPngBase64(svg: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load SVG image'));
    };
    
    // Convert SVG to data URL
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
    
    // Clean up the object URL after loading
    img.onload = () => {
      URL.revokeObjectURL(url);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
  });
}

/**
 * Convert PNG data URL to number[] (raw bytes) for SDK
 */
export function pngDataUrlToBytes(dataUrl: string): number[] {
  // Remove the data:image/png;base64, prefix
  const base64 = dataUrl.split(',')[1];
  if (!base64) return [];
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return Array.from(bytes);
}

/**
 * Get platform icon as PNG bytes (async, cached)
 */
export async function getPlatformIconPng(
  platformId: string, 
  width: number = ICON_TARGET_WIDTH, 
  height: number = ICON_TARGET_HEIGHT
): Promise<number[]> {
  const platform = normalizePlatform(platformId);
  const cacheKey = `${platform}-${width}x${height}`;
  
  // Check cache
  if (imageCache.has(cacheKey)) {
    return pngDataUrlToBytes(imageCache.get(cacheKey)!);
  }
  
  const svg = SVG_MAP[platform] || OTHER_SVG;
  const dataUrl = await svgToPngBase64(svg, width, height);
  
  // Cache for future use
  imageCache.set(cacheKey, dataUrl);
  
  return pngDataUrlToBytes(dataUrl);
}

/**
 * Get platform icon as base64 PNG string (async, cached)
 */
export async function getPlatformIconBase64(
  platformId: string,
  width: number = ICON_TARGET_WIDTH,
  height: number = ICON_TARGET_HEIGHT
): Promise<string> {
  const platform = normalizePlatform(platformId);
  const cacheKey = `${platform}-${width}x${height}`;
  
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  
  const svg = SVG_MAP[platform] || OTHER_SVG;
  const dataUrl = await svgToPngBase64(svg, width, height);
  
  imageCache.set(cacheKey, dataUrl);
  return dataUrl;
}

// ═══════════════════════════════════════════════════════════════
// PRE-GENERATED ICONS (for synchronous access)
// ═══════════════════════════════════════════════════════════════

/**
 * Pre-generated icon URLs for immediate use in <img> tags
 * These are generated once and cached
 */
export const platformIconUrls: Record<string, string> = {};

// Avoid eager icon generation at module load. On-device startup is sensitive to
// extra canvas/image work, so icons are generated lazily on demand instead.

/**
 * Get a platform icon URL synchronously (may be empty if not yet generated)
 */
export function getPlatformIconUrl(platformId: string): string {
  const platform = normalizePlatform(platformId);
  return platformIconUrls[platform] || '';
}

/**
 * Get all pre-generated icon URLs
 */
export function getAllPlatformIconUrls(): Record<string, string> {
  return { ...platformIconUrls };
}

// ═══════════════════════════════════════════════════════════════
// ICON POSITIONING HELPERS
// ═══════════════════════════════════════════════════════════════

// Position constants for conversation list icons
export const CHAT_ICON_X = 2;        // Left margin
export const CHAT_ICON_WIDTH = ICON_TARGET_WIDTH;
export const CHAT_ICON_HEIGHT = ICON_TARGET_HEIGHT;
export const CHAT_ICON_START_Y = 48;
export const CHAT_ROW_HEIGHT = 40;

// Calculate Y position for a chat at index
export function getChatIconY(index: number, startY: number = CHAT_ICON_START_Y, rowHeight: number = CHAT_ROW_HEIGHT): number {
  return startY + (index * rowHeight);
}

const stripCache: Map<string, string> = new Map();

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load PNG image'));
    img.src = dataUrl;
  });
}

/**
 * Render a vertical strip containing the visible chat icons.
 * This keeps the chats page within the SDK's container limits by using
 * a single image container for all conversation-row icons.
 */
export async function getChatIconStripPng(
  platformIds: string[],
  rowCount: number,
  rowHeight: number = CHAT_ROW_HEIGHT,
  width: number = CHAT_ICON_WIDTH,
): Promise<number[]> {
  const normalizedIds = platformIds.map((id) => normalizePlatform(id));
  const cacheKey = `${normalizedIds.join('|')}::${rowCount}::${rowHeight}::${width}`;

  if (stripCache.has(cacheKey)) {
    return pngDataUrlToBytes(stripCache.get(cacheKey)!);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = width;
  canvas.height = Math.max(1, rowCount * rowHeight);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < normalizedIds.length; i++) {
    const dataUrl = await getPlatformIconBase64(normalizedIds[i], CHAT_ICON_WIDTH, CHAT_ICON_HEIGHT);
    const img = await loadImage(dataUrl);
    const y = (i * rowHeight) + Math.max(0, Math.floor((rowHeight - CHAT_ICON_HEIGHT) / 2));
    ctx.drawImage(img, 0, y, CHAT_ICON_WIDTH, CHAT_ICON_HEIGHT);
  }

  const dataUrl = canvas.toDataURL('image/png');
  stripCache.set(cacheKey, dataUrl);
  return pngDataUrlToBytes(dataUrl);
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ChatImageInfo {
  containerId: number;
  containerName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generate image container info for a list of chats
 */
export function generateChatImageContainers(
  startIndex: number,
  count: number,
  containerIdBase: number = 100
): ChatImageInfo[] {
  const containers: ChatImageInfo[] = [];
  
  for (let i = 0; i < count; i++) {
    containers.push({
      containerId: containerIdBase + i,
      containerName: `chat-icon-${startIndex + i}`,
      x: CHAT_ICON_X,
      y: getChatIconY(i),
      width: CHAT_ICON_WIDTH,
      height: CHAT_ICON_HEIGHT,
    });
  }
  
  return containers;
}
