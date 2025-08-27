"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  WalletIcon,
  TrendingUp,
  Gift,
  Calendar
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Navigation } from "../components/navigation"
import { TopNavigation } from "../components/top-navigation"
import { HamburgerMenu } from "../components/hamburger-menu"
import { useHamburgerMenu } from "../../hooks/use-hamburger-menu"
import { useAuth } from "../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { TokenPurchaseModal } from "./token-purchase-modal"
import { WalletBalance } from "./wallet-balance"
import { PurchaseConfirmation } from "./purchase-confirmation"
import { WalletDashboard } from "./wallet-dashboard"
import { UserBalance } from "@/lib/types/token"

export default function WalletPage() {
  const { user } = useAuth();
  const { balance, availableTokens, refreshBalance } = useTokenBalance();
  const router = useRouter();
  const hamburgerMenu = useHamburgerMenu()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Handle successful token purchase
  const handlePurchaseSuccess = (tokens: number) => {
    // Refresh balance from database
    refreshBalance()

    // Create purchase details for confirmation
    setPurchaseDetails({
      transactionId: `TXN-${Date.now()}`,
      amount: Math.ceil(tokens / 100), // Assuming £1 = 100 tokens
      tokens: tokens,
      bonusTokens: tokens > 2500 ? Math.floor(tokens * 0.1) : 0,
      paymentMethod: "Credit Card",
      timestamp: new Date(),
      pricePerToken: 0.01
    })

    setShowConfirmation(true)
  }

  // Handle purchase modal close
  const handlePurchaseModalClose = () => {
    setShowPurchaseModal(false)
  }

  // Handle confirmation close
  const handleConfirmationClose = () => {
    setShowConfirmation(false)
    setPurchaseDetails(null)
  }

  // Handle withdraw click
  const handleWithdrawClick = () => {
    // TODO: Implement withdraw functionality
    console.log("Withdraw clicked")
  }

  // Wallet page now focuses on balance display only

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50">
      
      {/* Desktop Top Navigation */}
      <TopNavigation />
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-primary-400 to-kai-600 p-4 text-white">
            <div className="mb-6">
              <h1 className="text-xl font-bold">My Wallet</h1>
              <p className="text-sm opacity-90">Manage your tokens</p>
            </div>

            {/* Mobile Balance Card */}
            <Card className="bg-white/20 border-0 text-white">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6" />
                  <span className="text-3xl font-bold">{availableTokens.toLocaleString()}</span>
                </div>
                <p className="text-sm opacity-90 mb-4">Available Tokens</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowPurchaseModal(true)}
                    className="flex-1 bg-white text-primary-600 hover:bg-gray-100 rounded-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Buy Tokens
                  </Button>
                  <Button
                    onClick={handleWithdrawClick}
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 rounded-full bg-transparent"
                  >
                    <WalletIcon className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Token Stats */}
          <div className="p-4 pb-0">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-8 h-8 text-kai-500" />
                  <span className="text-2xl font-bold text-gray-800">{availableTokens.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">Total Tokens</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Mobile Quick Actions & Content */}
          <div className="p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs font-medium text-gray-700">Buy More</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-gray-700">Withdraw</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary-50 to-kai-50">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />

                </div>
                <p className="text-xs font-medium text-gray-700">Rewards</p>
              </CardContent>
            </Card>
          </div>

          {/* Simplified wallet - no transaction history */}
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Your wallet shows your current token balance above.</p>
            <p className="text-sm text-gray-500">Transaction history and detailed analytics coming soon.</p>
          </div>
        </div>



          <Navigation />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text cursor-pointer"
                  onClick={() => router.push('/')}
                >
                  KAI
                </div>
                <div className="w-1 h-6 bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-800">Wallet</h1>
              </div>
              <button 
                onClick={() => router.push('/markets')}
                className="flex items-center gap-2 text-gray-600 hover:text-kai-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Markets</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-kai-600" />
              <span className="font-semibold text-gray-800">{availableTokens.toLocaleString()} tokens</span>
            </div>
          </div>

          {/* Desktop Wallet Dashboard */}
          <WalletDashboard
            onPurchaseClick={() => setShowPurchaseModal(true)}
            onWithdrawClick={handleWithdrawClick}
            onViewPrediction={(predictionId) => {
              // Navigate to prediction page
              router.push(`/markets/${predictionId}`)
            }}
          />
        </div>
      </div>

      {/* Token Purchase Modal */}
      <TokenPurchaseModal
        isOpen={showPurchaseModal}
        onClose={handlePurchaseModalClose}
        onSuccess={handlePurchaseSuccess}
      />

      {/* Purchase Confirmation Modal */}
      {purchaseDetails && (
        <PurchaseConfirmation
          isOpen={showConfirmation}
          purchaseDetails={purchaseDetails}
          onClose={handleConfirmationClose}
          onViewWallet={() => {
            handleConfirmationClose()
            // Already on wallet page, just scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onContinueShopping={() => {
            handleConfirmationClose()
            setShowPurchaseModal(true)
          }}
        />
      )}
    </div>
  )
}
