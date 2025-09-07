"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle,
  CheckCircle,
  FileText,
  Link as LinkIcon,
  Upload,
  X,
  Users,
  Coins,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Market, Evidence, PayoutPreview } from '@/lib/types/database'
import { useAuth } from '@/app/auth/auth-context'
import { EvidenceCollectionForm } from './evidence-collection-form'
import { PayoutPreviewCard } from './payout-preview-card'

interface MarketResolutionFormProps {
  market: Market
  onComplete: () => void
  onCancel: () => void
}

export function MarketResolutionForm({ 
  market, 
  onComplete, 
  onCancel 
}: MarketResolutionFormProps) {
  const { user } = useAuth()
  const [selectedWinner, setSelectedWinner] = useState<string>('')
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [payoutPreview, setPayoutPreview] = useState<PayoutPreview | null>(null)
  const [creatorFeePercentage, setCreatorFeePercentage] = useState(2) // Default 2%
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Calculate payout preview when winner selection changes
  useEffect(() => {
    if (selectedWinner) {
      calculatePayoutPreview()
    } else {
      setPayoutPreview(null)
    }
  }, [selectedWinner, creatorFeePercentage])

  const calculatePayoutPreview = async () => {
    try {
      setError(null)
      
      if (!user) {
        setError('Admin authentication required')
        return
      }

      // Use the same user ID logic as useAdminAuth hook: user.id || user.address
      const userId = user.id || user.address;
      
      // Make API call to admin payout preview endpoint with proper authentication
      const response = await fetch(`/api/admin/markets/${market.id}/payout-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId, // Send user ID in header for admin authentication
        },
        body: JSON.stringify({
          winningOptionId: selectedWinner,
          creatorFeePercentage: creatorFeePercentage / 100
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPayoutPreview(result.preview)
      } else {
        console.error('Error calculating payout preview:', result.error || result.message)
        setError('Failed to calculate payout preview')
      }
    } catch (err) {
      console.error('Error calculating payout preview:', err)
      setError('Failed to calculate payout preview')
    }
  }

  const validateResolution = (): boolean => {
    const errors: string[] = []

    if (!selectedWinner) {
      errors.push('Please select a winning option')
    }

    if (evidence.length === 0) {
      errors.push('At least one piece of evidence is required')
    }

    const hasUrl = evidence.some(e => e.type === 'url' && e.content.trim())
    const hasDescription = evidence.some(e => e.type === 'description' && e.content.trim())
    
    if (!hasUrl && !hasDescription) {
      errors.push('Resolution must include either a source URL or detailed description')
    }

    // Validate evidence content
    evidence.forEach((item, index) => {
      if (item.type === 'url') {
        try {
          new URL(item.content)
        } catch {
          errors.push(`Evidence item ${index + 1}: Invalid URL format`)
        }
      }

      if (item.content.trim().length < 10) {
        errors.push(`Evidence item ${index + 1}: Content is too short (minimum 10 characters)`)
      }
    })

    if (creatorFeePercentage < 1 || creatorFeePercentage > 5) {
      errors.push('Creator fee must be between 1% and 5%')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleResolve = async () => {
    if (!validateResolution()) {
      return
    }

    if (!user) {
      setError('Admin authentication required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use the same user ID logic as useAdminAuth hook: user.id || user.address
      const userId = user.id || user.address;
      
      // Make API call to admin resolution endpoint with proper authentication
      const response = await fetch(`/api/admin/markets/${market.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId, // Send user ID in header for admin authentication
        },
        body: JSON.stringify({
          winningOptionId: selectedWinner,
          evidence: evidence,
          creatorFeePercentage: creatorFeePercentage / 100
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        onComplete()
      } else {
        setError(result.message || result.error || 'Failed to resolve market')
      }
    } catch (err) {
      console.error('Error resolving market:', err)
      setError(err instanceof Error ? err.message : 'Failed to resolve market')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resolve Market</h2>
          <p className="text-gray-600 mt-1">"{market.title}"</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-red-800 font-medium">Error</p>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </Card>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-amber-800 font-medium">Please fix the following issues:</p>
          </div>
          <ul className="text-amber-700 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Market Summary */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Market Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Participants</p>
              <p className="font-semibold">{market.totalParticipants}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Total Pool</p>
              <p className="font-semibold">{market.totalTokensStaked.toLocaleString()} tokens</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Creator Fee</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={creatorFeePercentage}
                  onChange={(e) => setCreatorFeePercentage(Number(e.target.value))}
                  className="w-16 h-8 text-sm"
                />
                <span className="text-sm">%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Winner Selection */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Select Winning Option</h3>
        <div className="space-y-3">
          {market.options.map((option) => (
            <div 
              key={option.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedWinner === option.id 
                  ? 'border-sage-500 bg-sage-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedWinner(option.id)}
            >
              <label className="flex items-start space-x-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="winner" 
                  value={option.id}
                  checked={selectedWinner === option.id}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{option.text}</h4>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>{option.participantCount} participants</span>
                    <span>{option.totalTokens.toLocaleString()} tokens staked</span>
                    {selectedWinner === option.id && payoutPreview && (
                      <Badge variant="default" className="bg-sage-100 text-sage-800">
                        {payoutPreview.winnerCount} winners will receive payouts
                      </Badge>
                    )}
                  </div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </Card>

      {/* Evidence Collection */}
      <EvidenceCollectionForm 
        evidence={evidence}
        onChange={setEvidence}
      />

      {/* Payout Preview */}
      {payoutPreview && (
        <PayoutPreviewCard preview={payoutPreview} />
      )}

      {/* Resolution Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Ready to Resolve?</h3>
            <p className="text-sm text-gray-600 mt-1">
              This action cannot be undone. Payouts will be distributed immediately.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve}
              disabled={loading || !selectedWinner || evidence.length === 0}
              className="bg-sage-600 hover:bg-sage-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve Market & Distribute Payouts
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}