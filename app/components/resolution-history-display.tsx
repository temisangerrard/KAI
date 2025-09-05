'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, CheckCircle, XCircle, Clock, Eye, ExternalLink } from 'lucide-react'
import { MarketResolution, Market, Evidence } from '@/lib/types/database'
import { ResolutionService } from '@/lib/services/resolution-service'
import { format } from 'date-fns'

interface ResolutionHistoryDisplayProps {
  marketId: string
  market?: Market
  className?: string
}

interface ResolutionHistoryData {
  resolution: MarketResolution | null
  market: Market | null
  loading: boolean
  error: string | null
}

export function ResolutionHistoryDisplay({ 
  marketId, 
  market: providedMarket,
  className = '' 
}: ResolutionHistoryDisplayProps) {
  const [data, setData] = useState<ResolutionHistoryData>({
    resolution: null,
    market: providedMarket || null,
    loading: true,
    error: null
  })
  const [showEvidence, setShowEvidence] = useState(false)

  useEffect(() => {
    loadResolutionHistory()
  }, [marketId])

  const loadResolutionHistory = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))
      
      const resolution = await ResolutionService.getMarketResolution(marketId)
      
      // If no market provided, we could fetch it, but for now we'll work with what we have
      setData(prev => ({
        ...prev,
        resolution,
        loading: false
      }))
    } catch (error) {
      console.error('Error loading resolution history:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load resolution history'
      }))
    }
  }

  const getStatusBadge = (status: MarketResolution['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      case 'disputed':
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Disputed
        </Badge>
      case 'cancelled':
        return <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      default:
        return <Badge variant="outline">
          <Clock className="w-3 h-3 mr-1" />
          Unknown
        </Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat().format(amount)
  }

  const getEvidenceIcon = (type: Evidence['type']) => {
    switch (type) {
      case 'url':
        return <ExternalLink className="w-4 h-4" />
      case 'screenshot':
        return <Eye className="w-4 h-4" />
      case 'description':
        return <CalendarDays className="w-4 h-4" />
      default:
        return <CalendarDays className="w-4 h-4" />
    }
  }

  if (data.loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-600"></div>
            <span className="ml-3 text-sage-600">Loading resolution history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{data.error}</p>
            <Button onClick={loadResolutionHistory} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data.resolution) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">This market has not been resolved yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { resolution } = data

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Resolution History</CardTitle>
          {getStatusBadge(resolution.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resolution Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Resolution Details</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Resolved:</span> {format(resolution.resolvedAt.toDate(), 'PPP p')}</p>
              <p><span className="font-medium">Winning Option:</span> {resolution.winningOptionId}</p>
              <p><span className="font-medium">Winners:</span> {resolution.winnerCount} participants</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Payout Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Total Distributed:</span> {formatCurrency(resolution.totalPayout)} tokens</p>
              {resolution.creatorFeeAmount && (
                <p><span className="font-medium">Creator Fee:</span> {formatCurrency(resolution.creatorFeeAmount)} tokens</p>
              )}
              {resolution.houseFeeAmount && (
                <p><span className="font-medium">Platform Fee:</span> {formatCurrency(resolution.houseFeeAmount)} tokens</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Evidence Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Resolution Evidence</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEvidence(!showEvidence)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showEvidence ? 'Hide' : 'View'} Evidence
            </Button>
          </div>

          {showEvidence && (
            <div className="space-y-3">
              {resolution.evidence.map((evidence, index) => (
                <div key={evidence.id || index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getEvidenceIcon(evidence.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {evidence.type.charAt(0).toUpperCase() + evidence.type.slice(1)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(evidence.uploadedAt.toDate(), 'PPP p')}
                        </span>
                      </div>
                      
                      {evidence.type === 'url' ? (
                        <a
                          href={evidence.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {evidence.content}
                        </a>
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap break-words">
                          {evidence.content}
                        </p>
                      )}
                      
                      {evidence.description && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {evidence.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {resolution.evidence.length === 0 && (
                <p className="text-gray-500 text-center py-4">No evidence provided</p>
              )}
            </div>
          )}
        </div>

        {/* Admin Info */}
        <Separator />
        <div className="text-xs text-gray-500">
          <p>Resolved by admin: {resolution.resolvedBy}</p>
          <p>Resolution ID: {resolution.id}</p>
        </div>
      </CardContent>
    </Card>
  )
}