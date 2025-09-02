"use client"

import { useEffect, useState } from "react"
import { mobile } from "@/lib/mobile-consolidated"

interface ShareData {
  title: string
  text: string
  url: string
}

interface NativeShareProps {
  shareData: ShareData
  fallback: () => void
  children: React.ReactNode
}

/**
 * Component that provides native mobile sharing capabilities using the Web Share API
 * Falls back to provided fallback function on desktop or unsupported browsers
 */
export function NativeShare({ shareData, fallback, children }: NativeShareProps) {
  const [canUseNativeShare, setCanUseNativeShare] = useState(false)

  useEffect(() => {
    // Check if Web Share API is available and we're on a mobile device
    const isMobile = mobile.isMobileViewport()
    const hasWebShareAPI = typeof navigator !== 'undefined' && 'share' in navigator
    
    setCanUseNativeShare(isMobile && hasWebShareAPI)
  }, [])

  const handleShare = async () => {
    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        })
      } catch (error) {
        // User cancelled the share or an error occurred
        // Fall back to the modal if the native share fails
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Native share failed, falling back to modal:', error)
          fallback()
        }
      }
    } else {
      // Use fallback (share modal) for desktop or unsupported browsers
      fallback()
    }
  }

  // Clone the children and add the onClick handler
  return (
    <div onClick={handleShare} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}