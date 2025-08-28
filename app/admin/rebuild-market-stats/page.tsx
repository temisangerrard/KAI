"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/db/database"
import {
  BarChart3,
  RefreshCw,
  CheckCircle,
  Users,
  Coins,
  TrendingUp,
  Target
} from "lucide-react"

interface ProperMarketData {
  id: string
  name: string
  status: string
  options: Array<{
    id: string
    name: string
    tokensCommitted: number
    participantCount: number
    percentage: number
  }>
  totalTokens: number
  totalParticipants: number
  commitmentCount: number
}

export default function RebuildMarketStatsPage() {
  const [marketData, setMarketData] = useState<ProperMarketData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rebuildMarketStatistics = async () => {
    setLoading(true)
    setError(null)
    setMarketData([])
    
    try {
      console.log('🔄 Rebuilding market statistics from proper commitment data...')
      
      // Get all markets
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      const markets = marketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Get all commitments
      const commitmentsSnapshot = await getDocs(collection(db, 'prediction_commitments'))
      const commitments = commitmentsSnapshot.docs.map(doc => doc.data())
      
      console.log(`Found ${markets.length} markets, ${commitments.length} commitments`)
      
      const properMarketData: ProperMarketData[] = []
      
      for (const market of markets) {
        const marketTitle = market.title || 'Unnamed Market'
        console.log(`\n📊 Processing market: "${marketTitle}"`)
        
        // Get commitments for this market
        const marketCommitments = commitments.filter(c => c.predictionId === market.id)
        console.log(`  Found ${marketCommitments.length} commitments`)
        
        // Log all commitment positions for this market
        const positionCounts = new Map<string, number>()
        marketCommitments.forEach(c => {
          positionCounts.set(c.position, (positionCounts.get(c.position) || 0) + 1)
        })
        
        console.log(`  Commitment positions:`)
        positionCounts.forEach((count, position) => {
          console.log(`    "${position}": ${count} commitments`)
        })
        
        // Extract market options with their actual IDs
        const marketOptions = (market.options || []).map((option: any, index: number) => ({
          id: option.id || `option_${index}`,
          name: option.name || option.text || `Option ${index + 1}`,
          index
        }))
        
        console.log(`  Market options:`)
        marketOptions.forEach(opt => {
          console.log(`    "${opt.name}" (ID: ${opt.id})`)
        })
        
        // Now properly aggregate commitments by their actual option IDs
        const optionStats = marketOptions.map(option => {
          // Find commitments that match this exact option ID
          const optionCommitments = marketCommitments.filter(c => c.position === option.id)
          
          const tokensCommitted = optionCommitments.reduce((sum, c) => sum + (c.tokensCommitted || 0), 0)
          const participantCount = new Set(optionCommitments.map(c => c.userId)).size
          
          console.log(`    Option "${option.name}": ${optionCommitments.length} commitments, ${tokensCommitted} tokens, ${participantCount} participants`)
          
          return {
            id: option.id,
            name: option.name,
            tokensCommitted,
            participantCount,
            percentage: 0 // Will calculate after we have totals
          }
        })
        
        // Calculate totals and percentages
        const totalTokens = optionStats.reduce((sum, opt) => sum + opt.tokensCommitted, 0)
        const totalParticipants = new Set(marketCommitments.map(c => c.userId)).size
        
        // Update percentages
        optionStats.forEach(option => {
          option.percentage = totalTokens > 0 ? (option.tokensCommitted / totalTokens) * 100 : 0
        })
        
        console.log(`  ✅ Market totals: ${totalTokens} tokens, ${totalParticipants} participants`)
        
        properMarketData.push({
          id: market.id,
          name: marketTitle,
          status: market.status || 'unknown',
          options: optionStats,
          totalTokens,
          totalParticipants,
          commitmentCount: marketCommitments.length
        })
      }
      
      setMarketData(properMarketData)
      console.log('✅ Market statistics rebuilt successfully')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Failed to rebuild market statistics:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalMarkets = marketData.length
  const totalTokens = marketData.reduce((sum, m) => sum + m.totalTokens, 0)
  const totalParticipants = marketData.reduce((sum, m) => sum + m.totalParticipants, 0)
  const totalCommitments = marketData.reduce((sum, m) => sum + m.commitmentCount, 0)

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rebuild Market Statistics</h1>
        <p className="text-gray-600">
          Phase 2: Rebuild market statistics using proper commitment-to-option mapping.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
            Proper Market Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={rebuildMarketStatistics} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            {loading ? 'Rebuilding Statistics...' : 'Rebuild Market Statistics'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Statistics */}
      {marketData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Rebuilt Statistics Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalMarkets}</div>
                <div className="text-sm text-gray-600">Markets</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{totalTokens.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Tokens</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{totalParticipants}</div>
                <div className="text-sm text-gray-600">Total Participants</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{totalCommitments}</div>
                <div className="text-sm text-gray-600">Total Commitments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Market Statistics */}
      {marketData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Proper Market Statistics</h2>
          
          {marketData.map((market, index) => (
            <Card key={market.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded mr-3">
                      #{index + 1}
                    </span>
                    {market.name}
                  </span>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    market.status === 'active' ? 'bg-green-100 text-green-800' :
                    market.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {market.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Total Tokens:</span>
                    <span className="font-medium">{market.totalTokens.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Participants:</span>
                    <span className="font-medium">{market.totalParticipants}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Commitments:</span>
                    <span className="font-medium">{market.commitmentCount}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Proper Options Breakdown:</h4>
                  {market.options.map((option, optIndex) => (
                    <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          optIndex === 0 ? 'bg-green-500' :
                          optIndex === 1 ? 'bg-red-500' :
                          optIndex === 2 ? 'bg-blue-500' :
                          optIndex === 3 ? 'bg-yellow-500' :
                          'bg-purple-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-800">{option.name}</div>
                          <div className="text-xs text-gray-500">ID: {option.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-800">
                          {option.tokensCommitted.toLocaleString()} tokens ({option.percentage.toFixed(1)}%)
                        </div>
                        <div className="text-sm text-gray-600">
                          {option.participantCount} participants
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h5 className="text-sm font-medium text-green-800 mb-2">✅ Proper Statistics</h5>
                  <div className="text-xs text-green-700 space-y-1">
                    <div>Market ID: {market.id}</div>
                    <div>Total Tokens: {market.totalTokens} (from proper aggregation)</div>
                    <div>Options: {market.options.length} (with correct token distribution)</div>
                    <div>Participants: {market.totalParticipants} (unique users)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Data Message */}
      {!loading && marketData.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Click "Rebuild Market Statistics" to generate proper statistics from commitment data.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}