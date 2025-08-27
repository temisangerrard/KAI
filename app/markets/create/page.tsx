"use client"

import { useRouter } from "next/navigation"
import { Navigation } from "../../components/navigation"
import { MarketCreationForm } from "./market-creation-form"
import { useAuth } from "../../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function CreateMarketPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { totalTokens, isLoading: balanceLoading } = useTokenBalance()
  const router = useRouter()
  
  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50">
      <div className="w-full max-w-3xl md:max-w-6xl mx-auto">
        <div className="md:bg-transparent bg-white min-h-screen pb-24 md:pb-6">
          
          {/* Mobile Header */}
          <div className="md:hidden bg-gradient-to-r from-kai-600 to-gold-600 p-4 text-white">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()}
                className="mr-3 p-1 rounded-full hover:bg-white/20"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Create Market</h1>
                <p className="text-sm opacity-90">Share your prediction with others</p>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-sm">
                  {balanceLoading ? '...' : totalTokens.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block pt-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text">
                    KAI
                  </div>
                  <div className="w-1 h-6 bg-gray-300"></div>
                  <h1 className="text-2xl font-bold text-gray-800">Create Market</h1>
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
                <span className="font-semibold text-gray-800">
                  {balanceLoading ? '...' : totalTokens.toLocaleString()} tokens
                </span>
              </div>
            </div>
          </div>

          {/* Market Creation Form */}
          <div className="p-4 md:px-0">
            <div className="md:bg-white md:rounded-xl md:shadow-lg md:p-8">
              <MarketCreationForm />
            </div>
          </div>

          {/* Mobile Navigation */}
          <Navigation />
        </div>
      </div>
    </div>
  )
}