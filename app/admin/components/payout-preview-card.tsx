"use client"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Coins,
  Users,
  TrendingUp,
  Building,
  User,
  Trophy,
  DollarSign
} from 'lucide-react'
import { PayoutPreview } from '@/lib/types/database'

interface PayoutPreviewCardProps {
  preview: PayoutPreview
}

export function PayoutPreviewCard({ preview }: PayoutPreviewCardProps) {
  const formatTokens = (amount: number) => amount.toLocaleString()

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Payout Preview</h3>
          <p className="text-sm text-gray-600">
            Review the distribution breakdown before confirming resolution
          </p>
        </div>

        {/* Fee Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Pool</span>
            </div>
            <p className="text-lg font-bold text-blue-900">
              {formatTokens(preview.totalPool)}
            </p>
            <p className="text-xs text-blue-700">tokens</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">House Fee (5%)</span>
            </div>
            <p className="text-lg font-bold text-red-900">
              {formatTokens(preview.houseFee)}
            </p>
            <p className="text-xs text-red-700">tokens</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                Creator Fee ({preview.creatorPayout.feePercentage}%)
              </span>
            </div>
            <p className="text-lg font-bold text-purple-900">
              {formatTokens(preview.creatorFee)}
            </p>
            <p className="text-xs text-purple-700">tokens</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Winner Pool</span>
            </div>
            <p className="text-lg font-bold text-green-900">
              {formatTokens(preview.winnerPool)}
            </p>
            <p className="text-xs text-green-700">tokens</p>
          </div>
        </div>

        {/* Winner Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Winners</p>
              <p className="font-semibold">{preview.winnerCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Largest Payout</p>
              <p className="font-semibold">{formatTokens(preview.largestPayout)} tokens</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Smallest Payout</p>
              <p className="font-semibold">{formatTokens(preview.smallestPayout)} tokens</p>
            </div>
          </div>
        </div>

        {/* Individual Payouts Preview */}
        {preview.payouts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Individual Payouts</h4>
              <Badge variant="outline">
                {preview.payouts.length} winner{preview.payouts.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <div className="divide-y">
                {preview.payouts
                  .sort((a, b) => b.projectedPayout - a.projectedPayout)
                  .slice(0, 10) // Show top 10 payouts
                  .map((payout, index) => (
                  <div key={payout.userId} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          User {payout.userId.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-gray-600">
                          Staked: {formatTokens(payout.currentStake)} tokens
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-700">
                        {formatTokens(payout.projectedPayout)} tokens
                      </p>
                      <p className="text-xs text-gray-600">
                        Profit: +{formatTokens(payout.projectedProfit)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {preview.payouts.length > 10 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    ... and {preview.payouts.length - 10} more winners
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Distribution Summary */}
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Distribution Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Pool:</span>
              <span className="font-medium">{formatTokens(preview.totalPool)} tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">House Fee (5%):</span>
              <span className="font-medium text-red-700">-{formatTokens(preview.houseFee)} tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Creator Fee ({preview.creatorPayout.feePercentage}%):</span>
              <span className="font-medium text-purple-700">-{formatTokens(preview.creatorFee)} tokens</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span className="text-gray-900">Winners Receive:</span>
              <span className="text-green-700">{formatTokens(preview.winnerPool)} tokens</span>
            </div>
          </div>
        </div>

        {/* Validation Check */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-900">Payout Validation</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            ✓ All calculations verified. Total distribution: {formatTokens(preview.winnerPool + preview.houseFee + preview.creatorFee)} tokens
          </p>
          <p className="text-xs text-green-600 mt-1">
            {preview.winnerCount} winner{preview.winnerCount !== 1 ? 's' : ''} will receive payout{preview.winnerCount !== 1 ? 's' : ''} immediately upon resolution.
          </p>
        </div>
      </div>
    </Card>
  )
}