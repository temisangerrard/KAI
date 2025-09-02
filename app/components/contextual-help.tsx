"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HelpCircle, X, ChevronDown, ChevronUp } from "lucide-react"

interface ContextualHelpProps {
  context: "dashboard" | "profile" | "trending" | "social" | "create" | "wallet"
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
          answer: "You can earn tokens by making correct predictions on markets."
        }
      ]
    },
    profile: {
      title: "Profile Help",
      description: "Manage your account and view your activity.",
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
    },
    wallet: {
      title: "Smart Wallet Help",
      description: "Manage your gasless Web3 wallet and transactions.",
      faqs: [
        {
          question: "What is a smart wallet?",
          answer: "A smart wallet is a Web3 account that enables gasless transactions and enhanced security features. You can use it without paying gas fees for most operations."
        },
        {
          question: "How do I copy my wallet address?",
          answer: "Click the copy button next to your wallet address to copy it to your clipboard. You can share this address to receive funds."
        },
        {
          question: "Are my transactions really gasless?",
          answer: "Yes! Your smart wallet account has sponsored transactions enabled, meaning you don't need to pay gas fees for most operations on the platform."
        },
        {
          question: "How do I view my transaction history?",
          answer: "Your recent transactions are displayed on the wallet page. You can see timestamps, amounts, and transaction types for all your wallet activity."
        },
        {
          question: "Is my wallet secure?",
          answer: "Yes, your smart wallet uses advanced security features including email-based recovery and enhanced protection against common Web3 vulnerabilities."
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
        <div className="bg-gradient-to-r from-blue-400 to-primary-400 p-4 text-white">
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