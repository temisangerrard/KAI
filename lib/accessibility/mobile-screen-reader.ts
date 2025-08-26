/**
 * Mobile Screen Reader Optimizations
 * 
 * Utilities and components specifically designed for mobile screen readers
 * including VoiceOver (iOS) and TalkBack (Android).
 */

/**
 * Mobile screen reader detection and optimization utilities
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

  /**
   * Detects the type of mobile screen reader being used
   */
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

  /**
   * Gets the detected screen reader type
   */
  public getScreenReaderType(): 'voiceover' | 'talkback' | 'unknown' {
    if (this.isVoiceOver) return 'voiceover';
    if (this.isTalkBack) return 'talkback';
    return 'unknown';
  }

  /**
   * Checks if a mobile screen reader is active
   */
  public isScreenReaderActive(): boolean {
    return this.isActive;
  }

  /**
   * Creates optimized ARIA labels for mobile screen readers
   */
  public createOptimizedLabel(
    baseLabel: string, 
    context?: string, 
    state?: string,
    instructions?: string
  ): string {
    let label = baseLabel;

    // Add context if provided
    if (context) {
      label += `, ${context}`;
    }

    // Add state information
    if (state) {
      label += `, ${state}`;
    }

    // Add instructions for mobile users
    if (instructions) {
      label += `. ${instructions}`;
    }

    // Optimize for specific screen readers
    if (this.isVoiceOver) {
      // VoiceOver prefers more descriptive labels
      return this.optimizeForVoiceOver(label);
    } else if (this.isTalkBack) {
      // TalkBack prefers concise labels
      return this.optimizeForTalkBack(label);
    }

    return label;
  }

  /**
   * Optimizes labels specifically for VoiceOver
   */
  private optimizeForVoiceOver(label: string): string {
    // VoiceOver handles punctuation well and benefits from detailed descriptions
    return label.replace(/\s+/g, ' ').trim();
  }

  /**
   * Optimizes labels specifically for TalkBack
   */
  private optimizeForTalkBack(label: string): string {
    // TalkBack prefers shorter, more direct labels
    return label
      .replace(/\s+/g, ' ')
      .replace(/[,;]/g, '.') // Convert commas to periods for better pauses
      .trim();
  }

  /**
   * Creates mobile-optimized descriptions for complex UI elements
   */
  public createMobileDescription(
    element: HTMLElement,
    description: string,
    role?: string
  ): void {
    const descId = `${element.id || 'element'}-mobile-desc`;
    
    let descElement = document.getElementById(descId);
    if (!descElement) {
      descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'sr-only mobile-sr-optimized';
      document.body.appendChild(descElement);
    }

    // Optimize description for mobile screen readers
    let optimizedDescription = description;
    
    if (role) {
      optimizedDescription = `${role}: ${description}`;
    }

    // Add mobile-specific instructions
    if (this.isVoiceOver) {
      optimizedDescription += '. Double-tap to activate.';
    } else if (this.isTalkBack) {
      optimizedDescription += '. Tap to select.';
    }

    descElement.textContent = optimizedDescription;
    element.setAttribute('aria-describedby', descId);
  }

  /**
   * Announces content changes to mobile screen readers
   */
  public announceToMobile(
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    delay: number = 100
  ): void {
    if (!this.isActive) return;

    // Add delay to ensure screen reader is ready
    setTimeout(() => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only mobile-sr-optimized';
      
      // Optimize message for mobile
      let optimizedMessage = message;
      if (this.isVoiceOver) {
        optimizedMessage = this.optimizeForVoiceOver(message);
      } else if (this.isTalkBack) {
        optimizedMessage = this.optimizeForTalkBack(message);
      }
      
      announcement.textContent = optimizedMessage;
      document.body.appendChild(announcement);

      // Remove after announcement
      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    }, delay);
  }

  /**
   * Optimizes form elements for mobile screen readers
   */
  public optimizeFormElement(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    label: string,
    description?: string,
    error?: string
  ): void {
    // Ensure proper labeling
    const labelId = `${element.id}-label`;
    let labelElement = document.getElementById(labelId) as HTMLLabelElement;
    
    if (!labelElement) {
      labelElement = document.createElement('label');
      labelElement.id = labelId;
      labelElement.htmlFor = element.id;
      element.parentNode?.insertBefore(labelElement, element);
    }

    labelElement.textContent = this.createOptimizedLabel(
      label,
      element.type || element.tagName.toLowerCase(),
      element.required ? 'required' : undefined,
      this.getFormInstructions(element)
    );

    // Add description if provided
    if (description) {
      this.createMobileDescription(element, description, 'form field');
    }

    // Handle error states
    if (error) {
      const errorId = `${element.id}-error`;
      let errorElement = document.getElementById(errorId);
      
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = errorId;
        errorElement.className = 'sr-only mobile-sr-optimized';
        errorElement.setAttribute('aria-live', 'assertive');
        element.parentNode?.appendChild(errorElement);
      }

      errorElement.textContent = `Error: ${error}`;
      element.setAttribute('aria-describedby', 
        `${element.getAttribute('aria-describedby') || ''} ${errorId}`.trim());
      element.setAttribute('aria-invalid', 'true');
    } else {
      element.removeAttribute('aria-invalid');
    }
  }

  /**
   * Gets mobile-specific instructions for form elements
   */
  private getFormInstructions(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    
    if (this.isVoiceOver) {
      switch (tagName) {
        case 'input':
          return 'Double-tap to edit';
        case 'select':
          return 'Double-tap to open options';
        case 'button':
          return 'Double-tap to activate';
        default:
          return 'Double-tap to interact';
      }
    } else if (this.isTalkBack) {
      switch (tagName) {
        case 'input':
          return 'Tap to edit';
        case 'select':
          return 'Tap to select option';
        case 'button':
          return 'Tap to activate';
        default:
          return 'Tap to interact';
      }
    }

    return '';
  }

  /**
   * Optimizes navigation elements for mobile screen readers
   */
  public optimizeNavigation(
    navElement: HTMLElement,
    items: Array<{ id: string; label: string; isActive: boolean }>
  ): void {
    // Set up navigation container
    navElement.setAttribute('role', 'tablist');
    navElement.setAttribute('aria-orientation', 'horizontal');
    
    // Add mobile-specific instructions
    this.createMobileDescription(
      navElement,
      'Navigation tabs. Swipe left or right to move between tabs, or tap to select.',
      'navigation'
    );

    // Optimize each navigation item
    items.forEach((item, index) => {
      const itemElement = navElement.querySelector(`[data-nav-id="${item.id}"]`) as HTMLElement;
      if (itemElement) {
        itemElement.setAttribute('role', 'tab');
        itemElement.setAttribute('aria-selected', item.isActive.toString());
        itemElement.setAttribute('aria-setsize', items.length.toString());
        itemElement.setAttribute('aria-posinset', (index + 1).toString());
        
        const optimizedLabel = this.createOptimizedLabel(
          item.label,
          'tab',
          item.isActive ? 'selected' : 'not selected',
          item.isActive ? undefined : (this.isVoiceOver ? 'Double-tap to select' : 'Tap to select')
        );
        
        itemElement.setAttribute('aria-label', optimizedLabel);
      }
    });
  }

  /**
   * Adds voice control support for mobile elements
   */
  public addVoiceControlSupport(
    element: HTMLElement,
    voiceCommand: string,
    alternativeCommands?: string[]
  ): void {
    // Set primary voice command
    element.setAttribute('data-voice-command', voiceCommand.toLowerCase());
    element.setAttribute('aria-label', voiceCommand);

    // Add alternative commands
    if (alternativeCommands && alternativeCommands.length > 0) {
      element.setAttribute('data-voice-alternatives', alternativeCommands.join(','));
    }

    // Ensure element is focusable for voice control
    if (!element.hasAttribute('tabindex') && !['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase())) {
      element.setAttribute('tabindex', '0');
    }
  }

  /**
   * Creates responsive content that adapts to mobile screen readers
   */
  public createResponsiveContent(
    element: HTMLElement,
    desktopContent: string,
    mobileContent: string
  ): void {
    if (this.isActive) {
      // Use mobile-optimized content
      element.textContent = mobileContent;
      element.setAttribute('aria-label', this.createOptimizedLabel(mobileContent));
    } else {
      // Use desktop content
      element.textContent = desktopContent;
    }
  }

}

/**
 * Convenience function to get the mobile screen reader optimizer instance
 */
export function getMobileScreenReaderOptimizer(): MobileScreenReaderOptimizer {
  return MobileScreenReaderOptimizer.getInstance();
}