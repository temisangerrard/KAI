"use client"

import { useState } from "react"
import { Wallet, Sparkles } from "lucide-react"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useAuth } from "./auth-context"

interface RegisterFormProps {
  onSuccess?: () => void
  onLoginClick: () => void
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const { isAuthenticated } = useAuth()

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-kai-600 mr-2" />
          <h1 className="text-3xl font-bold">Create Smart Wallet</h1>
        </div>
        <p className="text-gray-500">Get started with your gasless smart wallet account</p>
      </div>

      <div className="bg-gradient-to-r from-kai-50 to-primary-50 border border-kai-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 text-kai-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <h3 className="font-semibold text-kai-800 mb-1">Smart Wallet Benefits</h3>
            <ul className="text-kai-700 space-y-1 text-xs">
              <li>• Gasless transactions - no ETH needed for fees</li>
              <li>• Email-based authentication - no complex seed phrases</li>
              <li>• Enhanced security with smart contract protection</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <AuthButton />
      </div>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onLoginClick}
          className="text-kai-500 hover:text-kai-600 font-medium focus:outline-none focus:ring-2 focus:ring-kai-500 focus:ring-offset-2 rounded"
        >
          Sign in to your smart wallet
        </button>
      </div>
    </div>
  )
}