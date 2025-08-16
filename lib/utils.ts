import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { designTokens, componentTokens } from "./design-tokens"
import { typography, typographyUtils } from "./typography"

/**
 * Combines and merges class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * KAI Design System Utilities
 */

// Typography utilities
export const kai = {
  // Typography
  typography: typographyUtils,
  
  // Component styles based on design tokens
  components: componentTokens,
  
  // Design tokens
  tokens: designTokens,
  
  // Gradient generator
  gradient: (type: keyof typeof designTokens.gradients = 'kai-primary') => {
    return designTokens.gradients[type]
  },
  
  // Shadow generator
  shadow: (size: keyof typeof designTokens.shadows = 'DEFAULT') => {
    return designTokens.shadows[size]
  },
  
  // Animation utility
  animate: (duration: keyof typeof designTokens.animations.duration = 'normal', 
            easing: keyof typeof designTokens.animations.easing = 'ease-in-out') => {
    return `transition-all ${designTokens.animations.duration[duration]} ${designTokens.animations.easing[easing]}`
  },
  
  // Responsive font size utility
  responsiveText: (base: keyof typeof typography.fontSize, md?: keyof typeof typography.fontSize) => {
    if (md) {
      return `text-${base} md:text-${md}`
    }
    return `text-${base}`
  }
}

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
  const colors = ['primary', 'secondary', 'accent', 'success', 'warning', 'error']
  const shades = [300, 400, 500, 600]
  
  const randomColor = colors[Math.floor(Math.random() * colors.length)]
  const randomShade = shades[Math.floor(Math.random() * shades.length)]
  
  return `bg-${randomColor}-${randomShade}`
}
