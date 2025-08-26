import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export consolidated design system utilities
export { kai, designSystem, utils as designUtils } from './design-system-consolidated'

// Re-export consolidated mobile utilities
export { mobile, mobileScreenReader, mobileAria, mobileVoiceControl } from './mobile-consolidated'

/**
 * Format number with commas for thousands
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Generate a random color from the KAI palette
 */
export function randomKaiColor(): string {
  const colors = ['primary', 'secondary', 'accent']
  const shades = [300, 400, 500, 600]
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const randomShade = shades[Math.floor(Math.random() * shades.length)]
  
  return `bg-${randomColor}-${randomShade}`
}
