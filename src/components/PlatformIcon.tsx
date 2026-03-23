/**
 * Platform Icon SVG Components
 * 
 * SVG icons for the DevModeUI web interface.
 * These complement the tiny bitmap icons used on the Even G2 glasses.
 */

import React from 'react';

export type PlatformName = 
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

// Platform colors
export const PLATFORM_COLORS: Record<PlatformName, string> = {
  whatsapp: '#25D366',
  signal: '#3A76F0',
  telegram: '#0088CC',
  slack: '#4A154B',
  discord: '#5865F2',
  matrix: '#0DBD8B',
  imessage: '#5AC8FA',
  sms: '#8E8E93',
  email: '#EA4335',
  irc: '#CC9933',
  beeper: '#6366F1',
  other: '#6B7280',
};

// Normalize platform ID to platform name
export function normalizePlatform(platformId: string): PlatformName {
  const normalized = platformId.toLowerCase().trim();
  
  const mappings: Record<string, PlatformName> = {
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
    'messenger': 'imessage',
    'whats': 'whatsapp',
    'wa': 'whatsapp',
    'tg': 'telegram',
    'sig': 'signal',
    'dm': 'imessage',
  };
  
  return mappings[normalized] || 'other';
}

// Base icon props
interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// WhatsApp icon (from provided SVG)
export const WhatsAppIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.whatsapp, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
    />
  </svg>
);

// Signal icon
export const SignalIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.signal, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
);

// Telegram icon (from provided SVG)
export const TelegramIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.telegram, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
    />
  </svg>
);

// iMessage/Messenger icon (from provided Facebook Messenger SVG)
export const iMessageIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.imessage, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L.75 21.75l4.59-1.51A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
    />
  </svg>
);

// Slack icon
export const SlackIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.slack, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
    />
  </svg>
);

// Discord icon
export const DiscordIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.discord, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
    />
  </svg>
);

// Matrix icon
export const MatrixIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.matrix, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M2 4V20L8 16L14 20L22 16V4L14 8L8 4L2 8V4ZM18 16L14 14L8 16L2 14V10L8 12L14 10L18 12V16Z"
    />
  </svg>
);

// SMS icon
export const SMSIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.sms, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
    />
  </svg>
);

// Email icon
export const EmailIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.email, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
    />
  </svg>
);

// IRC icon
export const IRCIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.irc, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 13v1c0 1.1.9 2 2 2v3.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
    />
  </svg>
);

// Beeper icon
export const BeeperIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.beeper, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5zM11 13h2v5h-2v-5zm0 6h2v2h-2v-2z"
    />
  </svg>
);

// Other/Generic icon
export const OtherIcon: React.FC<IconProps> = ({ size = 24, color = PLATFORM_COLORS.other, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
    <path
      fill={color}
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
    />
  </svg>
);

// Icon mapping
export const PLATFORM_ICONS: Record<PlatformName, React.FC<IconProps>> = {
  whatsapp: WhatsAppIcon,
  signal: SignalIcon,
  telegram: TelegramIcon,
  slack: SlackIcon,
  discord: DiscordIcon,
  matrix: MatrixIcon,
  imessage: iMessageIcon,
  sms: SMSIcon,
  email: EmailIcon,
  irc: IRCIcon,
  beeper: BeeperIcon,
  other: OtherIcon,
};

// Main component to render platform icon
interface PlatformIconProps extends IconProps {
  platformId: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ 
  platformId, 
  size = 24, 
  color,
  className 
}) => {
  const platform = normalizePlatform(platformId);
  const IconComponent = PLATFORM_ICONS[platform];
  
  // Use custom color if provided, otherwise use platform default
  const iconColor = color || PLATFORM_COLORS[platform];
  
  return <IconComponent size={size} color={iconColor} className={className} />;
};

export default PlatformIcon;
