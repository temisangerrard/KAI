"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"

interface TokenRewardAnimationProps {
  amount: number;
  type: "win" | "prediction" | "bonus";
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function TokenRewardAnimation({
  amount,
  type,
  message = "Tokens Earned!",
  size = "md"
}: TokenRewardAnimationProps) {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)

  // Define colors based on type
  const colors = {
    win: "text-amber-500",
    prediction: "text-kai-500",

    bonus: "text-primary-500"
  }

  // Define sizes
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl"
  }

  useEffect(() => {
    // Animate count from 0 to amount
    let start = 0
    const end = amount
    const duration = 1500
    const step = Math.max(1, Math.floor(end / (duration / 16)))
    
    const timer = setInterval(() => {
      start += step
      setCount(start)
      
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
        
        // Keep showing the final amount for a moment
        setTimeout(() => {
          setIsAnimating(false)
        }, 500)
      }
    }, 16)
    
    return () => clearInterval(timer)
  }, [amount])

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${sizes[size]} font-bold ${colors[type]}`}>
        {/* Animated sparkles */}
        {isAnimating && (
          <>
            <div className="absolute -top-2 -left-2 animate-ping">
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="absolute -bottom-2 -right-2 animate-ping" style={{ animationDelay: "0.3s" }}>
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 animate-ping" style={{ animationDelay: "0.6s" }}>
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -right-4 animate-ping" style={{ animationDelay: "0.9s" }}>
              <Sparkles className="h-3 w-3" />
            </div>
          </>
        )}
        
        {/* Token amount with plus sign */}
        <div className="flex items-center gap-1">
          <Sparkles className={`h-${size === "xl" ? "8" : size === "lg" ? "6" : size === "md" ? "5" : "4"} w-${size === "xl" ? "8" : size === "lg" ? "6" : size === "md" ? "5" : "4"}`} />
          <span>+{count.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Message */}
      <p className={`mt-2 font-medium ${colors[type]}`}>{message}</p>
    </div>
  )
}