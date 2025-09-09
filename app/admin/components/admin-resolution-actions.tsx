"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye,
  FileText,
  Users,
  Coins
} from 'lucide-react'
import { Market, PayoutPreview } from '@/lib/types/database'
import { MarketResolutionForm } from './market-resolution-form'

interface AdminResolutionActionsProps {
  market: Market
  onResolutionComplete?: () => void
}

export function AdminResolutionActions({ 
  market, 
  onResolutionComplete 
}: AdminResolutionActionsProps) {
  const [showResolutionForm, setShowResolutionForm] = useState(false)
  const [payoutPreview, setPayoutPreview] = useState<PayoutPreview | null>(null)
  const [loading, setLoading] = useState(false)

  const handleStartResolution = () => {
    setShowResolutionForm(true)
  }

  const handleResolutionComplete = () => {
    setShowResolutionForm(false)
    onResolutionComplete?.()
  }

  const getStatusInfo = () => {
    switch (market.status) {
      case 'pending_resolution':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'Needs Resolution',
          variant: 'destructive' as const,
          description: 'Market has ended and requires admin resolution'
        }
      case 'resolving':
        return {
          icon: <Clock className="w-4 h-4" />,
          label: 'Resolving',
          variant: 'secondary' as const,
          description: 'Resolution is currently in progress'
        }
      case 'resolved':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Resolved',
          variant: 'default' as const,
          description: 'Market has been resolved and payouts distributed'
        }
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          label: market.status,
          variant: 'outline' as const,
          description: 'Market status'
        }
    }
  }

  const statusInfo = getStatusInfo()

  if (showResolutionForm) {
    return (
      <MarketResolutionForm
        market={market}
        onComplete={handleResolutionComplete}
        onCancel={() => setShowResolutionForm(false)}
      />
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Market Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={statusInfo.variant} className="flex items-center gap-2">
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            <span className="text-sm text-gray-600">{statusInfo.description}</span>
          </div>
          
          {(market.status === 'pending_resolution' || 
            market.status === 'active' || 
            market.status === 'closed' ||
            market.status === 'resolving') && (
            <Button 
              onClick={handleStartResolution}
              className="bg-sage-600 hover:bg-sage-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              {market.status === 'pending_resolution' ? 'Start Resolution' : 'Resolve Market'}
            </Button>
          )}
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Participants</p>
              <p className="font-semibold">{market.totalParticipants || 0}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Coins className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Total Staked</p>
              <p className="font-semibold">{(market.totalTokensStaked || 0).toLocaleString()} tokens</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Ended</p>
              <p className="font-semibold">
                {market.endsAt ? (
                  market.endsAt.toMillis ? 
                    new Date(market.endsAt.toMillis()).toLocaleDateString() : 
                    new Date(market.endsAt).toLocaleDateString()
                ) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Market Options */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Market Options</h4>
          <div className="space-y-2">
            {(market.options || []).map((option) => (
              <div 
                key={option.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <h5 className="font-medium">{option.text}</h5>
                  <p className="text-sm text-gray-600">
                    {option.participantCount || 0} participants • {(option.totalTokens || 0).toLocaleString()} tokens
                  </p>
                </div>
                {option.isCorrect && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Winner
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Details (if resolved) */}
        {market.status === 'resolved' && market.resolution && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Resolution Details</h4>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Market Resolved</span>
              </div>
              <p className="text-sm text-green-700 mb-2">
                Resolved on {market.resolution.resolvedAt ? (
                  market.resolution.resolvedAt.toMillis ? 
                    new Date(market.resolution.resolvedAt.toMillis()).toLocaleDateString() : 
                    new Date(market.resolution.resolvedAt).toLocaleDateString()
                ) : 'Unknown date'}
              </p>
              <div className="text-sm text-green-700">
                <p>Winners: {market.resolution.winnerCount || 0}</p>
                <p>Total Payout: {(market.resolution.totalPayout || 0).toLocaleString()} tokens</p>
                {market.resolution.creatorFeeAmount && (
                  <p>Creator Fee: {(market.resolution.creatorFeeAmount || 0).toLocaleString()} tokens</p>
                )}
                {market.resolution.houseFeeAmount && (
                  <p>House Fee: {(market.resolution.houseFeeAmount || 0).toLocaleString()} tokens</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          
          {market.status === 'resolved' && (
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              View Evidence
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}