/**
 * Mobile Accessibility Hook
 * 
 * Custom hook for managing mobile accessibility features including
 * touch targets, screen reader optimizations, and gesture support.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsMobile } from './use-mobile';
import { 
  mobileScreenReader, 
  addSwipeGestureSupport, 
  SwipeGestureConfig,
  validateTouchTarget,
  mobileVoiceControl,
  mobileAria
} from '@/lib/accessibility/mobile-utils';

export interface MobileAccessibilityOptions {
  enableSwipeGestures?: boolean;
  enableVoiceControl?: boolean;
  enableTouchTargetValidation?: boolean;
  announceNavigation?: boolean;
}

export function useMobileAccessibility(options: MobileAccessibilityOptions = {}) {
  const isMobile = useIsMobile();
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const [touchTargetWarnings, setTouchTargetWarnings] = useState<string[]>([]);

  // Detect mobile screen reader on mount
  useEffect(() => {
    if (isMobile) {
      setIsScreenReaderActive(mobileScreenReader.isActive());
    }
  }, [isMobile]);

  /**
   * Announces text to mobile screen readers
   */
  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (isMobile && isScreenReaderActive) {
      mobileScreenReader.announce(text, priority);
    }
  }, [isMobile, isScreenReaderActive]);

  /**
   * Announces navigation changes for mobile users
   */
  const announceNavigation = useCallback((pageName: string) => {
    if (options.announceNavigation !== false && isMobile) {
      mobileAria.announceMobileNavigation(pageName);
    }
  }, [isMobile, options.announceNavigation]);

  /**
   * Validates touch targets and reports warnings
   */
  const validateTouchTargets = useCallback((container: HTMLElement) => {
    if (!options.enableTouchTargetValidation || !isMobile) return;

    const interactiveElements = container.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'
    );

    const warnings: string[] = [];
    interactiveElements.forEach((element) => {
      if (!validateTouchTarget(element as HTMLElement)) {
        const label = element.getAttribute('aria-label') || 
                     element.textContent?.trim() || 
                     element.tagName.toLowerCase();
        warnings.push(`Touch target too small: ${label}`);
      }
    });

    setTouchTargetWarnings(warnings);
  }, [isMobile, options.enableTouchTargetValidation]);

  /**
   * Adds swipe gesture support to an element
   */
  const addSwipeSupport = useCallback((
    element: HTMLElement | null,
    config: SwipeGestureConfig
  ) => {
    if (!element || !options.enableSwipeGestures || !isMobile) return;

    return addSwipeGestureSupport(element, config);
  }, [isMobile, options.enableSwipeGestures]);

  /**
   * Optimizes an element for voice control
   */
  const optimizeForVoiceControl = useCallback((
    element: HTMLElement,
    voiceName: string
  ) => {
    if (options.enableVoiceControl && isMobile) {
      mobileVoiceControl.optimizeForVoiceControl(element, voiceName);
    }
  }, [isMobile, options.enableVoiceControl]);

  /**
   * Enhances navigation elements with mobile-specific ARIA
   */
  const enhanceNavigation = useCallback((
    element: HTMLElement,
    isActive: boolean,
    label: string
  ) => {
    if (isMobile) {
      mobileAria.enhanceNavigation(element, isActive, label);
    }
  }, [isMobile]);

  /**
   * Creates mobile-optimized descriptions for elements
   */
  const createMobileDescription = useCallback((
    element: HTMLElement,
    description: string
  ) => {
    if (isMobile && isScreenReaderActive) {
      mobileAria.createMobileDescription(element, description);
    }
  }, [isMobile, isScreenReaderActive]);

  return {
    isMobile,
    isScreenReaderActive,
    touchTargetWarnings,
    announce,
    announceNavigation,
    validateTouchTargets,
    addSwipeSupport,
    optimizeForVoiceControl,
    enhanceNavigation,
    createMobileDescription,
  };
}

/**
 * Hook specifically for mobile navigation accessibility
 */
export function useMobileNavigation() {
  const mobileA11y = useMobileAccessibility({
    enableSwipeGestures: true,
    enableVoiceControl: true,
    announceNavigation: true,
  });

  const navigationRef = useRef<HTMLElement>(null);

  /**
   * Sets up mobile navigation accessibility features
   */
  const setupMobileNavigation = useCallback((
    navItems: Array<{ id: string; label: string; href: string }>,
    activeId: string,
    onNavigate: (id: string) => void
  ) => {
    if (!navigationRef.current || !mobileA11y.isMobile) return;

    // Add swipe support for navigation
    const cleanup = mobileA11y.addSwipeSupport(navigationRef.current, {
      onSwipeLeft: () => {
        const currentIndex = navItems.findIndex(item => item.id === activeId);
        const nextIndex = (currentIndex + 1) % navItems.length;
        onNavigate(navItems[nextIndex].id);
        mobileA11y.announceNavigation(navItems[nextIndex].label);
      },
      onSwipeRight: () => {
        const currentIndex = navItems.findIndex(item => item.id === activeId);
        const prevIndex = currentIndex === 0 ? navItems.length - 1 : currentIndex - 1;
        onNavigate(navItems[prevIndex].id);
        mobileA11y.announceNavigation(navItems[prevIndex].label);
      },
      threshold: 50,
    });

    // Enhance navigation items
    navItems.forEach((item) => {
      const element = navigationRef.current?.querySelector(`[data-nav-id="${item.id}"]`) as HTMLElement;
      if (element) {
        mobileA11y.enhanceNavigation(element, item.id === activeId, item.label);
        mobileA11y.optimizeForVoiceControl(element, `Navigate to ${item.label}`);
      }
    });

    return cleanup;
  }, [mobileA11y]);

  return {
    ...mobileA11y,
    navigationRef,
    setupMobileNavigation,
  };
}