"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ArrowRight, ArrowLeft } from "lucide-react"
import { useAuth } from "../auth/auth-context"

export function TourGuide() {
  const { user, updateUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const tourSteps = [
    {
      title: "Welcome to your dashboard!",
      description: "This is where you'll see trending prediction markets and your activity.",
      target: ".trending-section",
    },
    {
      title: "Support your opinion",
      description: "Click this button to back your opinion with tokens on any prediction.",
      target: ".support-opinion-button",
    },
    {
      title: "Check your token balance",
      description: "Keep track of your tokens here. You can buy more anytime!",
      target: ".token-balance",
    },
    {
      title: "Create your own markets",
      description: "Have an idea for a prediction? Create your own market here!",
      target: ".create-market-button",
    },
  ]

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    setIsVisible(false)
    if (user) {
      updateUser({
        ...user,
        preferences: {
          ...user.preferences,
          tourCompleted: true
        }
      })
    }
  }

  const skipTour = () => {
    setIsVisible(false)
    if (user) {
      updateUser({
        ...user,
        preferences: {
          ...user.preferences,
          tourSkipped: true
        }
      })
    }
  }

  if (!isVisible) return null

  const currentStepData = tourSteps[currentStep]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Quick Tour</h3>
          <Button variant="ghost" size="icon" onClick={skipTour}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="mb-6">
          <h4 className="font-medium mb-2">{currentStepData.title}</h4>
          <p className="text-sm text-gray-600">{currentStepData.description}</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {tourSteps.length}
          </span>
          <div className="flex gap-1">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? "bg-kai-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={skipTour} className="flex-1">
            Skip Tour
          </Button>
          <div className="flex gap-2 flex-1">
            {currentStep > 0 && (
              <Button variant="outline" size="icon" onClick={handlePrev}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Button
              className="flex-1 bg-kai-500 hover:bg-primary-600 text-white"
              onClick={handleNext}
            >
              {currentStep < tourSteps.length - 1 ? "Next" : "Finish"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}