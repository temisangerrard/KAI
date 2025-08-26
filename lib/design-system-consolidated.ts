/**
 * KAI Design System - Consolidated
 * 
 * This file consolidates all design system utilities, tokens, and components
 * into a single, cohesive system for the KAI prediction platform.
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

export const designTokens = {
  // Spacing scale (in rem)
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
    // KAI specific shadows with brand colors
    'kai-sm': '0 2px 5px 0 rgba(122, 138, 104, 0.1)',
    'kai-md': '0 4px 10px 0 rgba(122, 138, 104, 0.15)',
    'kai-lg': '0 10px 20px 0 rgba(122, 138, 104, 0.2)',
  },
  
  // Animations
  animations: {
    // Timing functions
    easing: {
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
    // Durations
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
    },
  },
  
  // Z-index scale
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    auto: 'auto',
    // App specific layers
    header: '100',
    modal: '200',
    tooltip: '300',
    toast: '400',
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
    // KAI specific rounded corners
    'kai-button': '2rem', // Very rounded buttons
    'kai-card': '1.25rem', // Rounded cards
    'kai-input': '1rem', // Rounded inputs
  },
  
  // Gradients
  gradients: {
    'kai-primary': 'linear-gradient(to right, #7a8a68, #f5f3f0)', // Primary sage to cream
    'kai-accent': 'linear-gradient(to right, #d4a574, #f5f3f0)', // Accent gold to cream
    'kai-success': 'linear-gradient(to right, #7a8a68, #9ca687)', // Sage green tones
    'kai-warning': 'linear-gradient(to right, #d4a574, #c8924a)', // Warm gold tones
    'kai-error': 'linear-gradient(to right, #dc2626, #b91c1c)', // Red tones
  },
};

// ============================================================================
// COLORS
// ============================================================================

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
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Playfair Display", Georgia, serif', // Elegant serif for headings
    mono: '"JetBrains Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  
  // Font sizes (in rem)
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  
  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Typography utility classes
export const typographyUtils = {
  // Heading styles
  heading1: 'font-display font-bold text-4xl md:text-5xl leading-tight',
  heading2: 'font-display font-bold text-3xl md:text-4xl leading-tight',
  heading3: 'font-display font-semibold text-2xl md:text-3xl leading-snug',
  heading4: 'font-display font-semibold text-xl md:text-2xl leading-snug',
  heading5: 'font-display font-medium text-lg md:text-xl leading-snug',
  
  // Body text styles
  bodyLarge: 'font-primary text-lg leading-relaxed',
  bodyDefault: 'font-primary text-base leading-normal',
  bodySmall: 'font-primary text-sm leading-normal',
  bodyXSmall: 'font-primary text-xs leading-normal',
  
  // Special text styles
  caption: 'font-primary text-xs leading-tight tracking-wide',
  overline: 'font-primary text-xs uppercase tracking-widest font-medium',
  button: 'font-primary font-medium text-sm leading-none tracking-wide',
};

// ============================================================================
// COMPONENT TOKENS
// ============================================================================

export const componentTokens = {
  // Button variants
  button: {
    primary: `bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white shadow-md transition-all duration-200`,
    secondary: `border-2 border-primary-300 text-primary-700 hover:bg-primary-50 hover:border-primary-400 transition-all duration-200`,
    ghost: `text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200`,
    accent: `bg-accent-500 hover:bg-accent-600 text-white shadow-md transition-all duration-200`,
    outline: 'border-2 border-primary-300 text-primary-700 hover:bg-primary-50 rounded-kai-button',
    link: 'text-primary-600 hover:text-primary-800 underline',
  },
  
  // Card variants
  card: {
    default: `bg-white shadow-sm border border-neutral-200 rounded-xl`,
    elevated: `bg-white shadow-lg border border-neutral-200 rounded-xl`,
    gradient: `bg-gradient-to-br from-white to-secondary-50 shadow-sm rounded-xl`,
    flat: 'bg-primary-50 rounded-kai-card border border-primary-100',
  },
  
  // Input variants
  input: {
    default: `border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200`,
    filled: `bg-secondary-100 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500`,
    flushed: 'border-b-2 border-primary-200 rounded-none focus:border-primary-400',
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
};

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Media query strings
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs}px)`,
  sm: `@media (min-width: ${breakpoints.sm}px)`,
  md: `@media (min-width: ${breakpoints.md}px)`,
  lg: `@media (min-width: ${breakpoints.lg}px)`,
  xl: `@media (min-width: ${breakpoints.xl}px)`,
  '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,
  
  // Max-width queries
  xsOnly: `@media (max-width: ${breakpoints.sm - 1}px)`,
  smOnly: `@media (min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.md - 1}px)`,
  mdOnly: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  lgOnly: `@media (min-width: ${breakpoints.lg}px) and (max-width: ${breakpoints.xl - 1}px)`,
  xlOnly: `@media (min-width: ${breakpoints.xl}px) and (max-width: ${breakpoints['2xl'] - 1}px)`,
  '2xlOnly': `@media (min-width: ${breakpoints['2xl']}px)`,
};

// Device type detection
export const deviceTypes = {
  mobile: `@media (max-width: ${breakpoints.md - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.lg}px)`,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const utils = {
  // Generate gradient text
  gradientText: (from: string = 'primary-600', to: string = 'accent-600') => 
    `bg-gradient-to-r from-${from} to-${to} text-transparent bg-clip-text`,
  
  // Generate gradient background
  gradientBg: (from: string = 'primary-600', to: string = 'accent-600') => 
    `bg-gradient-to-r from-${from} to-${to}`,
  
  // Generate shadow
  shadow: (size: keyof typeof designTokens.shadows = 'DEFAULT') => {
    return designTokens.shadows[size]
  },

  // Gradient generator
  gradient: (type: keyof typeof designTokens.gradients = 'kai-primary') => {
    return designTokens.gradients[type]
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
  },

  // Get responsive value utility
  getResponsiveValue: <T>(
    values: Partial<Record<keyof typeof breakpoints, T>>,
    defaultValue: T,
  ): T => {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const width = window.innerWidth
    const sorted = Object.entries(breakpoints).sort((a, b) => a[1] - b[1]) as [
      keyof typeof breakpoints,
      number,
    ][]

    let active: keyof typeof breakpoints = sorted[0][0]
    for (const [key, bp] of sorted) {
      if (width >= bp) {
        active = key
      }
    }

    return values[active] ?? defaultValue
  }
};

// ============================================================================
// CONSOLIDATED KAI DESIGN SYSTEM
// ============================================================================

export const kai = {
  // Core tokens
  tokens: designTokens,
  colors,
  typography: typographyUtils,
  breakpoints,
  mediaQueries,
  deviceTypes,
  
  // Component styles
  components: componentTokens,
  
  // Utilities
  ...utils,
};

// Export everything as default design system
export const designSystem = {
  colors,
  componentTokens,
  typography,
  designTokens,
  breakpoints,
  mediaQueries,
  deviceTypes,
  utils,
  kai
};

export default designSystem;