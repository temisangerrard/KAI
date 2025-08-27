"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Gift,
  RefreshCw,
  Copy,
  ExternalLink,
  Calendar,
  CreditCard,
  Target,
  Hash
} from "lucide-react"
import { TokenTransaction } from "@/lib/types/token"
import { format } from "date-fns"
import { useState } from "react"

interface TransactionDetailModalProps {
  isOpen: boolean
  transaction: TokenTransaction | null
  onClose: () => void
  onViewPrediction?: (predictionId: string) => void
}

export function TransactionDetailModal({
  isOpen,
  transaction,
  onClose,
  onViewPrediction
}: TransactionDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!transaction) return null

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getTransactionIcon = (type: TokenTransaction['type']) => {
    switch (type) {
      case "purchase":
        return <Plus className="w-6 h-6 text-green-500" />
      case "commit":
        return <ArrowUpRight className="w-6 h-6 text-blue-500" />
      case "win":
        return <TrendingUp className="w-6 h-6 text-green-500" />
      case "loss":
        return <ArrowDownLeft className="w-6 h-6 text-red-500" />
      case "refund":
        return <RefreshCw className="w-6 h-6 text-orange-500" />
      default:
        return <Gift className="w-6 h-6 text-gray-500" />
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
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const formatTransactionTitle = (transaction: TokenTransaction) => {
    switch (transaction.type) {
      case 'purchase':
        return 'Token Purchase'
      case 'commit':
        return 'Prediction Commitment'
      case 'win':
        return 'Prediction Win'
      case 'loss':
        return 'Prediction Loss'
      case 'refund':
        return 'Transaction Refund'
      default:
        return 'Transaction'
    }
  }

  const formatAmount = (amount: number, type: TokenTransaction['type']) => {
    const absAmount = Math.abs(amount)
    const sign = ['purchase', 'win', 'refund'].includes(type) ? '+' : '-'
    return `${sign}${absAmount.toLocaleString()}`
  }

  const getTransactionDescription = (transaction: TokenTransaction) => {
    switch (transaction.type) {
      case 'purchase':
        return `You purchased ${Math.abs(transaction.amount).toLocaleString()} tokens`
      case 'commit':
        return `You committed ${Math.abs(transaction.amount).toLocaleString()} tokens to a prediction`
      case 'win':
        return `You won ${Math.abs(transaction.amount).toLocaleString()} tokens from a prediction`
      case 'loss':
        return `You lost ${Math.abs(transaction.amount).toLocaleString()} tokens from a prediction`
      case 'refund':
        return `You received a refund of ${Math.abs(transaction.amount).toLocaleString()} tokens`
      default:
        return 'Transaction completed'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getTransactionBgColor(transaction.type)}`}>
              {getTransactionIcon(transaction.type)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{formatTransactionTitle(transaction)}</h2>
              <p className="text-sm text-gray-600 font-normal">
                {format(transaction.timestamp.toDate(), 'MMMM d, yyyy • h:mm a')}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transaction Summary */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <p className={`text-4xl font-bold mb-2 ${getTransactionColor(transaction.type)}`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </p>
                <p className="text-lg text-gray-600 mb-4">KAI Tokens</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  {getStatusBadge(transaction.status)}
                </div>
                <p className="text-gray-700">{getTransactionDescription(transaction)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Balance Changes */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Balance Changes</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Before</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {transaction.balanceBefore.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">tokens</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">After</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {transaction.balanceAfter.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">tokens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Transaction Details</h3>
              <div className="space-y-4">
                {/* Transaction ID */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Transaction ID</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {transaction.id.slice(0, 8)}...{transaction.id.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(transaction.id, 'id')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {copiedField === 'id' && (
                      <span className="text-xs text-green-600">Copied!</span>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Date & Time</span>
                  </div>
                  <span className="text-gray-900">
                    {format(transaction.timestamp.toDate(), 'MMM d, yyyy • h:mm:ss a')}
                  </span>
                </div>

                {/* Type */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Type</span>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {transaction.type}
                  </Badge>
                </div>

                {/* Stripe Payment ID (if available) */}
                {transaction.metadata.stripePaymentId && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Payment ID</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {transaction.metadata.stripePaymentId.slice(0, 8)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transaction.metadata.stripePaymentId!, 'payment')}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {copiedField === 'payment' && (
                        <span className="text-xs text-green-600">Copied!</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Prediction Title (if available) */}
                {transaction.metadata.predictionTitle && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Prediction</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 max-w-xs truncate">
                        {transaction.metadata.predictionTitle}
                      </span>
                      {transaction.relatedId && onViewPrediction && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewPrediction(transaction.relatedId!)}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Package ID (if available) */}
                {transaction.metadata.packageId && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Package</span>
                    </div>
                    <Badge variant="outline">
                      {transaction.metadata.packageId}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Metadata */}
          {Object.keys(transaction.metadata).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="space-y-2">
                  {Object.entries(transaction.metadata)
                    .filter(([key]) => !['stripePaymentId', 'predictionTitle', 'packageId'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-gray-900 text-sm">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
            {transaction.relatedId && onViewPrediction && (
              <Button
                variant="outline"
                onClick={() => onViewPrediction(transaction.relatedId!)}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Prediction
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}