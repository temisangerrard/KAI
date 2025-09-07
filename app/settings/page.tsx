"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  HelpCircle, 
  Info,
  ExternalLink
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">About KAI and help information</p>
        </div>

        <div className="space-y-6">
          
          {/* About KAI */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-kai-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-kai-600" />
              </div>
              <h2 className="text-xl font-semibold">About KAI</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <p>
                KAI is a social prediction platform where you can back your opinions 
                on trending topics and cultural events using tokens.
              </p>
              
              <p>
                <strong>Support your opinion ✨</strong> - Make predictions, earn rewards 
                for accurate insights, and engage with a community of predictors.
              </p>
              
              <div className="bg-kai-50 p-4 rounded-lg">
                <h3 className="font-medium text-kai-800 mb-2">How it works:</h3>
                <ul className="text-sm text-kai-700 space-y-1">
                  <li>• Discover trending topics and cultural events</li>
                  <li>• Back your predictions with tokens</li>
                  <li>• Earn rewards when your predictions are correct</li>
                  <li>• Build your reputation as a skilled predictor</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Help & Support */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HelpCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">Help & Support</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Getting Started</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Browse markets to find topics you're interested in</li>
                  <li>• Use your tokens to back predictions you believe in</li>
                  <li>• Check your wallet to see your token balance and history</li>
                  <li>• Visit your profile to track your prediction performance</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Tokens & Payouts</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Tokens are used to back your predictions</li>
                  <li>• Win tokens when your predictions are correct</li>
                  <li>• Payouts are distributed when markets resolve</li>
                  <li>• Check your wallet for transaction history</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* App Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Info className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-xl font-semibold">App Information</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-gray-600 hover:text-kai-600"
                  onClick={() => window.open('#', '_blank')}
                >
                  Terms of Service
                  <ExternalLink className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-gray-600 hover:text-kai-600"
                  onClick={() => window.open('#', '_blank')}
                >
                  Privacy Policy
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}