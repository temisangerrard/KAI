/**
 * KAI Typography System
 * 
 * This file defines the typography system for the KAI prediction platform.
 * It includes font families, sizes, weights, and line heights.
 */

export const typography = {
  // Font families
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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