/**
 * CDP Configuration Test
 * 
 * Tests that CDP configuration files are properly structured and contain
 * the required settings for KAI platform integration.
 */

import { CDP_CONFIG, APP_CONFIG } from '@/lib/cdp-config';
import { kaiCDPTheme } from '@/lib/cdp-theme';

describe('CDP Configuration', () => {
  describe('CDP_CONFIG', () => {
    it('should have required configuration properties', () => {
      expect(CDP_CONFIG).toBeDefined();
      expect(CDP_CONFIG).toHaveProperty('projectId');
      expect(CDP_CONFIG).toHaveProperty('createAccountOnLogin');
    });

    it('should use smart accounts for gasless transactions', () => {
      expect(CDP_CONFIG.createAccountOnLogin).toBe('evm-smart');
    });

    it('should have projectId configured from environment', () => {
      // Should be empty string if env var not set, or actual value if set
      expect(typeof CDP_CONFIG.projectId).toBe('string');
    });
  });

  describe('APP_CONFIG', () => {
    it('should have KAI branding configuration', () => {
      expect(APP_CONFIG).toBeDefined();
      expect(APP_CONFIG.name).toBe('KAI Prediction Platform');
      expect(APP_CONFIG.logoUrl).toBe('/placeholder-logo.svg');
    });

    it('should use email-only authentication', () => {
      expect(APP_CONFIG.authMethods).toEqual(['email']);
    });
  });

  describe('kaiCDPTheme', () => {
    it('should have KAI color scheme', () => {
      expect(kaiCDPTheme).toBeDefined();
      
      // Check background colors use KAI palette
      expect(kaiCDPTheme['colors-bg-default']).toBe('#f5f3f0'); // Cream
      expect(kaiCDPTheme['colors-bg-primary']).toBe('#7a8a68'); // Sage green
      
      // Check foreground colors
      expect(kaiCDPTheme['colors-fg-primary']).toBe('#7a8a68'); // Sage green
      expect(kaiCDPTheme['colors-fg-onPrimary']).toBe('#ffffff'); // White on sage
    });

    it('should use Inter font family', () => {
      expect(kaiCDPTheme['font-family-sans']).toContain('Inter');
    });

    it('should have consistent border radius values', () => {
      expect(kaiCDPTheme['border-radius-sm']).toBe('0.5rem');
      expect(kaiCDPTheme['border-radius-md']).toBe('0.75rem');
      expect(kaiCDPTheme['border-radius-lg']).toBe('1rem');
    });

    it('should have proper spacing scale', () => {
      expect(kaiCDPTheme['spacing-xs']).toBe('0.25rem');
      expect(kaiCDPTheme['spacing-sm']).toBe('0.5rem');
      expect(kaiCDPTheme['spacing-md']).toBe('1rem');
      expect(kaiCDPTheme['spacing-lg']).toBe('1.5rem');
      expect(kaiCDPTheme['spacing-xl']).toBe('2rem');
    });
  });

  describe('Environment Variables', () => {
    it('should handle missing CDP_PROJECT_ID gracefully', () => {
      // Configuration should not throw even if env var is missing
      expect(() => CDP_CONFIG.projectId).not.toThrow();
      expect(typeof CDP_CONFIG.projectId).toBe('string');
    });
  });
});