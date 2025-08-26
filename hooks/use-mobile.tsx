import * as React from "react"
import { mobile, breakpoints } from "@/lib/mobile-consolidated"

// Breakpoint definitions from our consolidated mobile system
const MOBILE_BREAKPOINT = breakpoints.md // 768px

/**
 * Hook to detect if the current viewport is mobile-sized
 * @returns boolean indicating if the viewport is mobile-sized
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(mobile.isMobileViewport())
    }
    mql.addEventListener("change", onChange)
    setIsMobile(mobile.isMobileViewport())
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Hook to detect the current device type based on viewport size
 * @returns object with boolean flags for different device types
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
  })

  React.useEffect(() => {
    const updateDeviceType = () => {
      setDeviceType(mobile.getDeviceType())
    }

    // Initial check
    updateDeviceType()

    // Add event listener
    window.addEventListener("resize", updateDeviceType)

    // Cleanup
    return () => window.removeEventListener("resize", updateDeviceType)
  }, [])

  return deviceType
}

/**
 * Hook to get the current breakpoint
 * @returns current breakpoint as a string ('xs', 'sm', 'md', 'lg', 'xl', '2xl')
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<keyof typeof breakpoints>("xs")

  React.useEffect(() => {
    const updateBreakpoint = () => {
      setBreakpoint(mobile.getCurrentBreakpoint())
    }

    // Initial check
    updateBreakpoint()

    // Add event listener
    window.addEventListener("resize", updateBreakpoint)

    // Cleanup
    return () => window.removeEventListener("resize", updateBreakpoint)
  }, [])

  return breakpoint
}
