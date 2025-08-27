"use client"

import { Button } from "@/components/ui/button"
import { PlusCircle, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"

export function MarketDiscoveryHeader() {
  const router = useRouter()
  const { user } = useAuth()
  const { totalTokens, isLoading: balanceLoading } = useTokenBalance()

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Discover Markets</h1>
        <p className="text-gray-600">
          Explore trending prediction markets and support opinions you believe in
        </p>
      </div>
      
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        {user && (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <Sparkles className="w-5 h-5 text-kai-500" />
            <span className="font-semibold text-gray-800">
              {balanceLoading ? '...' : totalTokens.toLocaleString()} tokens
            </span>
          </div>
        )}
        
        <Button 
          onClick={() => router.push("/markets/create")}
          className="bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full px-6"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Create Market
        </Button>
      </div>
    </div>
  )
}