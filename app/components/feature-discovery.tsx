"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Lightbulb } from "lucide-react"
import { useAuth } from "../auth/auth-context"

export function FeatureDiscovery() {
  const { user, updateUser } = useAuth()
  const [currentTooltip, setCurrentTooltip] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const tooltips = [
    {
      id: "social-engagement",
      title: "Social Engagement",
      description: "See how many people liked and commented on predictions!",
      target: ".social-engagement",
    },
    {
      id: "navigation-links",
      title: "Easy Navigation",
      description: "Use these links to explore different sections of KAI.",
      target: ".navigation-links",
    },
    {
      id: "trending-section",
      title: "Trending Markets",
      description: "These are the hottest prediction markets right now!",
      target: ".trending-section",
    },
    {
      id: "token-balance",
      title: "Your Token Balance",
      description: "Keep track of your tokens and buy more when needed.",
      target: ".token-balance",
    },
  ]

  const dismissTooltip = () => {
    const dismissedTooltips = user?.preferences?.dismissedTooltips || []
    const newDismissed = [...dismissedTooltips, tooltips[currentTooltip].id]
    
    if (user) {
      updateUser({
        ...user,
        preferences: {
          ...user.preferences,
          dismissedTooltips: newDismissed
        }
      })
    }

    if (currentTooltip < tooltips.length - 1) {
      setCurrentTooltip(currentTooltip + 1)
    } else {
      setIsVisible(false)
    }
  }

  const skipAll = () => {
    setIsVisible(false)
    if (user) {
      updateUser({
        ...user,
        preferences: {
          ...user.preferences,
          dismissedTooltips: tooltips.map(t => t.id)
        }
      })
    }
  }

  if (!isVisible) return null

  const currentTooltipData = tooltips[currentTooltip]

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="w-80 bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-kai-600 to-gold-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              <span className="font-semibold">Tip</span>
            </div>
            <Button variant="ghost" size="icon" onClick={skipAll} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          <h4 className="font-semibold mb-2">{currentTooltipData.title}</h4>
          <p className="text-sm text-gray-600 mb-4">{currentTooltipData.description}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {currentTooltip + 1} of {tooltips.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={skipAll}>
                Skip All
              </Button>
              <Button size="sm" onClick={dismissTooltip} className="bg-kai-600 hover:bg-kai-700 text-white">
                Got it
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}