"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sparkles,
    Plus,
    ArrowDownLeft,
    TrendingUp,
    Clock,
    Eye,
    EyeOff,
    RefreshCw
} from "lucide-react"
import { UserBalance } from "@/lib/types/token"

interface WalletBalanceProps {
    balance: UserBalance
    onPurchaseClick: () => void
    onWithdrawClick?: () => void
    isLoading?: boolean
    showDetails?: boolean
}

export function WalletBalance({
    balance,
    onPurchaseClick,
    onWithdrawClick,
    isLoading = false,
    showDetails = true
}: WalletBalanceProps) {
    const [showBalanceDetails, setShowBalanceDetails] = useState(showDetails)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Calculate total balance
    const totalBalance = balance.availableTokens + balance.committedTokens

    // Calculate net earnings (earned - spent)
    const netEarnings = balance.totalEarned - balance.totalSpent

    // Handle balance refresh
    const handleRefresh = async () => {
        setIsRefreshing(true)
        // Simulate refresh delay
        setTimeout(() => {
            setIsRefreshing(false)
        }, 1000)
    }

    // Format large numbers
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`
        }
        return num.toLocaleString()
    }

    return (
        <div className="space-y-4">
            {/* Main Balance Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-kai-600 via-primary-500 to-gold-500 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium text-white/90">Available Balance</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowBalanceDetails(!showBalanceDetails)}
                                className="text-white/80 hover:bg-white/10 h-8 w-8"
                            >
                                {showBalanceDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="text-white/80 hover:bg-white/10 h-8 w-8"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0 pb-6 relative">
                    {isLoading ? (
                        <div className="animate-pulse">
                            <div className="h-12 bg-white/20 rounded mb-4"></div>
                            <div className="h-4 bg-white/20 rounded w-1/2 mb-6"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="w-8 h-8" />
                                <span className="text-4xl font-bold">
                                    {showBalanceDetails ? formatNumber(balance.availableTokens) : "••••"}
                                </span>
                            </div>
                            <p className="text-white/80 text-sm mb-6">KAI Tokens</p>
                        </>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={onPurchaseClick}
                            disabled={isLoading}
                            className="bg-white text-kai-600 hover:bg-gray-100 font-semibold px-6 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Buy Tokens
                        </Button>
                        {onWithdrawClick && (
                            <Button
                                onClick={onWithdrawClick}
                                disabled={isLoading || balance.availableTokens === 0}
                                variant="outline"
                                className="border-white/30 text-white hover:bg-white/10 bg-transparent font-semibold px-6 disabled:opacity-50"
                            >
                                <ArrowDownLeft className="w-4 h-4 mr-2" />
                                Withdraw
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Balance Details Cards */}
            {showDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Committed Tokens */}
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {isLoading ? "..." : formatNumber(balance.committedTokens)}
                                    </p>
                                    <p className="text-sm text-gray-600">Committed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Total Balance */}
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {isLoading ? "..." : formatNumber(totalBalance)}
                                    </p>
                                    <p className="text-sm text-gray-600">Total Balance</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Net Earnings */}
                    <Card className="border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${netEarnings >= 0 ? 'bg-green-100' : 'bg-red-100'
                                    }`}>
                                    <TrendingUp className={`w-6 h-6 ${netEarnings >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`} />
                                </div>
                                <div>
                                    <p className={`text-2xl font-bold ${netEarnings >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {isLoading ? "..." : `${netEarnings >= 0 ? '+' : ''}${formatNumber(netEarnings)}`}
                                    </p>
                                    <p className="text-sm text-gray-600">Net Earnings</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Balance Breakdown */}
            {showDetails && showBalanceDetails && (
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Balance Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Available Tokens</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    Available
                                </Badge>
                                <span className="font-semibold">{balance.availableTokens.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Committed to Predictions</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                    Locked
                                </Badge>
                                <span className="font-semibold">{balance.committedTokens.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Total Earned</span>
                            <span className="font-semibold text-green-600">
                                +{balance.totalEarned.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Total Spent</span>
                            <span className="font-semibold text-red-600">
                                -{balance.totalSpent.toLocaleString()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}