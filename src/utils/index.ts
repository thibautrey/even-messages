import type { ChannelType } from '../types'

/**
 * Get the display color for a channel type
 */
export function getChannelColor(type: ChannelType): string {
  const colors: Record<ChannelType, string> = {
    whatsapp: '#25d366',
    signal: '#3a76f0',
    telegram: '#0088cc',
    slack: '#4a154b',
    discord: '#5865f2',
    matrix: '#0ac',
    irc: '#6c5ce7',
    email: '#ea4335',
    sms: '#34a853',
    imessage: '#007aff',
    other: '#666666',
  }
  return colors[type] || colors.other
}

/**
 * Get the display icon for a channel type
 */
export function getChannelIcon(type: ChannelType): string {
  const icons: Record<ChannelType, string> = {
    whatsapp: '💬',
    signal: '🔐',
    telegram: '✈️',
    slack: '💼',
    discord: '🎮',
    matrix: '🟣',
    irc: '💬',
    email: '📧',
    sms: '📱',
    imessage: '💬',
    other: '📱',
  }
  return icons[type] || icons.other
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
