"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Gift,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { TokenTransaction } from "@/lib/types/token"
import { format } from "date-fns"

interface TransactionHistoryProps {
  transactions: TokenTransaction[]
  isLoading?: boolean
  onRefresh?: () => void
  onTransactionClick?: (transaction: TokenTransaction) => void
}

type FilterType = 'all' | 'purchase' | 'commit' | 'win' | 'loss' | 'refund'
type SortOrder = 'newest' | 'oldest' | 'amount-high' | 'amount-low'

const ITEMS_PER_PAGE = 10

export function TransactionHistory({
  transactions,
  isLoading = false,
  onRefresh,
  onTransactionClick
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tx =>
        tx.metadata.predictionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.timestamp.toMillis() - a.timestamp.toMillis()
        case 'oldest':
          return a.timestamp.toMillis() - b.timestamp.toMillis()
        case 'amount-high':
          return Math.abs(b.amount) - Math.abs(a.amount)
        case 'amount-low':
          return Math.abs(a.amount) - Math.abs(b.amount)
        default:
          return 0
      }
    })

    return filtered
  }, [transactions, searchTerm, filterType, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType, sortOrder])

  const getTransactionIcon = (type: TokenTransaction['type']) => {
    switch (type) {
      case "purchase":
        return <Plus className="w-4 h-4 text-green-500" />
      case "commit":
        return <ArrowUpRight className="w-4 h-4 text-blue-500" />
      case "win":
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case "loss":
        return <ArrowDownLeft className="w-4 h-4 text-red-500" />
      case "refund":
        return <RefreshCw className="w-4 h-4 text-orange-500" />
      default:
        return <Gift className="w-4 h-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: TokenTransaction['type']) => {
    switch (type) {
      case "purchase":
      case "win":
      case "refund":
        return "text-green-600"
      case "commit":
        return "text-blue-600"
      case "loss":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getTransactionBgColor = (type: TokenTransaction['type']) => {
    switch (type) {
      case "purchase":
      case "win":
      case "refund":
        return "bg-green-100"
      case "commit":
        return "bg-blue-100"
      case "loss":
        return "bg-red-100"
      default:
        return "bg-gray-100"
    }
  }

  const getStatusBadge = (status: TokenTransaction['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Pending</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-700">Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatTransactionDescription = (transaction: TokenTransaction) => {
    switch (transaction.type) {
      case 'purchase':
        return `Token purchase - ${transaction.metadata.packageId || 'Package'}`
      case 'commit':
        return transaction.metadata.predictionTitle || 'Prediction commitment'
      case 'win':
        return `Won: ${transaction.metadata.predictionTitle || 'Prediction'}`
      case 'loss':
        return `Lost: ${transaction.metadata.predictionTitle || 'Prediction'}`
      case 'refund':
        return `Refund: ${transaction.metadata.predictionTitle || 'Transaction'}`
      default:
        return 'Transaction'
    }
  }

  const formatAmount = (amount: number, type: TokenTransaction['type']) => {
    const absAmount = Math.abs(amount)
    const sign = ['purchase', 'win', 'refund'].includes(type) ? '+' : '-'
    return `${sign}${absAmount.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
          <p className="text-sm text-gray-600">
            {filteredAndSortedTransactions.length} of {transactions.length} transactions
          </p>
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-fit"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="commit">Commitments</SelectItem>
                <SelectItem value="win">Winnings</SelectItem>
                <SelectItem value="loss">Losses</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value: SortOrder) => setSortOrder(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-high">Highest Amount</SelectItem>
                <SelectItem value="amount-low">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Your transaction history will appear here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onTransactionClick?.(transaction)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getTransactionBgColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {formatTransactionDescription(transaction)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-gray-500">
                            {format(transaction.timestamp.toDate(), 'MMM d, yyyy • h:mm a')}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                        {formatAmount(transaction.amount, transaction.type)}
                      </p>
                      <p className="text-sm text-gray-500">tokens</p>
                    </div>

                    {/* View Details Icon */}
                    <div className="ml-4 flex-shrink-0">
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                )
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-gray-400">...</span>
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}