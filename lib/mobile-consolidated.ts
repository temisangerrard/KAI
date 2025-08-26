/**
 * Mobile Utilities - Consolidated
 * 
 * This file consolidates all mobile-related utilities including responsive detection,
 * accessibility features, touch targets, and screen reader optimizations.
 */

import { breakpoints } from './design-system-consolidated';

// ============================================================================
// MOBILE DETECTION & RESPONSIVE UTILITIES
// ============================================================================

// Mobile breakpoint from responsive system
const MOBILE_BREAKPOINT = breakpoints.md; // 768px

/**
 * Detects if the current viewport is mobile-sized
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Gets the current device type based on viewport size
 */
export function getDeviceType() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: false, isLargeDesktop: false };
  }

  const width = window.innerWidth;
  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg && width < breakpoints.xl,
    isLargeDesktop: width >= breakpoints.xl,
  };
}

/**
 * Gets the current breakpoint
 */
export function getCurrentBreakpoint(): keyof typeof breakpoints {
  if (typeof window === 'undefined') return 'xs';

  const width = window.innerWidth;
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

// ============================================================================
// TOUCH TARGET UTILITIES
// ============================================================================

// Minimum touch target size according to WCAG guidelines (44x44px)
export const MINIMUM_TOUCH_TARGET_SIZE = 44;

export interface TouchTargetConfig {
  minWidth: number;
  minHeight: number;
  padding?: number;
  margin?: number;
}

export const DEFAULT_TOUCH_TARGET: TouchTargetConfig = {
  minWidth: MINIMUM_TOUCH_TARGET_SIZE,
  minHeight: MINIMUM_TOUCH_TARGET_SIZE,
  padding: 8,
  margin: 4,
};

/**
 * Validates if an element meets minimum touch target requirements
 */
export function validateTouchTarget(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= MINIMUM_TOUCH_TARGET_SIZE && rect.height >= MINIMUM_TOUCH_TARGET_SIZE;
}

/**
 * Gets computed touch target size including padding and margin
 */
export function getTouchTargetSize(element: HTMLElement): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  const paddingX = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
  const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
  const marginX = parseFloat(computedStyle.marginLeft) + parseFloat(computedStyle.marginRight);
  const marginY = parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom);
  
  return {
    width: rect.width + paddingX + marginX,
    height: rect.height + paddingY + marginY,
  };
}

// ============================================================================
// MOBILE SCREEN READER UTILITIES
// ============================================================================

/**
 * Mobile Screen Reader Optimizer - Consolidated Class
 */
export class MobileScreenReaderOptimizer {
  private static instance: MobileScreenReaderOptimizer;
  private isVoiceOver: boolean = false;
  private isTalkBack: boolean = false;
  private isActive: boolean = false;

  private constructor() {
    this.detectScreenReader();
  }

  public static getInstance(): MobileScreenReaderOptimizer {
    if (!MobileScreenReaderOptimizer.instance) {
      MobileScreenReaderOptimizer.instance = new MobileScreenReaderOptimizer();
    }
    return MobileScreenReaderOptimizer.instance;
  }

  private detectScreenReader(): void {
    if (typeof window === 'undefined') return;

    // Detect VoiceOver (iOS)
    this.isVoiceOver = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
                      ('speechSynthesis' in window || 'webkitSpeechSynthesis' in window);

    // Detect TalkBack (Android)
    this.isTalkBack = /Android/.test(navigator.userAgent) && 
                      (navigator.userAgent.includes('TalkBack') || 
                       'speechSynthesis' in window);

    this.isActive = this.isVoiceOver || this.isTalkBack;
  }

  public getScreenReaderType(): 'voiceover' | 'talkback' | 'unknown' {
    if (this.isVoiceOver) return 'voiceover';
    if (this.isTalkBack) return 'talkback';
    return 'unknown';
  }

  public isScreenReaderActive(): boolean {
    return this.isActive;
  }

  public createOptimizedLabel(
    baseLabel: string, 
    context?: string, 
    state?: string,
    instructions?: string
  ): string {
    let label = baseLabel;

    if (context) label += `, ${context}`;
    if (state) label += `, ${state}`;
    if (instructions) label += `. ${instructions}`;

    if (this.isVoiceOver) {
      return this.optimizeForVoiceOver(label);
    } else if (this.isTalkBack) {
      return this.optimizeForTalkBack(label);
    }

    return label;
  }

  private optimizeForVoiceOver(label: string): string {
    return label.replace(/\s+/g, ' ').trim();
  }

