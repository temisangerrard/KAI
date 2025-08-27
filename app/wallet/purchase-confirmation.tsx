"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Download,
  Share2,
  Calendar,
  CreditCard,
  Receipt
} from "lucide-react"
import { TokenRewardAnimation } from "../components/token-reward-animation"

interface PurchaseDetails {
  transactionId: string
  amount: number
  tokens: number
  bonusTokens?: number
  paymentMethod: string
  timestamp: Date
  pricePerToken: number
}

interface PurchaseConfirmationProps {
  isOpen: boolean
  purchaseDetails: PurchaseDetails
  onClose: () => void
  onContinueShopping?: () => void
  onViewWallet?: () => void
}

export function PurchaseConfirmation({ 
  isOpen, 
  purchaseDetails, 
  onClose, 
  onContinueShopping,
  onViewWallet 
}: PurchaseConfirmationProps) {
  const [showAnimation, setShowAnimation] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true)
      setShowDetails(false)
      
      // Show details after animation
      const timer = setTimeout(() => {
        setShowDetails(true)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Calculate total tokens including bonus
  const totalTokens = purchaseDetails.tokens + (purchaseDetails.bonusTokens || 0)

  // Format timestamp
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Handle share purchase
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KAI Token Purchase',
          text: `Just purchased ${totalTokens.toLocaleString()} KAI tokens! Ready to back my opinions on trending topics.`,
          url: window.location.origin
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      const text = `Just purchased ${totalTokens.toLocaleString()} KAI tokens! Ready to back my opinions on trending topics. ${window.location.origin}`
      navigator.clipboard.writeText(text)
    }
  }

  // Handle download receipt
  const handleDownloadReceipt = () => {
    const receiptData = {
      transactionId: purchaseDetails.transactionId,
      date: formatDate(purchaseDetails.timestamp),
      amount: `£${purchaseDetails.amount}`,
      tokens: purchaseDetails.tokens.toLocaleString(),
      bonusTokens: purchaseDetails.bonusTokens || 0,
      totalTokens: totalTokens.toLocaleString(),
      paymentMethod: purchaseDetails.paymentMethod,
      pricePerToken: `£${purchaseDetails.pricePerToken.toFixed(4)}`
    }

    const receiptText = `
KAI TOKEN PURCHASE RECEIPT
========================

Transaction ID: ${receiptData.transactionId}
Date: ${receiptData.date}
Amount Paid: ${receiptData.amount}
Payment Method: ${receiptData.paymentMethod}

TOKENS PURCHASED:
Base Tokens: ${receiptData.tokens}
Bonus Tokens: ${receiptData.bonusTokens}
Total Tokens: ${receiptData.totalTokens}
Price per Token: ${receiptData.pricePerToken}

Thank you for your purchase!
Visit: ${window.location.origin}
    `.trim()

    const blob = new Blob([receiptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kai-receipt-${purchaseDetails.transactionId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white rounded-3xl overflow-hidden">
        {/* Success Header */}
        <CardHeader className="bg-gradient-to-r from-green-400 to-emerald-400 text-white text-center py-8">
          <div className="flex flex-col items-center">
            {showAnimation ? (
              <div className="mb-4">
                <TokenRewardAnimation 
                  amount={totalTokens} 
                  type="purchase" 
                  message="Purchase Complete!" 
                  size="lg"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            )}
            
            <CardTitle className="text-2xl font-bold mb-2">
              Purchase Successful!
            </CardTitle>
            <p className="text-white/90 text-sm">
              Your tokens have been added to your wallet
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Token Summary */}
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-emerald-500" />
                <span className="text-3xl font-bold text-emerald-600">
                  +{totalTokens.toLocaleString()}
                </span>
              </div>
              <p className="text-gray-600 text-sm">KAI Tokens Added</p>
              
              {purchaseDetails.bonusTokens && purchaseDetails.bonusTokens > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-100">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-600">
                      Base: {purchaseDetails.tokens.toLocaleString()}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700">
                      +{purchaseDetails.bonusTokens} Bonus
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <p className="text-gray-600 text-sm">
              Ready to back your opinions and earn rewards!
            </p>
          </div>

          {/* Purchase Details */}
          {showDetails && (
            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Purchase Details
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID</span>
                    <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                      {purchaseDetails.transactionId}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid</span>
                    <span className="font-semibold">£{purchaseDetails.amount}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method</span>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>{purchaseDetails.paymentMethod}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(purchaseDetails.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReceipt}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Receipt
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}

          {/* Main Actions */}
          <div className="space-y-3">
            {onViewWallet && (
              <Button 
                onClick={onViewWallet}
                className="w-full bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 text-white rounded-full py-3"
              >
                View My Wallet
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            <div className="flex gap-3">
              {onContinueShopping && (
                <Button 
                  onClick={onContinueShopping}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full"
                >
                  Buy More
                </Button>
              )}
              
              <Button 
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-kai-50 rounded-xl">
            <h4 className="font-semibold text-kai-800 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              What's Next?
            </h4>
            <ul className="text-sm text-kai-700 space-y-1">
              <li>• Browse trending topics and back your opinions</li>
              <li>• Create your own prediction markets</li>
              <li>• Earn rewards for accurate predictions</li>
              <li>• Join the community discussions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}