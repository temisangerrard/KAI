"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, X, Sparkles, Share2 } from "lucide-react"
import { TokenRewardAnimation } from "./token-reward-animation"

interface PredictionWinCelebrationProps {
  predictionTitle: string;
  option: string;
  tokensWon: number;
  onClose: () => void;
}

export function PredictionWinCelebration({
  predictionTitle,
  option,
  tokensWon,
  onClose
}: PredictionWinCelebrationProps) {
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
      <Card className="w-full max-w-md bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 overflow-hidden">
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
                backgroundColor: ['#f59e0b', '#ec4899', '#a855f7', '#2dd4bf', '#10b981'][Math.floor(Math.random() * 5)],
                borderRadius: '50%',
                animationDelay: `${Math.random() * 1.5}s`,
                animationDuration: `${Math.random() * 2 + 2}s`
              }}
            />
          ))}

          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">You Won!</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-amber-800 mb-2">Your prediction was correct!</h4>
              <p className="text-gray-600">
                <span className="font-medium">{option}</span> was the winning outcome for:
              </p>
              <p className="text-sm font-medium text-gray-700 mt-1">"{predictionTitle}"</p>
            </div>

            {/* Token animation */}
            <div className="my-8">
              {showAnimation && (
                <TokenRewardAnimation 
                  amount={tokensWon} 
                  type="win" 
                  message="Tokens Earned!" 
                  size="xl"
                />
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Claim {tokensWon} Tokens
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Your Win
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Keep making great predictions to earn more tokens!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}