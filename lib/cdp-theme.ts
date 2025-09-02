/**
 * CDP Theme Configuration for KAI Platform
 * 
 * This file customizes the CDP component theme to match KAI's design system
 * using sage green, cream, and gold color palette.
 */

import { type Theme } from "@coinbase/cdp-react/theme";

/**
 * KAI-branded theme for CDP components
 * Maps CDP theme tokens to KAI's design system colors
 */
export const kaiCDPTheme: Partial<Theme> = {
  // Background colors - using KAI's sage and cream palette
  "colors-bg-default": "#f5f3f0", // Cream background
  "colors-bg-overlay": "rgba(122, 138, 104, 0.8)", // Sage overlay
  "colors-bg-skeleton": "#e5e3e0", // Light cream for loading states
  "colors-bg-primary": "#7a8a68", // Sage green primary
  "colors-bg-secondary": "#f0ede8", // Light cream secondary
  
  // Foreground/text colors
  "colors-fg-default": "#2d3748", // Dark text
  "colors-fg-muted": "#718096", // Muted text
  "colors-fg-primary": "#7a8a68", // Sage green text
  "colors-fg-onPrimary": "#ffffff", // White text on sage
  "colors-fg-onSecondary": "#2d3748", // Dark text on light backgrounds
  
  // Border/line colors
  "colors-line-default": "#e2e8f0", // Light border
  "colors-line-heavy": "#a0aec0", // Heavier border
  "colors-line-primary": "#7a8a68", // Sage border
  
  // Typography - using KAI's font system
  "font-family-sans": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "font-size-base": "16px",
  
  // Border radius - matching KAI's rounded design
  "border-radius-sm": "0.5rem",
  "border-radius-md": "0.75rem",
  "border-radius-lg": "1rem",
  
  // Spacing - consistent with KAI's spacing scale
  "spacing-xs": "0.25rem",
  "spacing-sm": "0.5rem",
  "spacing-md": "1rem",
  "spacing-lg": "1.5rem",
  "spacing-xl": "2rem",
};