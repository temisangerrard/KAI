"use client"

import React, { useState } from "react"
import { Wallet } from "lucide-react"
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton"
import { useAuth } from "./auth-context"

interface LoginFormProps {
  onSuccess?: () => void
  onRegisterClick: () => void
  onForgotPasswordClick?: () => void
}

export function LoginForm({ onSuccess, onRegisterClick, onForgotPasswordClick }: LoginFormProps) {
  const { isAuthenticated } = useAuth()

  // Use useEffect to handle authentication success
  React.useEffect(() => {
    if (isAuthenticated && onSuccess) {
      onSuccess()
    }
  }, [isAuthenticated, onSuccess])



  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center mb-4">
          <Wallet className="h-8 w-8 text-kai-600 mr-2" />
          <h1 className="text-3xl font-bold">Welcome back</h1>
        </div>
        <p className="text-gray-500">Sign in with your email to access your smart wallet</p>
      </div>

      <div className="bg-kai-50 border border-kai-200 rounded-md p-4 text-sm text-kai-700">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Smart Wallet Authentication</p>
            <p className="text-xs mt-1">
              We'll create or access your smart wallet using your email. No password needed!
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <AuthButton />
      </div>

      <div className="text-center text-sm">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onRegisterClick}
          className="text-kai-500 hover:text-kai-600 font-medium focus:outline-none focus:ring-2 focus:ring-kai-500 focus:ring-offset-2 rounded"
          aria-label="Switch to create account form"
        >
          Create smart wallet account
        </button>
      </div>
    </div>
  )
}