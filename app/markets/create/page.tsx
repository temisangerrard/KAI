"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "../../components/navigation"
import { MarketCreationForm } from "./market-creation-form"
import { useAuth } from "../../auth/auth-context"

export default function CreateMarketPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  
  // Redirect to home if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50">
      <div className="w-full max-w-3xl mx-auto">
        <div className="md:shadow-xl md:rounded-2xl md:my-8 md:overflow-hidden bg-white min-h-[calc(100vh-4rem)] md:min-h-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-kai-600 to-gold-600 p-4 md:p-6 text-white">
            <div className="flex items-center">
              <button 
                onClick={() => router.back()}
                className="mr-3 p-1 rounded-full hover:bg-white/20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Create Market</h1>
                <p className="text-sm opacity-90">Share your prediction with others</p>
              </div>
            </div>
          </div>

          {/* Market Creation Form */}
          <div className="p-4 md:p-8 pb-24 md:pb-8">
            <MarketCreationForm />
          </div>

          {/* Navigation - only visible on mobile */}
          <div className="md:hidden">
            <Navigation />
          </div>
        </div>
      </div>
    </div>
  )
}