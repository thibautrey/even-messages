/**
 * Platform Icons for Even Messages
 * 
 * Tiny monochrome bitmaps for the Even G2 glasses display (576x288).
 * Icons are 16x16 pixels (1-bit per pixel) for minimal memory usage.
 * 
 * Format: Each row is 2 bytes (16 bits), rows are packed MSB first.
 * Total size: 32 bytes per icon (16 rows x 2 bytes).
 * 
 * The glasses display is monochrome, so we use simple black/white patterns.
 */

// Platform identifier to icon data mapping
export type PlatformId = 
  | 'whatsapp' 
  | 'signal' 
  | 'telegram' 
  | 'slack' 
  | 'discord' 
  | 'matrix' 
  | 'imessage' 
  | 'sms' 
  | 'email'
  | 'irc'
  | 'beeper'
  | 'other';

// Icon bitmap data type (32 bytes per 16x16 icon)
export type IconBitmap = readonly number[];

// Platform icon definitions
// Each icon is a 16x16 monochrome bitmap stored as a flat array of 32 numbers (2 bytes per row)
export const PLATFORM_ICONS: Record<PlatformId, IconBitmap> = {
  // WhatsApp - Green speech bubble with phone
  whatsapp: [
    0x00, 0x00, // Row 0: empty
    0x7E, 0xFC, // Row 1: top curve
    0xFF, 0xFE, // Row 2: top
    0xC3, 0x06, // Row 3: phone shape starts
    0x99, 0x31, // Row 4: phone
    0x99, 0x31, // Row 5: phone
    0x99, 0x31, // Row 6: phone
    0x99, 0x31, // Row 7: phone
    0x99, 0x31, // Row 8: phone
    0x99, 0x31, // Row 9: phone
    0x99, 0x31, // Row 10: phone
    0x99, 0x31, // Row 11: phone
    0xC3, 0x06, // Row 12: phone bottom
    0xFF, 0xFE, // Row 13: bottom
    0x7E, 0xFC, // Row 14: bottom curve
    0x00, 0x00, // Row 15: empty
  ],
  
  // Signal - Bell shape
  signal: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x00, // Row 1: empty
    0x00, 0x18, // Row 2: bell top
    0x00, 0x3C, // Row 3: bell
    0x00, 0x7E, // Row 4: bell
    0x01, 0xC3, // Row 5: bell
    0x03, 0x87, // Row 6: bell
    0x03, 0x87, // Row 7: bell
    0x03, 0x87, // Row 8: bell
    0x03, 0x87, // Row 9: bell
    0x01, 0xC3, // Row 10: bell bottom
    0x01, 0xC3, // Row 11: clapper
    0x00, 0x00, // Row 12: empty
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // Telegram - Paper plane
  telegram: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x01, // Row 1: plane tip
    0x00, 0x03, // Row 2: plane
    0x80, 0x07, // Row 3: plane
    0xC0, 0x0F, // Row 4: plane
    0xF0, 0x1F, // Row 5: plane body
    0x78, 0x3E, // Row 6: plane body
    0x3C, 0x7C, // Row 7: plane body
    0x1E, 0xF8, // Row 8: plane
    0x0F, 0xF0, // Row 9: plane
    0x07, 0xE0, // Row 10: plane
    0x03, 0xC0, // Row 11: plane
    0x01, 0x80, // Row 12: plane
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // Slack - Hash/octothorpe
  slack: [
    0x00, 0x00, // Row 0: empty
    0x24, 0x24, // Row 1: vertical hash top
    0x24, 0x24, // Row 2: vertical hash
    0x7E, 0x7E, // Row 3: horizontal + vertical
    0x42, 0x42, // Row 4: vertical hash
    0x42, 0x42, // Row 5: vertical hash
    0x7E, 0x7E, // Row 6: horizontal + vertical
    0x42, 0x42, // Row 7: vertical hash
    0x42, 0x42, // Row 8: vertical hash
    0x7E, 0x7E, // Row 9: horizontal + vertical
    0x42, 0x42, // Row 10: vertical hash
    0x42, 0x42, // Row 11: vertical hash
    0x7E, 0x7E, // Row 12: horizontal bar
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // Discord - Game controller shape
  discord: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x00, // Row 1: empty
    0x00, 0x00, // Row 2: empty
    0x1F, 0xF8, // Row 3: controller top
    0x3F, 0xFC, // Row 4: controller
    0x7F, 0xFE, // Row 5: controller body
    0x7F, 0xFE, // Row 6: controller body
    0x7F, 0xFE, // Row 7: controller body
    0x7F, 0xFE, // Row 8: controller body
    0x7F, 0xFE, // Row 9: controller body
    0x7F, 0xFE, // Row 10: controller body
    0x3F, 0xFC, // Row 11: controller bottom
    0x1F, 0xF8, // Row 12: controller bottom
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // Matrix - Bridge/pill shape
  matrix: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x00, // Row 1: empty
    0x00, 0x00, // Row 2: empty
    0x7E, 0xFC, // Row 3: pill top
    0x81, 0x03, // Row 4: pill
    0x81, 0x03, // Row 5: pill
    0x81, 0x03, // Row 6: pill
    0xBD, 0xDD, // Row 7: pill center
    0xA5, 0x5B, // Row 8: pill center
    0xA5, 0x5B, // Row 9: pill center
    0xBD, 0xDD, // Row 10: pill center
    0x81, 0x03, // Row 11: pill
    0x7E, 0xFC, // Row 12: pill bottom
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // iMessage - Blue speech bubble
  imessage: [
    0x00, 0x00, // Row 0: empty
    0x7E, 0xFC, // Row 1: top curve
    0xFF, 0xFE, // Row 2: top
    0xFF, 0xFE, // Row 3: top
    0xFF, 0xFE, // Row 4: bubble body
    0xFF, 0xFE, // Row 5: bubble body
    0xFF, 0xFE, // Row 6: bubble body
    0xFF, 0xFE, // Row 7: bubble body
    0xFF, 0xFE, // Row 8: bubble body
    0xFF, 0xFE, // Row 9: bubble body
    0xFF, 0xFE, // Row 10: bubble body
    0x7E, 0xFC, // Row 11: bubble bottom
    0x3C, 0xF0, // Row 12: tail left
    0x18, 0xC0, // Row 13: tail tip
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // SMS - Envelope
  sms: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x00, // Row 1: empty
    0x7E, 0xFC, // Row 2: envelope top
    0x81, 0x03, // Row 3: envelope
    0xA5, 0x5B, // Row 4: envelope flap
    0xA5, 0x5B, // Row 5: envelope flap
    0xA5, 0x5B, // Row 6: envelope flap
    0xA5, 0x5B, // Row 7: envelope flap
    0xA5, 0x5B, // Row 8: envelope flap
    0x81, 0x03, // Row 9: envelope bottom
    0x7E, 0xFC, // Row 10: envelope bottom
    0x00, 0x00, // Row 11: empty
    0x00, 0x00, // Row 12: empty
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // Email - @ symbol
  email: [
    0x00, 0x00, // Row 0: empty
    0x3C, 0xF0, // Row 1: @ top
    0x7E, 0xFC, // Row 2: @ curve
    0xC3, 0x06, // Row 3: @ vertical
    0x81, 0x81, // Row 4: @ hole
    0x81, 0x81, // Row 5: @ hole
    0xFF, 0xFF, // Row 6: @ body
    0x81, 0x81, // Row 7: @ body
    0x81, 0x81, // Row 8: @ body
    0xC3, 0x86, // Row 9: @ body
    0x7E, 0xFC, // Row 10: @ bottom curve
    0x3C, 0xF0, // Row 11: @ tail
    0x00, 0x00, // Row 12: empty
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // IRC - Hash/pound
  irc: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x00, // Row 1: empty
    0x00, 0x7E, // Row 2: vertical bar
    0x00, 0x7E, // Row 3: vertical bar
    0x7E, 0x00, // Row 4: horizontal cross
    0x7E, 0x00, // Row 5: horizontal cross
    0x7E, 0x7E, // Row 6: center
    0x7E, 0x00, // Row 7: horizontal cross
    0x7E, 0x00, // Row 8: horizontal cross
    0x00, 0x7E, // Row 9: vertical bar
    0x00, 0x7E, // Row 10: vertical bar
    0x00, 0x00, // Row 11: empty
    0x00, 0x00, // Row 12: empty
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
  
  // Beeper - B letter
  beeper: [
    0x7E, 0x00, // Row 0: B left bar
    0x7E, 0x00, // Row 1: B left bar
    0x7E, 0x00, // Row 2: B left bar
    0x7E, 0x00, // Row 3: B left bar
    0x7E, 0x00, // Row 4: B left bar
    0x7E, 0x00, // Row 5: B left bar
    0x7E, 0x00, // Row 6: B left bar
    0x66, 0x00, // Row 7: B middle
    0x7E, 0x00, // Row 8: B top right curve
    0x7E, 0x00, // Row 9: B right bar
    0x66, 0x00, // Row 10: B middle
    0x7E, 0x00, // Row 11: B bottom right curve
    0x7E, 0x00, // Row 12: B right bar
    0x7E, 0x00, // Row 13: B right bar
    0x7E, 0x00, // Row 14: B right bar
    0x7E, 0x00, // Row 15: B right bar
  ],
  
  // Other - Asterisk/star
  other: [
    0x00, 0x00, // Row 0: empty
    0x00, 0x00, // Row 1: empty
    0x00, 0x18, // Row 2: star top
    0x00, 0x18, // Row 3: star
    0x18, 0x7E, // Row 4: star arms
    0x7E, 0x18, // Row 5: star cross
    0x00, 0x18, // Row 6: star
    0x00, 0x18, // Row 7: star center
    0x18, 0x7E, // Row 8: star cross
    0x7E, 0x18, // Row 9: star arms
    0x00, 0x18, // Row 10: star
    0x00, 0x18, // Row 11: star bottom
    0x00, 0x00, // Row 12: empty
    0x00, 0x00, // Row 13: empty
    0x00, 0x00, // Row 14: empty
    0x00, 0x00, // Row 15: empty
  ],
};

/**
 * Get icon bitmap for a platform ID
 */
export function getPlatformIcon(platformId: string): IconBitmap {
  const normalized = platformId.toLowerCase().trim();
  
  // Direct match
  if (normalized in PLATFORM_ICONS) {
    return PLATFORM_ICONS[normalized as PlatformId];
  }
  
  // Fallback mappings for common variations
  const mappings: Record<string, PlatformId> = {
    'whatsapp': 'whatsapp',
    'signal': 'signal',
    'telegram': 'telegram',
    'slack': 'slack',
    'discord': 'discord',
    'matrix': 'matrix',
    'beeper': 'beeper',
    'imessage': 'imessage',
    'sms': 'sms',
    'email': 'email',
    'irc': 'irc',
    'messenger': 'imessage', // Facebook Messenger -> iMessage style
    'whats': 'whatsapp',     // Short for WhatsApp
    'wa': 'whatsapp',       // Short for WhatsApp
    'tg': 'telegram',       // Short for Telegram
    'sig': 'signal',        // Short for Signal
    'dm': 'imessage',       // Direct message -> iMessage style
  };
  
  return PLATFORM_ICONS[mappings[normalized] || 'other'];
}

/**
 * Get the icon data as a number array for the Even SDK
 * Returns raw bytes that can be passed to updateImageRawData
 */
export function getIconAsBytes(platformId: string): number[] {
  return [...getPlatformIcon(platformId)];
}

/**
 * Get icon dimensions
 */
export const ICON_WIDTH = 16;
export const ICON_HEIGHT = 16;
export const ICON_BYTES_PER_ROW = 2;
export const ICON_TOTAL_BYTES = ICON_WIDTH * ICON_HEIGHT / 8; // 32 bytes

/**
 * Platform display names (for fallback text)
 */
export const PLATFORM_NAMES: Record<PlatformId, string> = {
  whatsapp: 'WA',
  signal: 'SI',
  telegram: 'TG',
  slack: 'SL',
  discord: 'DI',
  matrix: 'MX',
  imessage: 'iM',
  sms: 'SM',
  email: '@',
  irc: 'IR',
  beeper: 'BP',
  other: '*',
};

/**
 * Get display text for a platform (fallback when images aren't used)
 */
export function getPlatformDisplayText(platformId: string): string {
  const normalized = platformId.toLowerCase().trim();
  return PLATFORM_NAMES[normalized as PlatformId] || PLATFORM_NAMES.other;
}

// Legacy compatibility - keep the old function name
export const getServiceIcon = getPlatformDisplayText;
