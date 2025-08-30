"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sparkles, TrendingUp, Users, MessageCircle, ArrowRight, ArrowLeft, Gift, X } from "lucide-react"
import { useAuth } from "../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { useOnboarding } from "../auth/onboarding-context"

export function OnboardingFlow() {
  const { user } = useAuth()
  const { totalTokens, isLoading: balanceLoading } = useTokenBalance()
  const { currentStep, totalSteps, nextStep, prevStep, completeOnboarding } = useOnboarding()
  const router = useRouter()
  const [progressValue, setProgressValue] = useState(0)

  useEffect(() => {
    // Calculate progress percentage
    setProgressValue((currentStep / totalSteps) * 100)
  }, [currentStep, totalSteps])

  const handleComplete = () => {
    completeOnboarding()
    router.push("/markets")
  }

  // Onboarding step content
  const steps = [
    {
      title: "Welcome to KAI!",
      description: "Your platform for making predictions on trending topics and cultural events.",
      icon: <Sparkles className="h-12 w-12 text-kai-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            KAI is a fun prediction platform where you can back your opinions on trending topics, 
            cultural events, and social phenomena.
          </p>
          <div className="bg-gradient-to-r from-kai-50 to-kai-50 p-4 rounded-xl">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Not gambling, just fun!</span> KAI is about sharing your insights and 
              connecting with others who share your interests.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Back Your Opinion",
      description: "Use tokens to support your predictions on trending topics.",
      icon: <TrendingUp className="h-12 w-12 text-kai-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Find prediction markets that interest you and support your opinion with tokens.
          </p>
          <div className="bg-white shadow-md rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Who will win the award?</span>
              <Badge className="bg-kai-100 text-kai-700">Entertainment</Badge>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Option A</span>
                  <span className="text-sm font-semibold">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-kai-600 h-2 rounded-full" style={{ width: "45%" }} />
                </div>
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Option B</span>
                  <span className="text-sm font-semibold">55%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-400 h-2 rounded-full" style={{ width: "55%" }} />
                </div>
              </div>
            </div>
            <Button 
              className="w-full mt-3 bg-gradient-to-r from-primary-400 to-kai-600 text-white"
              size="sm"
            >
              Support Your Opinion ✨
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: "Connect with Others",
      description: "Engage with a community that shares your interests.",
      icon: <Users className="h-12 w-12 text-primary-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Comment on predictions, share your thoughts, and connect with like-minded individuals.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">U{i}</span>
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-kai-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs text-primary-600">+5</span>
              </div>
            </div>
            <span className="text-sm text-gray-600">are also supporting this opinion</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs text-primary-600">A</span>
              </div>
              <span className="text-sm font-medium">Amara J.</span>
            </div>
            <p className="text-sm text-gray-600 pl-8">
              I totally agree! This prediction is spot on! 🙌
            </p>
            <div className="flex items-center gap-4 mt-2 pl-8">
              <button className="flex items-center gap-1 text-gray-500 text-xs">
                <Heart className="w-3 h-3" />
                <span>24</span>
              </button>
              <button className="flex items-center gap-1 text-gray-500 text-xs">
                <MessageCircle className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Your Starter Tokens",
      description: "We've given you tokens to get started!",
      icon: <Gift className="h-12 w-12 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-6 rounded-xl text-center">
            <Sparkles className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-green-700 mb-1">
              {balanceLoading ? '...' : totalTokens.toLocaleString()} Tokens
            </h3>
            <p className="text-sm text-green-600">
              Have been added to your account!
            </p>
          </div>
          <p className="text-gray-600">
            Use these tokens to back your opinions on predictions. Earn more tokens when your predictions are correct!
          </p>
          <div className="bg-white shadow-md rounded-xl p-4">
            <h4 className="font-medium mb-2">What can you do with tokens?</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-kai-100 flex items-center justify-center">
                  <span className="text-xs text-primary-600">1</span>
                </div>
                <span>Support your opinions on predictions</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-kai-100 flex items-center justify-center">
                  <span className="text-xs text-primary-600">2</span>
                </div>
                <span>Create your own prediction markets</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-kai-100 flex items-center justify-center">
                  <span className="text-xs text-primary-600">3</span>
                </div>
                <span>Earn more tokens with correct predictions</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ]

  const currentStepData = steps[currentStep - 1]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-kai-50 to-primary-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-kai-500 text-transparent bg-clip-text">
              KAI
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                Step {currentStep} of {totalSteps}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleComplete}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Progress value={progressValue} className="h-1 mb-6" />

          <div className="text-center mb-6">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-kai-50 to-kai-50 flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <h2 className="text-2xl font-bold mb-1">{currentStepData.title}</h2>
            <p className="text-gray-600">{currentStepData.description}</p>
          </div>

          <div className="mb-8">
            {currentStepData.content}
          </div>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                className="flex-1 border-kai-200 text-primary-600"
                onClick={prevStep}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <div className="flex gap-2 flex-1">
                <Button
                  variant="outline"
                  className="border-gray-200 text-gray-600"
                  onClick={handleComplete}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white"
                  onClick={nextStep}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                className="flex-1 bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white"
                onClick={handleComplete}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// Helper component for the badge
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

// Helper component for the heart icon
function Heart({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}