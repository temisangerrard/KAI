"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, X, Sparkles, Share2, Eye } from "lucide-react"
import { TokenRewardAnimation } from "./token-reward-animation"

interface MarketCreationSuccessProps {
  title: string;
  message: string;
  marketId: string;
  onClose: () => void;
  onViewMarket?: () => void;
}

export function MarketCreationSuccess({
  title,
  message,
  marketId,
  onClose,
  onViewMarket
}: MarketCreationSuccessProps) {
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    // Start animation after a short delay
    const timer = setTimeout(() => {
      setShowAnimation(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-gradient-to-br from-kai-50 to-kai-100 border-kai-200 overflow-hidden">
        <CardContent className="p-0">
          {/* Confetti animation */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}px`,
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                backgroundColor: ['#10b981', '#ec4899', '#a855f7', '#2dd4bf', '#f59e0b'][Math.floor(Math.random() * 5)],
                borderRadius: '50%',
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${Math.random() * 2 + 2}s`
              }}
            />
          ))}

          {/* Header */}
          <div className="bg-gradient-to-r from-kai-500 to-kai-400 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">{title}</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-kai-800 mb-2">Success!</h4>
              <p className="text-gray-600">
                {message}
              </p>
            </div>

            {/* Success animation */}
            <div className="my-8">
              {showAnimation && (
                <TokenRewardAnimation 
                  amount={50} 
                  type="creation" 
                  message="Creator Reward!" 
                  size="xl"
                />
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {onViewMarket && (
                <Button 
                  className="w-full bg-gradient-to-r from-kai-500 to-kai-400 hover:from-kai-600 hover:to-kai-500 text-white"
                  onClick={onViewMarket}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Your Market
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full border-kai-200 text-kai-700 hover:bg-kai-50"
                onClick={onClose}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Create Another Market
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Your market is now live and ready for predictions!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}