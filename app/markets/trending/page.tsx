"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MarketsTrendingRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to unified markets page with trending sort
    router.replace("/markets?sort=trending")
  }, [router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-4">
          KAI
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Trending Markets...</p>
      </div>
    </div>
  )
}