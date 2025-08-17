/**
 * KAI Responsive Design System
 * 
 * This file defines the responsive breakpoints and utilities for the KAI prediction platform.
 */

// Breakpoint definitions (in pixels)
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// Media query strings for use in styled-components or CSS-in-JS
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
}

// Device type detection
export const deviceTypes = {
  mobile: `@media (max-width: ${breakpoints.md - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.lg}px)`,
}

// Container widths for different breakpoints
export const containerWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
}

// Spacing scale adjustments for different screen sizes
export const responsiveSpacing = {
  // Multipliers for the base spacing scale
  xs: 0.5,  // Half spacing on extra small screens
  sm: 0.75, // 3/4 spacing on small screens
  md: 1,    // Normal spacing on medium screens
  lg: 1.25, // 1.25x spacing on large screens
  xl: 1.5,  // 1.5x spacing on extra large screens
}

/**
 * Get a value for the current viewport width.
 *
 * The function determines the active breakpoint using `window.innerWidth`
 * and the `breakpoints` map above. It returns the corresponding entry from
 * the provided `values` object or falls back to `defaultValue` when no value
 * is defined. If `window` is not available (e.g. during SSR) the
 * `defaultValue` is returned.
 */
export function getResponsiveValue<T>(
  values: Partial<Record<keyof typeof breakpoints, T>>,
  defaultValue: T,
): T {
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
