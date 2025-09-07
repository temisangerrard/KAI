"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Market, MarketResolution, Evidence, ResolutionPayout } from "@/lib/types/database"
import { useAuth } from "@/app/auth/auth-context"
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Trophy,
  Coins,
  Eye,
  Calendar,
  User,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon
} from "lucide-react"

interface UserResolutionFormProps {
  market: Market
  onClose?: () => void
}

export function UserResolutionForm({ market, onClose }: UserResolutionFormProps) {
  const { user } = useAuth()
  const [resolution, setResolution] = useState<MarketResolution | null>(null)
  const [userPayout, setUserPayout] = useState<ResolutionPayout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResolutionData = async () => {
      if (!market.id) return

      try {
        setLoading(true)
        setError(null)

        // Fetch resolution details if market is resolved
        if (market.status === 'resolved' && market.resolution) {
          const resolutionResponse = await fetch(`/api/markets/${market.id}/resolution`)
          if (resolutionResponse.ok) {
            const resolutionData = await resolutionResponse.json()
            setResolution(resolutionData)
          }

          // Fetch user's payout if they participated
          if (user?.uid) {
            const payoutResponse = await fetch(`/api/user/payouts?marketId=${market.id}`)
            if (payoutResponse.ok) {
              const payoutData = await payoutResponse.json()
              const userPayoutData = payoutData.winnerPayouts?.find(
                (payout: ResolutionPayout) => payout.userId === user.uid
              )
              setUserPayout(userPayoutData || null)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching resolution data:', err)
        setError('Failed to load resolution details')
      } finally {
        setLoading(false)
      }
    }

    fetchResolutionData()
  }, [market.id, market.status, market.resolution, user?.uid])

  const getStatusInfo = () => {
    switch (market.status) {
      case 'pending_resolution':
        return {
          icon: <Clock className="h-5 w-5 text-amber-600" />,
          title: 'Awaiting Resolution',
          description: 'This market has ended and is awaiting admin resolution. You will be notified when the outcome is determined.',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-800'
        }
      case 'resolving':
        return {
          icon: <AlertCircle className="h-5 w-5 text-blue-600" />,
          title: 'Resolution in Progress',
          description: 'An administrator is currently reviewing evidence and determining the outcome.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        }
      case 'resolved':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          title: 'Market Resolved',
          description: 'The outcome has been determined and payouts have been distributed.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        }
      default:
        return null
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getWinningOption = () => {
    if (!resolution) return null
    return market.options.find(option => option.id === resolution.winningOptionId)
  }

  const renderEvidence = (evidence: Evidence[]) => {
    if (!evidence || evidence.length === 0) {
      return (
        <p className="text-gray-500 italic">No evidence provided</p>
      )
    }

    return (
      <div className="space-y-3">
        {evidence.map((item, index) => (
          <div key={index} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {item.type === 'url' && <LinkIcon className="h-4 w-4 text-blue-600" />}
                {item.type === 'screenshot' && <ImageIcon className="h-4 w-4 text-green-600" />}
                {item.type === 'description' && <FileText className="h-4 w-4 text-gray-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDate(item.uploadedAt)}
                  </span>
                </div>
                {item.type === 'url' ? (
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                  >
                    {item.content}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-gray-800">{item.content}</p>
                )}
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const statusInfo = getStatusInfo()
  const winningOption = getWinningOption()

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">Loading resolution details...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!statusInfo) {
    return null // Don't show for active markets
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-800">
            Market Resolution
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Alert */}
        <Alert className={`${statusInfo.bgColor} ${statusInfo.borderColor}`}>
          <div className="flex items-center gap-3">
            {statusInfo.icon}
            <div>
              <h4 className={`font-medium ${statusInfo.textColor}`}>
                {statusInfo.title}
              </h4>
              <AlertDescription className={statusInfo.textColor}>
                {statusInfo.description}
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {/* Market Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">{market.title}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                Ended: {formatDate(market.endsAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {market.totalParticipants} participants
              </span>
            </div>
          </div>
        </div>

        {/* Resolution Details (if resolved) */}
        {market.status === 'resolved' && resolution && (
          <>
            <Separator />
            
            {/* Winning Option */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                Winning Outcome
              </h4>
              {winningOption && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${winningOption.color || 'bg-green-500'}`}></div>
                    <span className="font-medium text-green-800">{winningOption.text}</span>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      Winner
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* User Payout Information */}
            {user && (
              <div>
                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-600" />
                  Your Result
                </h4>
                {userPayout ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-800">Congratulations! You won!</span>
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        Winner
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Tokens Staked:</span>
                        <div className="font-medium">{userPayout.tokensStaked}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Payout:</span>
                        <div className="font-medium text-green-600">{userPayout.payoutAmount}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Profit:</span>
                        <div className="font-medium text-green-600">+{userPayout.profit}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-600">
                      You did not win this market, or you did not participate.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Resolution Evidence */}
            <div>
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                Resolution Evidence
              </h4>
              {renderEvidence(resolution.evidence)}
            </div>

            {/* Resolution Metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-800 mb-2">Resolution Details</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Resolved by: Admin
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Resolved: {formatDate(resolution.resolvedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Winners: {resolution.winnerCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">
                    Total Payout: {resolution.totalPayout} tokens
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}