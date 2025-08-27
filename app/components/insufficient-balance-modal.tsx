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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertCircle,
  Coins,
  ShoppingCart,
  Zap,
  Star,
  Gift,
  ArrowRight,
  X
} from 'lucide-react'

interface TokenPackage {
  id: string
  name: string
  tokens: number
  priceUSD: number
  bonusTokens: number
  popular?: boolean
  bestValue?: boolean
}

interface InsufficientBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchase: (packageId: string) => void
  currentBalance: number
  requiredTokens: number
  predictionTitle: string
}

// Mock token packages - in real app, these would come from API
const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    tokens: 100,
    priceUSD: 4.99,
    bonusTokens: 0
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    tokens: 500,
    priceUSD: 19.99,
    bonusTokens: 50,
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    tokens: 1000,
    priceUSD: 34.99,
    bonusTokens: 150,
    bestValue: true
  },
  {
    id: 'mega',
    name: 'Mega Pack',
    tokens: 2500,
    priceUSD: 79.99,
    bonusTokens: 500
  }
]

export function InsufficientBalanceModal({
  isOpen,
  onClose,
  onPurchase,
  currentBalance,
  requiredTokens,
  predictionTitle
}: InsufficientBalanceModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)

  const tokensNeeded = requiredTokens - currentBalance
  const suggestedPackages = TOKEN_PACKAGES.filter(pkg => 
    (pkg.tokens + pkg.bonusTokens) >= tokensNeeded
  ).sort((a, b) => (a.tokens + a.bonusTokens) - (b.tokens + b.bonusTokens))

  const handlePurchase = (packageId: string) => {
    setSelectedPackage(packageId)
    onPurchase(packageId)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const calculateTokenValue = (pkg: TokenPackage) => {
    const totalTokens = pkg.tokens + pkg.bonusTokens
    return (pkg.priceUSD / totalTokens).toFixed(3)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Insufficient Tokens
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            You need more tokens to make this commitment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Situation */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">Token Balance</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-amber-700">Current balance:</span>
                <span className="font-medium">{currentBalance.toLocaleString()} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">Required for commitment:</span>
                <span className="font-medium">{requiredTokens.toLocaleString()} tokens</span>
              </div>
              <Separator className="bg-amber-200" />
              <div className="flex justify-between">
                <span className="text-amber-700 font-medium">Tokens needed:</span>
                <span className="font-bold text-amber-800">{tokensNeeded.toLocaleString()} tokens</span>
              </div>
            </div>
          </div>

          {/* Prediction Context */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">For prediction:</h4>
            <p className="text-sm text-gray-600">{predictionTitle}</p>
          </div>

          {/* Suggested Packages */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-kai-600" />
              Recommended Token Packages
            </h4>

            {suggestedPackages.length > 0 ? (
              <div className="grid gap-3">
                {suggestedPackages.map((pkg) => {
                  const totalTokens = pkg.tokens + pkg.bonusTokens
                  const isSelected = selectedPackage === pkg.id
                  
                  return (
                    <Card 
                      key={pkg.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        pkg.popular ? 'border-kai-300 bg-kai-50' : 
                        pkg.bestValue ? 'border-green-300 bg-green-50' : 
                        'border-gray-200 hover:border-kai-200'
                      } ${isSelected ? 'ring-2 ring-kai-400' : ''}`}
                      onClick={() => handlePurchase(pkg.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-gray-800">{pkg.name}</h5>
                            {pkg.popular && (
                              <Badge className="bg-kai-100 text-kai-700 text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Popular
                              </Badge>
                            )}
                            {pkg.bestValue && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Best Value
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">{formatPrice(pkg.priceUSD)}</div>
                            <div className="text-xs text-gray-500">
                              ${calculateTokenValue(pkg)}/token
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="font-medium text-gray-800">{pkg.tokens.toLocaleString()}</div>
                              <div className="text-xs text-gray-500">Base tokens</div>
                            </div>
                            {pkg.bonusTokens > 0 && (
                              <>
                                <div className="text-gray-400">+</div>
                                <div className="text-center">
                                  <div className="font-medium text-green-600 flex items-center gap-1">
                                    <Gift className="h-3 w-3" />
                                    {pkg.bonusTokens.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">Bonus</div>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-kai-700">{totalTokens.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Total tokens</div>
                          </div>
                        </div>

                        <div className="bg-white rounded p-2 text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-600">After purchase:</span>
                            <span className="font-medium">
                              {(currentBalance + totalTokens).toLocaleString()} tokens
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Extra tokens:</span>
                            <span className="font-medium text-green-600">
                              +{(totalTokens - tokensNeeded).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <Button
                          className="w-full mt-3 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white"
                          disabled={isSelected}
                        >
                          {isSelected ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Buy {pkg.name}
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-800 mb-2">No suitable packages found</h4>
                <p className="text-sm text-gray-600 mb-4">
                  You need {tokensNeeded.toLocaleString()} tokens, but our current packages don't cover this amount.
                </p>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </div>

          {/* Alternative Actions */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Alternative Options</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• Reduce your token commitment amount</p>
              <p>• Wait for daily bonus tokens (if available)</p>
              <p>• Participate in other predictions to earn tokens</p>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={onClose} className="px-8">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}