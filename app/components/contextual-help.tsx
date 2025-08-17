"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react"

interface ContextualHelpProps {
  context: "dashboard" | "wallet" | "profile" | "trending" | "social" | "create"
}

export function ContextualHelp({ context }: ContextualHelpProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const helpContent = {
    dashboard: {
      title: "Dashboard Help",
      description: "Your main hub for discovering and participating in prediction markets.",
      faqs: [
        {
          question: "How do I support an opinion?",
          answer: "Click the 'Support Your Opinion' button on any prediction market, choose your option, and allocate tokens."
        },
        {
          question: "What is a vibe score?",
          answer: "The vibe score shows how engaged and excited the community is about a particular prediction market."
        },
        {
          question: "How do I earn more tokens?",
          answer: "You can earn tokens by making correct predictions or by purchasing them in your wallet."
        }
      ]
    },
    wallet: {
      title: "Wallet Help",
      description: "Manage your tokens and view your transaction history.",
      faqs: [
        {
          question: "How do I buy more tokens?",
          answer: "Click the 'Buy Tokens' button and choose your preferred payment method and amount."
        },
        {
          question: "Are my transactions secure?",
          answer: "Yes, all transactions are processed securely through encrypted payment systems."
        }
      ]
    },
    profile: {
      title: "Profile Help",
      description: "View your prediction history and manage your account settings.",
      faqs: [
        {
          question: "How do I edit my profile?",
          answer: "Click the 'Edit Profile' button to update your display name, bio, and other information."
        }
      ]
    },
    trending: {
      title: "Trending Help",
      description: "Discover the hottest prediction markets right now.",
      faqs: [
        {
          question: "How are trending markets determined?",
          answer: "Markets are ranked based on participation, token volume, growth rate, and engagement."
        }
      ]
    },
    social: {
      title: "Social Help",
      description: "Connect with other users and see community activity.",
      faqs: [
        {
          question: "How do I follow other users?",
          answer: "Visit the Discover tab to find suggested users and click the Follow button."
        }
      ]
    },
    create: {
      title: "Create Market Help",
      description: "Create your own prediction markets for others to participate in.",
      faqs: [
        {
          question: "How do I create a market?",
          answer: "Fill out the market creation form with your question, options, and end date."
        }
      ]
    }
  }

  const currentHelp = helpContent[context]

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full w-12 h-12 bg-kai-500 hover:bg-primary-600 text-white shadow-lg"
        size="icon"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Card className="w-80 bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-kai-400 to-kai-400 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <span className="font-semibold">{currentHelp.title}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)} className="text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">{currentHelp.description}</p>
          
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Frequently Asked Questions</h5>
            {currentHelp.faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-sm font-medium">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-3 pb-3">
                    <p className="text-sm text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}