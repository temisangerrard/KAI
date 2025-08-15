"use client"

import React, { createContext, useContext, useState } from "react"
import { useAuth } from "./auth-context"

// Define onboarding context type
interface OnboardingContextType {
  isOnboarding: boolean
  currentStep: number
  totalSteps: number
  startOnboarding: () => void
  completeOnboarding: () => void
  nextStep: () => void
  prevStep: () => void
  setStep: (step: number) => void
}

// Create context with default values
const OnboardingContext = createContext<OnboardingContextType>({
  isOnboarding: false,
  currentStep: 1,
  totalSteps: 4,
  startOnboarding: () => {},
  completeOnboarding: () => {},
  nextStep: () => {},
  prevStep: () => {},
  setStep: () => {},
})

// Onboarding provider component
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser } = useAuth()
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // Start onboarding
  const startOnboarding = () => {
    setIsOnboarding(true)
    setCurrentStep(1)
  }

  // Complete onboarding
  const completeOnboarding = () => {
    setIsOnboarding(false)
    setCurrentStep(1)
    
    // Update the user's profile to mark onboarding as completed
    if (user) {
      // Update localStorage for persistence
      localStorage.setItem(`kai_onboarding_completed_${user.id}`, "true")
      
      // Update the user object in the auth context
      updateUser({ hasCompletedOnboarding: true })
    }
  }

  // Move to next step
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      completeOnboarding()
    }
  }

  // Move to previous step
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Set specific step
  const setStep = (step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step)
    }
  }

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        currentStep,
        totalSteps,
        startOnboarding,
        completeOnboarding,
        nextStep,
        prevStep,
        setStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

// Custom hook to use onboarding context
export const useOnboarding = () => useContext(OnboardingContext)