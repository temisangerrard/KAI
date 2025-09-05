"use client"

import { useState, useEffect } from 'react'
import { TrendingUp, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface BalanceUpdateIndicatorProps {
  currentBalance: number
  previousBalance?: number
  className?: string
}

export function BalanceUpdateIndicator({ 
  currentBalance, 
  previousBalance, 
  className 
}: BalanceUpdateIndicatorProps) {
  const [showUpdate, setShowUpdate] = useState(false)
  const [balanceChange, setBalanceChange] = useState(0)

  useEffect(() => {
    if (previousBalance !== undefined && currentBalance !== previousBalance) {
      const change = currentBalance - previousBalance
      if (change > 0) {
        setBalanceChange(change)
        setShowUpdate(true)
        
        // Hide the indicator after 5 seconds
        const timer = setTimeout(() => {
          setShowUpdate(false)
        }, 5000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [currentBalance, previousBalance])

  if (!showUpdate || balanceChange <= 0) {
    return null
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 animate-in slide-in-from-top-2 duration-300",
      className
    )}>
      <Badge 
        variant="secondary" 
        className="bg-green-100 text-green-700 border-green-200 animate-pulse"
      >
        <TrendingUp className="h-3 w-3 mr-1" />
        +{balanceChange.toLocaleString()}
      </Badge>
    </div>
  )
}

interface AnimatedBalanceProps {
  balance: number
  isLoading?: boolean
  showAnimation?: boolean
  className?: string
}

export function AnimatedBalance({ 
  balance, 
  isLoading = false, 
  showAnimation = true,
  className 
}: AnimatedBalanceProps) {
  const [displayBalance, setDisplayBalance] = useState(balance)
  const [previousBalance, setPreviousBalance] = useState<number | undefined>()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (balance !== displayBalance && !isLoading) {
      setPreviousBalance(displayBalance)
      
      if (showAnimation && balance > displayBalance) {
        setIsAnimating(true)
        
        // Animate the balance change
        const difference = balance - displayBalance
        const steps = Math.min(20, Math.max(5, Math.floor(difference / 10)))
        const increment = difference / steps
        let currentStep = 0
        
        const timer = setInterval(() => {
          currentStep++
          if (currentStep >= steps) {
            setDisplayBalance(balance)
            setIsAnimating(false)
            clearInterval(timer)
          } else {
            setDisplayBalance(prev => Math.floor(prev + increment))
          }
        }, 50)
        
        return () => clearInterval(timer)
      } else {
        setDisplayBalance(balance)
      }
    }
  }, [balance, displayBalance, isLoading, showAnimation])

  if (isLoading) {
    return (
      <span className={cn("animate-pulse", className)}>
        ...
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={cn(
        "transition-all duration-300",
        isAnimating && "text-green-600 font-bold",
        className
      )}>
        {displayBalance.toLocaleString()}
      </span>
      
      {showAnimation && (
        <BalanceUpdateIndicator 
          currentBalance={balance}
          previousBalance={previousBalance}
        />
      )}
      
      {isAnimating && (
        <Sparkles className="h-4 w-4 text-green-500 animate-spin" />
      )}
    </div>
  )
}