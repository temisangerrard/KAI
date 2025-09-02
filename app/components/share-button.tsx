"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { ShareModal } from "./share-modal"
import { NativeShare } from "./native-share"
import { Market, Prediction } from "@/lib/types/database"

interface ShareButtonProps {
  market?: Market
  commitment?: {
    prediction: Prediction
    market: Market
    optionText: string
  }
  variant?: "button" | "icon"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ShareButton({ 
  market, 
  commitment,
  variant = "icon", 
  size = "md", 
  className = "" 
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleShare = () => {
    setIsModalOpen(true)
  }

  // Generate share data for native sharing
  const generateShareData = () => {
    const shareMarket = commitment?.market || market
    if (!shareMarket) return null

    const shareUrl = commitment 
      ? `${window.location.origin}/markets/${shareMarket.id}?ref=commitment`
      : `${window.location.origin}/markets/${shareMarket.id}`

    const shareText = commitment 
      ? `I just backed ${commitment.optionText} with ${commitment.prediction.tokensStaked} KAI tokens on ${shareMarket.title}`
      : `Check out this prediction market: ${shareMarket.title}`

    return {
      title: shareMarket.title,
      text: shareText,
      url: shareUrl
    }
  }

  const shareData = generateShareData()

  if (!shareData) return null

  if (variant === "button") {
    return (
      <>
        <NativeShare shareData={shareData} fallback={handleShare}>
          <Button
            className={className}
            size={size}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </NativeShare>
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          market={market}
          commitment={commitment}
        />
      </>
    )
  }

  return (
    <>
      <NativeShare shareData={shareData} fallback={handleShare}>
        <Button 
          variant="outline" 
          size="icon" 
          className={`rounded-full border-kai-200 ${className}`}
        >
          <Share2 className="w-4 h-4 text-kai-500" />
        </Button>
      </NativeShare>
      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        market={market}
        commitment={commitment}
      />
    </>
  )
}