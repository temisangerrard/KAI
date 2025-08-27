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
    Gift,
    RefreshCw,
    WalletIcon,
    Target,
    Calendar,
    Eye,
    EyeOff
} from "lucide-react"
import { UserBalance, TokenTransaction } from "@/lib/types/token"
import { WalletBalance } from "./wallet-balance"
import { TransactionHistory } from "./transaction-history"
import { TransactionDetailModal } from "./transaction-detail-modal"
import { useAuth } from "../auth/auth-context"
import { useTokenBalance } from "@/hooks/use-token-balance"
import { TokenBalanceService } from "@/lib/services/token-balance-service"
import { collection, query, where, orderBy, limit, onSnapshot, doc } from "firebase/firestore"
import { db } from "@/lib/db/database"

interface WalletDashboardProps {
    onPurchaseClick: () => void
    onWithdrawClick?: () => void
    onViewPrediction?: (predictionId: string) => void
}

export function WalletDashboard({
    onPurchaseClick,
    onWithdrawClick,
    onViewPrediction
}: WalletDashboardProps) {
    const { user } = useAuth()
    const { balance: userBalance, isLoading: balanceLoading, refreshBalance } = useTokenBalance()
    const [transactions, setTransactions] = useState<TokenTransaction[]>([])
    const [selectedTransaction, setSelectedTransaction] = useState<TokenTransaction | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showBalanceDetails, setShowBalanceDetails] = useState(true)

    // Load initial data
    useEffect(() => {
        if (!user?.uid) return

        loadWalletData()
    }, [user?.uid])

    // Set up real-time listeners
    useEffect(() => {
        if (!user?.uid) return

        // Balance is handled by useTokenBalance hook

        // Listen to transaction changes
        const transactionsQuery = query(
            collection(db, 'token_transactions'),
            where('userId', '==', user.id),
            orderBy('timestamp', 'desc'),
            limit(50)
        )

        const transactionsUnsubscribe = onSnapshot(
            transactionsQuery,
            (snapshot) => {
                const transactionData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as TokenTransaction[]
                setTransactions(transactionData)
            },
            (error) => {
                console.error('Error listening to transaction changes:', error)
            }
        )

        return () => {
            transactionsUnsubscribe()
        }
    }, [user?.uid])

    const loadWalletData = async () => {
        if (!user?.uid || !userBalance) return

        try {
            setIsLoading(true)

            // Load recent transactions
            const transactionsQuery = query(
                collection(db, 'token_transactions'),
                where('userId', '==', user.id),
                orderBy('timestamp', 'desc'),
                limit(50)
            )

            // Note: In a real implementation, you'd use getDocs here
            // For now, we'll use mock data that matches the existing structure
            const mockTransactions: TokenTransaction[] = [
                {
                    id: 'tx_1',
                    userId: user.id,
                    type: 'purchase',
                    amount: 1000,
                    balanceBefore: userBalance.availableTokens - 1000,
                    balanceAfter: userBalance.availableTokens,
                    metadata: {
                        packageId: 'starter-pack',
                        stripePaymentId: 'pi_1234567890'
                    },
                    timestamp: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000), toMillis: () => Date.now() - 2 * 60 * 60 * 1000 } as any,
                    status: 'completed'
                },
                {
                    id: 'tx_2',
                    userId: user.id,
                    type: 'commit',
                    amount: -250,
                    balanceBefore: userBalance.availableTokens + 250,
                    balanceAfter: userBalance.availableTokens,
                    relatedId: 'pred_123',
                    metadata: {
                        predictionTitle: 'Will Mercy win BBNaija 2024?'
                    },
                    timestamp: { toDate: () => new Date(Date.now() - 24 * 60 * 60 * 1000), toMillis: () => Date.now() - 24 * 60 * 60 * 1000 } as any,
                    status: 'completed'
                },
                {
                    id: 'tx_3',
                    userId: user.id,
                    type: 'win',
                    amount: 180,
                    balanceBefore: userBalance.availableTokens - 180,
                    balanceAfter: userBalance.availableTokens,
                    relatedId: 'pred_456',
                    metadata: {
                        predictionTitle: 'Best Nollywood Actress 2024'
                    },
                    timestamp: { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), toMillis: () => Date.now() - 3 * 24 * 60 * 60 * 1000 } as any,
                    status: 'completed'
                }
            ]

            setTransactions(mockTransactions)
        } catch (error) {
            console.error('Error loading wallet data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refreshBalance()
        await loadWalletData()
        setIsRefreshing(false)
    }

    const handleTransactionClick = (transaction: TokenTransaction) => {
        setSelectedTransaction(transaction)
        setShowDetailModal(true)
    }

    const handleCloseDetailModal = () => {
        setShowDetailModal(false)
        setSelectedTransaction(null)
    }

    const handleViewPrediction = (predictionId: string) => {
        handleCloseDetailModal()
        onViewPrediction?.(predictionId)
    }

    // Calculate quick stats
    const quickStats = userBalance ? {
        totalBalance: userBalance.availableTokens + userBalance.committedTokens,
        netEarnings: userBalance.totalEarned - userBalance.totalSpent,
        activeCommitments: userBalance.committedTokens,
        recentTransactions: transactions.filter(tx =>
            tx.timestamp.toMillis() > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length
    } : null

    if (balanceLoading || (isLoading && !userBalance)) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Main Balance Display */}
            {userBalance && (
                <WalletBalance
                    balance={userBalance}
                    onPurchaseClick={onPurchaseClick}
                    onWithdrawClick={onWithdrawClick}
                    isLoading={isRefreshing}
                    showDetails={showBalanceDetails}
                />
            )}

            {/* Quick Stats */}
            {quickStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Sparkles className="w-5 h-5 text-primary-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {quickStats.totalBalance.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">Total Balance</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${quickStats.netEarnings >= 0 ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                <TrendingUp className={`w-5 h-5 ${quickStats.netEarnings >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`} />
                            </div>
                            <p className={`text-2xl font-bold ${quickStats.netEarnings >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {quickStats.netEarnings >= 0 ? '+' : ''}{quickStats.netEarnings.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">Net Earnings</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Clock className="w-5 h-5 text-orange-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {quickStats.activeCommitments.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600">Committed</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">
                                {quickStats.recentTransactions}
                            </p>
                            <p className="text-xs text-gray-600">This Week</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Quick Actions */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Button
                            onClick={onPurchaseClick}
                            className="h-16 flex-col gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                            variant="outline"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-sm font-medium">Buy Tokens</span>
                        </Button>

                        {onWithdrawClick && (
                            <Button
                                onClick={onWithdrawClick}
                                disabled={!userBalance || userBalance.availableTokens === 0}
                                className="h-16 flex-col gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                variant="outline"
                            >
                                <ArrowDownLeft className="w-5 h-5" />
                                <span className="text-sm font-medium">Withdraw</span>
                            </Button>
                        )}

                        <Button
                            onClick={() => setShowBalanceDetails(!showBalanceDetails)}
                            className="h-16 flex-col gap-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                            variant="outline"
                        >
                            {showBalanceDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            <span className="text-sm font-medium">
                                {showBalanceDetails ? 'Hide Details' : 'Show Details'}
                            </span>
                        </Button>

                        <Button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-16 flex-col gap-2 bg-kai-50 text-kai-700 hover:bg-kai-100 border-kai-200"
                            variant="outline"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="text-sm font-medium">Refresh</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction History */}
            <TransactionHistory
                transactions={transactions}
                isLoading={isLoading}
                onRefresh={handleRefresh}
                onTransactionClick={handleTransactionClick}
            />

            {/* Transaction Detail Modal */}
            <TransactionDetailModal
                isOpen={showDetailModal}
                transaction={selectedTransaction}
                onClose={handleCloseDetailModal}
                onViewPrediction={handleViewPrediction}
            />
        </div>
    )
}