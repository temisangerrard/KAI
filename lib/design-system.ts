/**
 * KAI Design System - Centralized Color & Style Configuration
 * Elegant sage green & cream palette for sophisticated women-focused app
 */

// Core Brand Colors - Sage Green & Cream Palette
export const colors = {
  // Primary Brand - Sage Green (sophisticated, calming)
  primary: {
    50: '#f6f7f4',
    100: '#e9ebe4', 
    200: '#d4d8ca',
    300: '#b8c0a7',
    400: '#9ca687',
    500: '#7a8a68', // Main brand color
    600: '#6b7a59', // Darker for better contrast
    700: '#5a654d', // Text color
    800: '#4a5340',
    900: '#3f4637',
    950: '#20251c',
  },
  
  // Secondary - Warm Cream (elegant, neutral)
  secondary: {
    50: '#fefefe',
    100: '#fdfcfa',
    200: '#fbf8f2', 
    300: '#f8f2e7',
    400: '#f5ebd8',
    500: '#F5F3F0', // Main background
    600: '#e8d5c4',
    700: '#d4b896',
    800: '#c19a6b',
    900: '#a67c52',
    950: '#8b5a2a',
  },
  
  // Accent - Warm Gold (luxury, premium)
  accent: {
    50: '#fefbf3',
    100: '#fdf4e1',
    200: '#fae8c2',
    300: '#f6d898', 
    400: '#f0c36c',
    500: '#D4A574', // Main accent
    600: '#c8924a', // Darker for contrast
    700: '#a6763d',
    800: '#875f36',
    900: '#6f4f30',
    950: '#3f2818',
  },
  
  // Semantic Colors (using brand palette)
  success: {
    50: '#f0f9f0',
    500: '#7a8a68', // Using primary green
    600: '#6b7a59',
    700: '#5a654d',
  },
  
  warning: {
    50: '#fefbf3',
    500: '#D4A574', // Using accent gold
    600: '#c8924a',
    700: '#a6763d',
  },
  
  error: {
    50: '#fef2f2',
    500: '#dc2626',
    600: '#b91c1c',
    700: '#991b1b',
  },
  
  // Neutral grays (warm-toned to match palette)
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  }
}

// Component Style Presets
export const components = {
  // Button variants
  button: {
    primary: `bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white shadow-md transition-all duration-200`,
    secondary: `border-2 border-primary-300 text-primary-700 hover:bg-primary-50 hover:border-primary-400 transition-all duration-200`,
    ghost: `text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200`,
    accent: `bg-accent-500 hover:bg-accent-600 text-white shadow-md transition-all duration-200`,
  },
  
  // Card variants
  card: {
    default: `bg-white shadow-sm border border-neutral-200 rounded-xl`,
    elevated: `bg-white shadow-lg border border-neutral-200 rounded-xl`,
    gradient: `bg-gradient-to-br from-white to-secondary-50 shadow-sm rounded-xl`,
  },
  
  // Input variants
  input: {
    default: `border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200`,
    filled: `bg-secondary-100 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500`,
  },
  
  // Badge variants
  badge: {
    primary: `bg-primary-100 text-primary-700 border border-primary-200`,
    secondary: `bg-secondary-200 text-secondary-800 border border-secondary-300`,
    accent: `bg-accent-100 text-accent-700 border border-accent-200`,
    success: `bg-success-100 text-success-700 border border-success-200`,
    warning: `bg-warning-100 text-warning-700 border border-warning-200`,
  },
  
  // Navigation
  navigation: {
    active: `text-primary-700 bg-primary-100 font-medium`,
    inactive: `text-neutral-600 hover:text-primary-600 hover:bg-primary-50`,
    focus: `focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`,
  },
  
  // Backgrounds
  background: {
    main: `bg-gradient-to-br from-secondary-100 via-secondary-50 to-primary-50`,
    card: `bg-white`,
    section: `bg-gradient-to-r from-secondary-100 to-primary-50`,
    header: `bg-gradient-to-r from-primary-600 to-accent-600`,
  }
}

// Typography Scale
export const typography = {
  // Font families
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Playfair Display", Georgia, serif', // Elegant serif for headings
  },
  
  // Text styles
  heading: {
    h1: `text-4xl md:text-5xl font-bold leading-tight font-display text-neutral-900`,
    h2: `text-3xl md:text-4xl font-bold leading-tight font-display text-neutral-900`,
    h3: `text-2xl md:text-3xl font-semibold leading-snug font-display text-neutral-900`,
    h4: `text-xl md:text-2xl font-semibold leading-snug text-neutral-900`,
  },
  
  body: {
    large: `text-lg leading-relaxed text-neutral-700`,
    default: `text-base leading-normal text-neutral-700`,
    small: `text-sm leading-normal text-neutral-600`,
    caption: `text-xs leading-tight text-neutral-500`,
  }
}

// Spacing Scale
export const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
  '3xl': '4rem',  // 64px
}

// Animation Presets
export const animations = {
  transition: 'transition-all duration-200 ease-in-out',
  hover: 'hover:scale-105 transition-transform duration-200',
  focus: 'focus:scale-105 transition-transform duration-200',
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
}

// Utility Functions
export const utils = {
  // Generate gradient text
  gradientText: (from: string = 'primary-600', to: string = 'accent-600') => 
    `bg-gradient-to-r from-${from} to-${to} text-transparent bg-clip-text`,
  
  // Generate gradient background
  gradientBg: (from: string = 'primary-600', to: string = 'accent-600') => 
    `bg-gradient-to-r from-${from} to-${to}`,
  
  // Generate shadow
  shadow: (size: 'sm' | 'md' | 'lg' = 'md') => {
    const shadows = {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg'
    }
    return shadows[size]
  }
}

// Export everything as default design system
export const designSystem = {
  colors,
  components,
  typography,
  spacing,
  animations,
  utils
}

export default designSystem