  private optimizeForTalkBack(label: string): string {
    return label
      .replace(/\s+/g, ' ')
      .replace(/[,;]/g, '.') // Convert commas to periods for better pauses
      .trim();
  }

  public announceToMobile(
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    delay: number = 100
  ): void {
    if (!this.isActive) return;

    setTimeout(() => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only mobile-sr-optimized';
      
      let optimizedMessage = message;
      if (this.isVoiceOver) {
        optimizedMessage = this.optimizeForVoiceOver(message);
      } else if (this.isTalkBack) {
        optimizedMessage = this.optimizeForTalkBack(message);
      }
      
      announcement.textContent = optimizedMessage;
      document.body.appendChild(announcement);

      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    }, delay);
  }
}

// Convenience functions for screen reader
export const mobileScreenReader = {
  isActive(): boolean {
    return MobileScreenReaderOptimizer.getInstance().isScreenReaderActive();
  },

  announce(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    MobileScreenReaderOptimizer.getInstance().announceToMobile(text, priority);
  },

  createMobileLabel(baseLabel: string, context?: string): string {
    return MobileScreenReaderOptimizer.getInstance().createOptimizedLabel(baseLabel, context);
  },
};

// ============================================================================
// SWIPE GESTURE SUPPORT
// ============================================================================

export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

export function addSwipeGestureSupport(
  element: HTMLElement,
  config: SwipeGestureConfig
): () => void {
  const threshold = config.threshold || 50;
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (config.preventDefault) {
      e.preventDefault();
    }

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const deltaTime = endTime - startTime;

    if (deltaTime > 500) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && config.onSwipeRight) {
          config.onSwipeRight();
        } else if (deltaX < 0 && config.onSwipeLeft) {
          config.onSwipeLeft();
        }
      }
    } else {
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && config.onSwipeDown) {
          config.onSwipeDown();
        } else if (deltaY < 0 && config.onSwipeUp) {
          config.onSwipeUp();
        }
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: !config.preventDefault });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

// ============================================================================
// VOICE CONTROL SUPPORT
// ============================================================================

export const mobileVoiceControl = {
  optimizeForVoiceControl(element: HTMLElement, voiceName?: string): void {
    if (!voiceName) return;
    
    element.setAttribute('aria-label', voiceName);
    element.setAttribute('data-voice-command', voiceName.toLowerCase());
  },

  createVoiceLabel(action: string, target?: string): string {
    if (target) {
      return `${action} ${target}`;
    }
    return action;
  },
};

// ============================================================================
// MOBILE ARIA ENHANCEMENTS
// ============================================================================

export const mobileAria = {
  enhanceNavigation(element: HTMLElement, isActive: boolean, label: string): void {
    element.setAttribute('role', 'tab');
    element.setAttribute('aria-selected', isActive.toString());
    element.setAttribute('aria-label', `${label} tab${isActive ? ', selected' : ''}`);
    
    if (mobileScreenReader.isActive()) {
      element.setAttribute('aria-describedby', `${element.id}-mobile-desc`);
    }
  },

  createMobileDescription(element: HTMLElement, description: string): void {
    const descId = `${element.id || 'element'}-mobile-desc`;
    
    let descElement = document.getElementById(descId);
    if (!descElement) {
      descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'sr-only';
      document.body.appendChild(descElement);
    }
    
    descElement.textContent = description;
    element.setAttribute('aria-describedby', descId);
  },

  announceMobileNavigation(pageName: string): void {
    mobileScreenReader.announce(`Navigated to ${pageName}`, 'polite');
  },
};

// ============================================================================
// CONSOLIDATED MOBILE UTILITIES
// ============================================================================

export const mobile = {
  // Detection
  isMobileViewport,
  getDeviceType,
  getCurrentBreakpoint,
  
  // Touch targets
  MINIMUM_TOUCH_TARGET_SIZE,
  DEFAULT_TOUCH_TARGET,
  validateTouchTarget,
  getTouchTargetSize,
  
  // Screen reader
  screenReader: mobileScreenReader,
  
  // Gestures
  addSwipeGestureSupport,
  
  // Voice control
  voiceControl: mobileVoiceControl,
  
  // ARIA
  aria: mobileAria,
  
  // Screen reader optimizer
  getScreenReaderOptimizer: () => MobileScreenReaderOptimizer.getInstance(),
};

// Re-export breakpoints for convenience
export { breakpoints } from './design-system-consolidated';

export default mobile;