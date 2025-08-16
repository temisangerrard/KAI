"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  WalletIcon,
  TrendingUp,
  Gift,
  Calendar
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Navigation } from "../components/navigation"
import Link from "next/link"
// import { TokenVisualization } from "./token-visualization"
// import { TokenPurchaseModal } from "./token-purchase-modal"
// import { Transaction, TokenBalance, TransactionType } from "@/lib/types/transaction"
// import { designTokens } from "@/lib/design-tokens"
// import { TransactionService } from "@/lib/services/transaction-service"
import { useAuth } from "../auth/auth-context"

export default function WalletPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTokens] = useState(2500)
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [showPurchase, setShowPurchase] = useState(false)

  const transactions = [
    {
      id: 1,
      type: "purchase",
      amount: 1000,
      description: "Token purchase",
      date: "2 hours ago",
      status: "completed",
    },
    {
      id: 2,
      type: "backed",
      amount: -250,
      description: "Backed Mercy in BBNaija",
      date: "1 day ago",
      status: "active",
    },
    {
      id: 3,
      type: "won",
      amount: 180,
      description: "Won: Best Nollywood Actress",
      date: "3 days ago",
      status: "completed",
    },
  ]

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <Plus className="w-4 h-4 text-green-500" />
      case "backed":
        return <ArrowUpRight className="w-4 h-4 text-kai-500" />
      case "won":
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />
      default:
        return <Sparkles className="w-4 h-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "purchase":
      case "won":
        return "text-green-600"
      case "backed":
        return "text-primary-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-kai-50 to-purple-50">
      
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
          {/* Mobile Header */}
          <div className="bg-gradient-to-r from-primary-400 to-kai-600 p-4 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">My Wallet</h1>
                <p className="text-sm opacity-90">Manage your tokens</p>
              </div>
            </div>

            {/* Mobile Balance Card */}
            <Card className="bg-white/20 border-0 text-white">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-6 h-6" />
                  <span className="text-3xl font-bold">{currentTokens.toLocaleString()}</span>
                </div>
                <p className="text-sm opacity-90 mb-4">Available Tokens</p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowPurchase(true)}
                    className="flex-1 bg-white text-primary-600 hover:bg-gray-100 rounded-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Buy Tokens
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-white/30 text-white hover:bg-white/10 rounded-full bg-transparent"
                  >
                    <WalletIcon className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Token Stats */}
          <div className="p-4 pb-0">
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-8 h-8 text-kai-500" />
                  <span className="text-2xl font-bold text-gray-800">{currentTokens.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">Total Tokens</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Mobile Quick Actions & Content */}
          <div className="p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs font-medium text-gray-700">Buy More</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs font-medium text-gray-700">Withdraw</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-kai-50">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs font-medium text-gray-700">Rewards</p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
            <Button variant="ghost" size="sm" className="text-primary-600">
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{transaction.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">{transaction.date}</p>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              transaction.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount}
                      </p>
                      <p className="text-xs text-gray-500">tokens</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Purchase Modal */}
        {showPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center p-4 z-50">
            <Card className="w-full max-w-md bg-white rounded-t-3xl">
              <CardHeader className="bg-gradient-to-r from-primary-400 to-kai-600 text-white rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Buy Tokens</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPurchase(false)}
                    className="text-white hover:bg-white/20"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { amount: "£10", tokens: "1,000" },
                      { amount: "£25", tokens: "2,500" },
                      { amount: "£50", tokens: "5,000" },
                    ].map((option, index) => (
                      <button
                        key={index}
                        className="p-3 border-2 border-gray-200 rounded-xl hover:border-primary-400 transition-colors"
                      >
                        <p className="font-semibold text-gray-800">{option.amount}</p>
                        <p className="text-xs text-gray-500">{option.tokens} tokens</p>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount (£)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="bg-kai-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-kai-500" />
                      <span className="text-sm font-medium text-gray-800">Payment Method</span>
                    </div>
                    <p className="text-sm text-gray-600">Secure payment via Stripe</p>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-primary-400 to-kai-600 hover:from-kai-500 hover:to-kai-500 text-white rounded-full py-3">
                    Complete Purchase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

          <Navigation />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="text-2xl font-bold bg-gradient-to-r from-kai-600 to-gold-600 text-transparent bg-clip-text cursor-pointer"
                  onClick={() => router.push('/')}
                >
                  KAI
                </div>
                <div className="w-1 h-6 bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-800">Wallet</h1>
              </div>
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-kai-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-kai-600" />
              <span className="font-semibold text-gray-800">{currentTokens.toLocaleString()} tokens</span>
            </div>
          </div>

          {/* Desktop Balance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Main Balance Card */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-kai-600 via-primary-500 to-gold-500 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                <CardContent className="p-8 relative">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-white/80 text-sm font-medium">Available Balance</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Sparkles className="w-8 h-8" />
                        <span className="text-4xl font-bold">{currentTokens.toLocaleString()}</span>
                      </div>
                      <p className="text-white/80 text-sm mt-1">KAI Tokens</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Estimated Value</p>
                      <p className="text-2xl font-bold">£{(currentTokens * 0.01).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowPurchase(true)}
                      className="bg-white text-kai-600 hover:bg-gray-100 font-semibold px-6"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Buy Tokens
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 bg-transparent font-semibold px-6"
                    >
                      <ArrowDownLeft className="w-4 h-4 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">+£24.50</p>
                      <p className="text-sm text-gray-600">This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Gift className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">1,250</p>
                      <p className="text-sm text-gray-600">Rewards Earned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Desktop Actions & Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button 
                  onClick={() => setShowPurchase(true)}
                  className="w-full justify-start bg-green-50 text-green-700 hover:bg-green-100 border-green-200 h-14"
                  variant="outline"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <Plus className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Buy More Tokens</p>
                    <p className="text-xs text-green-600">Add funds to your wallet</p>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 h-14"
                  variant="outline"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Withdraw Funds</p>
                    <p className="text-xs text-blue-600">Cash out your earnings</p>
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 h-14"
                  variant="outline"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">View Rewards</p>
                    <p className="text-xs text-purple-600">Check your bonuses</p>
                  </div>
                </Button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                <Button variant="ghost" className="text-kai-600 hover:text-kai-700">
                  View All
                </Button>
              </div>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-100">
                    {transactions.map((transaction, index) => (
                      <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              transaction.type === 'purchase' ? 'bg-green-100' :
                              transaction.type === 'won' ? 'bg-green-100' :
                              'bg-kai-100'
                            }`}>
                              {getTransactionIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{transaction.description}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm text-gray-500">{transaction.date}</p>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    transaction.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-orange-100 text-orange-700"
                                  }`}
                                >
                                  {transaction.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount}
                            </p>
                            <p className="text-sm text-gray-500">tokens</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
