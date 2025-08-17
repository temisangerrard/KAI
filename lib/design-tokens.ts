/**
 * KAI Design Tokens
 * 
 * This file defines the design tokens for the KAI prediction platform.
 * It includes spacing, shadows, animations, and other design variables.
 */

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
    'kai-sm': '0 2px 5px 0 rgba(219, 39, 119, 0.1)',
    'kai-md': '0 4px 10px 0 rgba(219, 39, 119, 0.15)',
    'kai-lg': '0 10px 20px 0 rgba(219, 39, 119, 0.2)',
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

// Component-specific design tokens
export const componentTokens = {
  // Button variants
  button: {
    primary: 'bg-kai-600 hover:bg-kai-700 text-white rounded-kai-button',
    secondary: 'bg-primary-600 hover:bg-primary-700 text-white rounded-kai-button',
    outline: 'border-2 border-kai-300 text-kai-700 hover:bg-kai-50 rounded-kai-button',
    ghost: 'text-kai-700 hover:bg-kai-50 rounded-kai-button',
    link: 'text-kai-600 hover:text-kai-800 underline',
  },
  
  // Card variants
  card: {
    default: 'bg-white shadow-kai-sm rounded-kai-card border border-primary-100',
    elevated: 'bg-white shadow-kai-md rounded-kai-card border border-primary-100',
    flat: 'bg-primary-50 rounded-kai-card border border-primary-100',
    gradient: 'bg-gradient-to-br from-white to-primary-50 rounded-kai-card shadow-kai-sm',
  },
  
  // Input variants
  input: {
    default: 'border border-primary-200 rounded-kai-input focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
    filled: 'bg-primary-50 border border-primary-100 rounded-kai-input focus:ring-2 focus:ring-primary-300',
    flushed: 'border-b-2 border-primary-200 rounded-none focus:border-primary-400',
  },
};

// Export all design tokens
export default {
  ...designTokens,
  components: componentTokens,
};