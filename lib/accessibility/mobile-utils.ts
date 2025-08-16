/**
 * Mobile Accessibility Utilities
 * 
 * Utilities for enhancing mobile accessibility including touch targets,
 * screen reader optimizations, and mobile-specific ARIA support.
 */

// Minimum touch target size according to WCAG guidelines (44x44px)
export const MINIMUM_TOUCH_TARGET_SIZE = 44;

/**
 * Interface for touch target configuration
 */
export interface TouchTargetConfig {
  minWidth: number;
  minHeight: number;
  padding?: number;
  margin?: number;
}

/**
 * Default touch target configuration for mobile accessibility
 */
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

/**
 * Mobile screen reader detection utilities
 */
export const mobileScreenReader = {
  /**
   * Detects if the user is likely using a mobile screen reader
   */
  isActive(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for mobile user agent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for screen reader indicators
    const hasScreenReader = 
      // VoiceOver on iOS
      'speechSynthesis' in window ||
      // TalkBack on Android
      navigator.userAgent.includes('TalkBack') ||
      // General accessibility API presence
      'getSelection' in window;
    
    return isMobile && hasScreenReader;
  },

  /**
   * Announces text to mobile screen readers
   */
  announce(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (typeof window === 'undefined') return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = text;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Creates mobile-optimized ARIA labels
   */
  createMobileLabel(baseLabel: string, context?: string): string {
    if (!context) return baseLabel;
    
    // Mobile screen readers benefit from more concise labels
    return `${baseLabel}, ${context}`;
  },
};

/**
 * Swipe gesture support for screen reader users
 */
export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

/**
 * Adds swipe gesture support that works with screen readers
 */
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

    // Ignore if gesture took too long (likely not intentional)
    if (deltaTime > 500) return;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && config.onSwipeRight) {
          config.onSwipeRight();
        } else if (deltaX < 0 && config.onSwipeLeft) {
          config.onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && config.onSwipeDown) {
          config.onSwipeDown();
        } else if (deltaY < 0 && config.onSwipeUp) {
          config.onSwipeUp();
        }
      }
    }
  };

  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: !config.preventDefault });

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Mobile voice control support utilities
 */
export const mobileVoiceControl = {
  /**
   * Ensures elements have voice-control-friendly names
   */
  optimizeForVoiceControl(element: HTMLElement, voiceName?: string): void {
    if (!voiceName) return;
    
    // Set accessible name for voice control
    element.setAttribute('aria-label', voiceName);
    
    // Add data attribute for voice control systems
    element.setAttribute('data-voice-command', voiceName.toLowerCase());
  },

  /**
   * Creates voice-control-friendly button labels
   */
  createVoiceLabel(action: string, target?: string): string {
    if (target) {
      return `${action} ${target}`;
    }
    return action;
  },
};

/**
 * Mobile-specific ARIA enhancements
 */
export const mobileAria = {
  /**
   * Adds mobile-optimized ARIA attributes to navigation elements
   */
  enhanceNavigation(element: HTMLElement, isActive: boolean, label: string): void {
    element.setAttribute('role', 'tab');
    element.setAttribute('aria-selected', isActive.toString());
    element.setAttribute('aria-label', `${label} tab${isActive ? ', selected' : ''}`);
    
    // Mobile-specific enhancements
    if (mobileScreenReader.isActive()) {
      element.setAttribute('aria-describedby', `${element.id}-mobile-desc`);
    }
  },

  /**
   * Creates mobile-optimized descriptions for complex UI elements
   */
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

  /**
   * Adds mobile-specific live region announcements
   */
  announceMobileNavigation(pageName: string): void {
    mobileScreenReader.announce(`Navigated to ${pageName}`, 'polite');
  },
};