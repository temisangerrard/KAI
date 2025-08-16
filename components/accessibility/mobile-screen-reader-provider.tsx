/**
 * Mobile Screen Reader Provider
 * 
 * React context provider for mobile screen reader optimizations
 */

"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMobileScreenReaderOptimizer } from '@/lib/accessibility/mobile-screen-reader';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileScreenReaderContextType {
  isActive: boolean;
  screenReaderType: 'voiceover' | 'talkback' | 'unknown';
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  optimizeLabel: (label: string, context?: string, state?: string) => string;
  optimizeFormElement: (
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    label: string,
    description?: string,
    error?: string
  ) => void;
  optimizeNavigation: (
    navElement: HTMLElement,
    items: Array<{ id: string; label: string; isActive: boolean }>
  ) => void;
  addVoiceControlSupport: (
    element: HTMLElement,
    voiceCommand: string,
    alternatives?: string[]
  ) => void;
  createResponsiveContent: (
    element: HTMLElement,
    desktopContent: string,
    mobileContent: string
  ) => void;
}

const MobileScreenReaderContext = createContext<MobileScreenReaderContextType | null>(null);

interface MobileScreenReaderProviderProps {
  children: React.ReactNode;
}

export function MobileScreenReaderProvider({ children }: MobileScreenReaderProviderProps) {
  const isMobile = useIsMobile();
  const [optimizer] = useState(() => getMobileScreenReaderOptimizer());
  const [isActive, setIsActive] = useState(false);
  const [screenReaderType, setScreenReaderType] = useState<'voiceover' | 'talkback' | 'unknown'>('unknown');

  // Initialize screen reader detection
  useEffect(() => {
    if (isMobile) {
      setIsActive(optimizer.isScreenReaderActive());
      setScreenReaderType(optimizer.getScreenReaderType());
    } else {
      setIsActive(false);
      setScreenReaderType('unknown');
    }
  }, [isMobile, optimizer]);

  // Announce messages to screen reader
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (isActive) {
      optimizer.announceToMobile(message, priority);
    }
  }, [isActive, optimizer]);

  // Optimize labels for mobile screen readers
  const optimizeLabel = useCallback((
    label: string, 
    context?: string, 
    state?: string
  ) => {
    if (isActive) {
      return optimizer.createOptimizedLabel(label, context, state);
    }
    return label;
  }, [isActive, optimizer]);

  // Optimize form elements
  const optimizeFormElement = useCallback((
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    label: string,
    description?: string,
    error?: string
  ) => {
    if (isActive) {
      optimizer.optimizeFormElement(element, label, description, error);
    }
  }, [isActive, optimizer]);

  // Optimize navigation
  const optimizeNavigation = useCallback((
    navElement: HTMLElement,
    items: Array<{ id: string; label: string; isActive: boolean }>
  ) => {
    if (isActive) {
      optimizer.optimizeNavigation(navElement, items);
    }
  }, [isActive, optimizer]);

  // Add voice control support
  const addVoiceControlSupport = useCallback((
    element: HTMLElement,
    voiceCommand: string,
    alternatives?: string[]
  ) => {
    if (isActive) {
      optimizer.addVoiceControlSupport(element, voiceCommand, alternatives);
    }
  }, [isActive, optimizer]);

  // Create responsive content
  const createResponsiveContent = useCallback((
    element: HTMLElement,
    desktopContent: string,
    mobileContent: string
  ) => {
    optimizer.createResponsiveContent(element, desktopContent, mobileContent);
  }, [optimizer]);

  const contextValue: MobileScreenReaderContextType = {
    isActive,
    screenReaderType,
    announce,
    optimizeLabel,
    optimizeFormElement,
    optimizeNavigation,
    addVoiceControlSupport,
    createResponsiveContent,
  };

  return (
    <MobileScreenReaderContext.Provider value={contextValue}>
      {children}
    </MobileScreenReaderContext.Provider>
  );
}

/**
 * Hook to use mobile screen reader context
 */
export function useMobileScreenReader() {
  const context = useContext(MobileScreenReaderContext);
  if (!context) {
    throw new Error('useMobileScreenReader must be used within a MobileScreenReaderProvider');
  }
  return context;
}

/**
 * Higher-order component to add mobile screen reader optimizations
 */
export function withMobileScreenReaderOptimization<P extends object>(
  Component: React.ComponentType<P>
) {
  return function MobileScreenReaderOptimizedComponent(props: P) {
    return (
      <MobileScreenReaderProvider>
        <Component {...props} />
      </MobileScreenReaderProvider>
    );
  };
}