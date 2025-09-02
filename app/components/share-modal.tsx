"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { Market, Prediction } from "@/lib/types/database"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  market?: Market
  commitment?: {
    prediction: Prediction
    market: Market
    optionText: string
  }
}

interface SocialPlatform {
  id: string
  name: string
  icon: string
  color: string
  shareUrl: string
}

const socialPlatforms: SocialPlatform[] = [
  {
    id: 'twitter',
    name: 'Twitter',
    icon: '𝕏',
    color: 'bg-black hover:bg-gray-800',
    shareUrl: 'https://twitter.com/intent/tweet'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'f',
    color: 'bg-blue-600 hover:bg-blue-700',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'in',
    color: 'bg-blue-700 hover:bg-blue-800',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite'
  }
]

export function ShareModal({ isOpen, onClose, market, commitment }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  // Determine which data to use
  const shareMarket = commitment?.market || market
  if (!shareMarket) return null

  // Generate shareable URL
  const shareUrl = commitment 
    ? `${window.location.origin}/markets/${shareMarket.id}?ref=commitment`
    : `${window.location.origin}/markets/${shareMarket.id}`
  
  // Generate hashtags based on market category
  const generateHashtags = (category: string): string[] => {
    const categoryHashtags: Record<string, string[]> = {
      'entertainment': ['#Entertainment', '#Predictions', '#KAI'],
      'sports': ['#Sports', '#Predictions', '#KAI'],
      'politics': ['#Politics', '#Predictions', '#KAI'],
      'technology': ['#Tech', '#Technology', '#Predictions', '#KAI'],
      'culture': ['#Culture', '#Predictions', '#KAI'],
      'reality-tv': ['#RealityTV', '#TV', '#Entertainment', '#Predictions', '#KAI'],
      'fashion': ['#Fashion', '#Style', '#Predictions', '#KAI'],
      'music': ['#Music', '#Entertainment', '#Predictions', '#KAI'],
      'other': ['#Predictions', '#KAI']
    }
    return categoryHashtags[category] || categoryHashtags['other']
  }

  const hashtags = generateHashtags(shareMarket.category)
  
  // Create share text based on type
  const shareText = commitment 
    ? `I just backed ${commitment.optionText} with ${commitment.prediction.tokensStaked} KAI tokens on ${shareMarket.title} - ${shareUrl}`
    : `Check out this prediction market: ${shareMarket.title} - ${shareUrl}`
  const shareTextWithHashtags = `${shareText} ${hashtags.join(' ')}`

  const handlePlatformShare = (platform: SocialPlatform) => {
    let url = ''
    
    if (platform.id === 'twitter') {
      // Twitter supports hashtags well, so use the full text with hashtags
      url = `${platform.shareUrl}?text=${encodeURIComponent(shareTextWithHashtags)}`
    } else if (platform.id === 'facebook') {
      // Facebook uses the URL and will pull Open Graph data
      // Include the basic share text as a quote parameter
      url = `${platform.shareUrl}?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    } else if (platform.id === 'linkedin') {
      // LinkedIn sharing with URL
      url = `${platform.shareUrl}?url=${encodeURIComponent(shareUrl)}`
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  const handleCopyLink = async () => {
    try {
      // Copy the share text with URL for better sharing experience
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {commitment ? 'Share Your Prediction' : 'Share Market'}
          </DialogTitle>
          <DialogDescription>
            {commitment 
              ? 'Share your prediction with your friends and followers'
              : 'Share this prediction market with your friends and followers'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Content Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-800 mb-1">
              {shareMarket.title}
            </h4>
            {commitment && (
              <div className="mb-2 p-2 bg-kai-50 rounded border border-kai-200">
                <p className="text-xs text-kai-700 font-medium">
                  Your prediction: {commitment.optionText} with {commitment.prediction.tokensStaked} KAI tokens
                </p>
              </div>
            )}
            <p className="text-xs text-gray-600 line-clamp-2">
              {shareMarket.description}
            </p>
          </div>

          {/* Share Text Preview */}
          <div className="p-3 bg-kai-50 rounded-lg border border-kai-200">
            <p className="text-xs text-kai-700 mb-1 font-medium">Share text:</p>
            <p className="text-sm text-kai-800">{shareText}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {hashtags.map((hashtag) => (
                <span key={hashtag} className="text-xs text-kai-600 bg-kai-100 px-2 py-1 rounded">
                  {hashtag}
                </span>
              ))}
            </div>
          </div>

          {/* Social Platform Buttons */}
          <div className="space-y-2">
            {socialPlatforms.map((platform) => (
              <Button
                key={platform.id}
                onClick={() => handlePlatformShare(platform)}
                className={`w-full justify-start text-white ${platform.color}`}
              >
                <span className="text-lg mr-3">{platform.icon}</span>
                Share on {platform.name}
              </Button>
            ))}
          </div>

          {/* Copy Link Button */}
          <div className="pt-2 border-t">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full justify-start"
            >
              {copied ? (
                <Check className="w-4 h-4 mr-3 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 mr-3" />
              )}
              {copied ? 'Link Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}