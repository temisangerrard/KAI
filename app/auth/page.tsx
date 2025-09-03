"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "./auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { LoginForm } from "./login-form"
import { RegisterForm } from "./register-form"
import { PasswordResetForm } from "./password-reset-form"

function AuthPageContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get mode from URL params, default to 'login'
  const initialMode = searchParams.get('mode') as "login" | "register" | "reset" || "login"
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">(initialMode)
  
  // Get return URL from params
  const returnUrl = searchParams.get('returnUrl') || '/markets'

  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(returnUrl)
    }
  }, [isLoading, isAuthenticated, router, returnUrl])

  const handleAuthSuccess = () => {
    router.push(returnUrl)
  }

  const handleBack = () => {
    router.back()
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Auth card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-2">
              KAI
            </div>
            <CardTitle className="text-xl text-gray-800">
              {authMode === "login" ? "Welcome back" : 
               authMode === "register" ? "Join KAI" : 
               "Reset password"}
            </CardTitle>
            <p className="text-gray-600 text-sm">
              {authMode === "login" ? "Sign in to support your opinions" : 
               authMode === "register" ? "Start backing your predictions" : 
               "Enter your email to reset your password"}
            </p>
          </CardHeader>
          <CardContent>
            {authMode === "login" ? (
              <LoginForm
                onSuccess={handleAuthSuccess}
                onRegisterClick={() => setAuthMode("register")}
                onForgotPasswordClick={() => setAuthMode("reset")}
              />
            ) : authMode === "register" ? (
              <RegisterForm
                onSuccess={handleAuthSuccess}
                onLoginClick={() => setAuthMode("login")}
              />
            ) : (
              <PasswordResetForm
                onBackToLogin={() => setAuthMode("login")}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cream-100 via-cream-50 to-kai-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text mb-4">
            KAI
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-600 mx-auto"></div>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  )
}