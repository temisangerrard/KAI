import { renderHook, act } from '@testing-library/react'
import { useIsMobile, useDeviceType, useBreakpoint } from '@/hooks/use-mobile'

// Mock the mobile-consolidated module
jest.mock('@/lib/mobile-consolidated', () => ({
  mobile: {
    isMobileViewport: jest.fn(),
    getDeviceType: jest.fn(),
    getCurrentBreakpoint: jest.fn(),
  },
  breakpoints: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
}))

import { mobile } from '@/lib/mobile-consolidated'

describe('Mobile Detection Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useIsMobile', () => {
    it('should return true for mobile viewport', () => {
      ;(mobile.isMobileViewport as jest.Mock).mockReturnValue(true)
      
      const { result } = renderHook(() => useIsMobile())
      
      expect(result.current).toBe(true)
    })

    it('should return false for desktop viewport', () => {
      ;(mobile.isMobileViewport as jest.Mock).mockReturnValue(false)
      
      const { result } = renderHook(() => useIsMobile())
      
      expect(result.current).toBe(false)
    })

    it('should update when viewport changes', () => {
      ;(mobile.isMobileViewport as jest.Mock).mockReturnValue(false)
      
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(false)
      
      // Simulate viewport change
      ;(mobile.isMobileViewport as jest.Mock).mockReturnValue(true)
      
      act(() => {
        // Trigger the media query change event
        const mediaQuery = window.matchMedia('(max-width: 767px)')
        const event = new Event('change')
        mediaQuery.dispatchEvent(event)
      })
      
      expect(result.current).toBe(true)
    })

    it('should handle undefined initial state', () => {
      ;(mobile.isMobileViewport as jest.Mock).mockReturnValue(undefined)
      
      const { result } = renderHook(() => useIsMobile())
      
      expect(result.current).toBe(false) // Should default to false for undefined
    })
  })

  describe('useDeviceType', () => {
    it('should return correct device type for mobile', () => {
      const mockDeviceType = {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      }
      ;(mobile.getDeviceType as jest.Mock).mockReturnValue(mockDeviceType)
      
      const { result } = renderHook(() => useDeviceType())
      
      expect(result.current).toEqual(mockDeviceType)
    })

    it('should return correct device type for desktop', () => {
      const mockDeviceType = {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      }
      ;(mobile.getDeviceType as jest.Mock).mockReturnValue(mockDeviceType)
      
      const { result } = renderHook(() => useDeviceType())
      
      expect(result.current).toEqual(mockDeviceType)
    })

    it('should update device type on window resize', () => {
      const initialDeviceType = {
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isLargeDesktop: false,
      }
      const updatedDeviceType = {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
      }
      
      ;(mobile.getDeviceType as jest.Mock).mockReturnValue(initialDeviceType)
      
      const { result } = renderHook(() => useDeviceType())
      expect(result.current).toEqual(initialDeviceType)
      
      // Simulate window resize
      ;(mobile.getDeviceType as jest.Mock).mockReturnValue(updatedDeviceType)
      
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })
      
      expect(result.current).toEqual(updatedDeviceType)
    })
  })

  describe('useBreakpoint', () => {
    it('should return correct breakpoint for mobile', () => {
      ;(mobile.getCurrentBreakpoint as jest.Mock).mockReturnValue('sm')
      
      const { result } = renderHook(() => useBreakpoint())
      
      expect(result.current).toBe('sm')
    })

    it('should return correct breakpoint for desktop', () => {
      ;(mobile.getCurrentBreakpoint as jest.Mock).mockReturnValue('lg')
      
      const { result } = renderHook(() => useBreakpoint())
      
      expect(result.current).toBe('lg')
    })

    it('should update breakpoint on window resize', () => {
      ;(mobile.getCurrentBreakpoint as jest.Mock).mockReturnValue('sm')
      
      const { result } = renderHook(() => useBreakpoint())
      expect(result.current).toBe('sm')
      
      // Simulate window resize to larger screen
      ;(mobile.getCurrentBreakpoint as jest.Mock).mockReturnValue('xl')
      
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })
      
      expect(result.current).toBe('xl')
    })

    it('should handle all breakpoint values', () => {
      const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const
      
      breakpoints.forEach(breakpoint => {
        ;(mobile.getCurrentBreakpoint as jest.Mock).mockReturnValue(breakpoint)
        
        const { result } = renderHook(() => useBreakpoint())
        expect(result.current).toBe(breakpoint)
      })
    })
  })

  describe('Hook Cleanup', () => {
    it('should remove event listeners on unmount for useIsMobile', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      const { unmount } = renderHook(() => useIsMobile())
      
      unmount()
      
      // Should have called removeEventListener for the media query
      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    it('should remove event listeners on unmount for useDeviceType', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      const { unmount } = renderHook(() => useDeviceType())
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should remove event listeners on unmount for useBreakpoint', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
      
      const { unmount } = renderHook(() => useBreakpoint())
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('Edge Cases', () => {
    it('should handle window object not being available (SSR)', () => {
      // Mock window being undefined (SSR scenario)
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useIsMobile())
      
      // Should not crash and should return false
      expect(result.current).toBe(false)
      
      // Restore window
      global.window = originalWindow
    })

    it('should handle matchMedia not being available', () => {
      const originalMatchMedia = window.matchMedia
      delete (window as any).matchMedia
      
      const { result } = renderHook(() => useIsMobile())
      
      // Should not crash
      expect(result.current).toBe(false)
      
      // Restore matchMedia
      window.matchMedia = originalMatchMedia
    })
  })
})