"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  AlertCircle,
  Coins,
  TrendingUp,
  Target,
  Clock,
  Zap,
  ArrowRight,
  Trophy,
  X
} from 'lucide-react'

interface TokenCommitmentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  predictionTitle: string
  position: 'yes' | 'no'
  tokensToCommit: number
  currentOdds: number
  potentialWinnings: number
  availableTokens: number
  isLoading?: boolean
}

export function TokenCommitmentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  predictionTitle,
  position,
  tokensToCommit,
  currentOdds,
  potentialWinnings,
  availableTokens,
  isLoading = false
}: TokenCommitmentConfirmationModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      setError(null)
      await onConfirm()
    } catch (err) {
      console.error('Error confirming commitment:', err)
      setError(err instanceof Error ? err.message : 'Failed to commit tokens')
    } finally {
      setIsConfirming(false)
    }
  }

  const roi = tokensToCommit > 0 ? Math.round(((potentialWinnings - tokensToCommit) / tokensToCommit) * 100) : 0
  const remainingTokens = availableTokens - tokensToCommit

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-kai-600" />
              Confirm Token Commitment
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isConfirming}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Review your commitment details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prediction Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Prediction</h4>
            <p className="text-sm text-gray-600 mb-3">{predictionTitle}</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant={position === 'yes' ? 'default' : 'secondary'}
                className={position === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              >
                {position.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                Current odds: {currentOdds.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Commitment Summary */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <Coins className="h-4 w-4 text-kai-600" />
              Commitment Summary
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tokens to commit</span>
                <span className="font-medium">{tokensToCommit.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current odds</span>
                <span className="font-medium">{currentOdds.toFixed(2)}x</span>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Remaining balance</span>
                <span className="font-medium text-gray-800">
                  {remainingTokens.toLocaleString()} tokens
                </span>
              </div>
            </div>
          </div>

          {/* Potential Outcomes */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-kai-600" />
              Potential Outcomes
            </h4>

            {/* Win Scenario */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">If you win</span>
                </div>
                <span className="font-bold text-green-700">
                  +{potentialWinnings.toLocaleString()} tokens
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Return on Investment</span>
                <span className="font-medium text-green-600">
                  {roi > 0 ? '+' : ''}{roi}%
                </span>
              </div>
            </div>

            {/* Loss Scenario */}
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">If you lose</span>
                </div>
                <span className="font-bold text-red-700">
                  -{tokensToCommit.toLocaleString()} tokens
                </span>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Once committed, your tokens will be locked until the prediction resolves. 
              You cannot cancel or modify your commitment after confirmation.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isConfirming}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirming || isLoading}
              className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white"
            >
              {isConfirming ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Confirming...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Confirm Commitment
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </div>

          {/* Final Confirmation Text */}
          <div className="text-xs text-gray-500 text-center">
            By confirming, you agree to commit {tokensToCommit.toLocaleString()} tokens to this prediction.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}