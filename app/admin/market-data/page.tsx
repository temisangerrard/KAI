"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/db/database"
import { AdminCommitmentService } from "@/lib/services/admin-commitment-service"
import {
  Database,
  RefreshCw,
  BarChart3,
  Users,
  Coins,
  TrendingUp,
  Download
} from "lucide-react"

interface MarketData {
  id: string
  name: string
  options: Array<{
    id: string
    name: string
    tokensCommitted: number
    participantCount: number
  }>
  totalTokens: number
  totalUniqueParticipants: number
  status: string
}

export default function MarketDataPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const retrieveAllMarketData = async (): Promise<MarketData[]> => {
    console.log('🔍 Retrieving all market data with optimized calculations...')
    
    try {
      // Get all markets from Firestore
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      const markets = marketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log(`Found ${markets.length} markets`)
      
      const marketDataList: MarketData[] = []
      
      // Process each market using the optimized service
      for (const market of markets) {
        const marketTitle = market.title || 'Unnamed Market'
        console.log(`\nProcessing market: "${marketTitle}" (${market.id})`)
        
        try {
          // Use AdminCommitmentService to get real commitment data (same logic as MarketStatistics)
          const result = await AdminCommitmentService.getMarketCommitments(market.id, {
            pageSize: 1000, // Get all commitments for this market
            includeAnalytics: true
          })
          
          if (result.commitments && result.commitments.length > 0) {
            // Calculate real statistics from commitments
            const totalTokensCommitted = result.commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
            const totalParticipants = new Set(result.commitments.map(c => c.userId)).size
            
            // Group commitments by option
            const tokenDistribution: { [optionId: string]: number } = {}
            const participantDistribution: { [optionId: string]: number } = {}
            
            (market.options || []).forEach((option: any) => {
              const optionCommitments = result.commitments.filter(c => 
                c.position === option.id || c.position === option.name
              )
              
              tokenDistribution[option.id] = optionCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
              participantDistribution[option.id] = new Set(optionCommitments.map(c => c.userId)).size
            })
            
            console.log(`  Real data - Total tokens: ${totalTokensCommitted}, Participants: ${totalParticipants}`)
            
            // Build options array using real commitment data
            const options: MarketData['options'] = (market.options || []).map((option: any, index: number) => {
              const optionId = option.id || `option_${index}`
              const optionName = option.name || option.text || `Option ${index + 1}`
              const tokensCommitted = tokenDistribution[optionId] || 0
              const participantCount = participantDistribution[optionId] || 0
              
              console.log(`    Option: "${optionName}" | Tokens: ${tokensCommitted} | Participants: ${participantCount}`)
              
              return {
                id: optionId,
                name: optionName,
                tokensCommitted,
                participantCount
              }
            })
            
            const marketInfo: MarketData = {
              id: market.id,
              name: marketTitle,
              options,
              totalTokens: totalTokensCommitted,
              totalUniqueParticipants: totalParticipants,
              status: market.status || 'active'
            }
            
            marketDataList.push(marketInfo)
            
            console.log(`✅ Market processed with real data: ${options.length} options, ${totalTokensCommitted} total tokens`)
            
          } else {
            // Market exists but has no commitments yet
            console.log(`  ℹ️ Market ${market.id} has no commitments yet`)
            
            const options: MarketData['options'] = (market.options || []).map((option: any, index: number) => ({
              id: option.id || `option_${index}`,
              name: option.name || option.text || `Option ${index + 1}`,
              tokensCommitted: 0,
              participantCount: 0
            }))
            
            marketDataList.push({
              id: market.id,
              name: marketTitle,
              options,
              totalTokens: 0,
              totalUniqueParticipants: 0,
              status: market.status || 'active'
            })
          }
          
        } catch (marketError) {
          console.warn(`Error processing market ${market.id} with AdminCommitmentService:`, marketError)
          
          // Fallback to basic market data
          const options: MarketData['options'] = (market.options || []).map((option: any, index: number) => ({
            id: option.id || `option_${index}`,
            name: option.name || option.text || `Option ${index + 1}`,
            tokensCommitted: option.tokens || 0,
            participantCount: 0
          }))
          
          marketDataList.push({
            id: market.id,
            name: marketTitle,
            options,
            totalTokens: market.totalTokens || 0,
            totalUniqueParticipants: market.participants || 0,
            status: market.status || 'unknown'
          })
        }
      }
      
      return marketDataList
      
    } catch (error) {
      console.error('❌ Error retrieving market data:', error)
      throw error
    }
  }

  const handleRetrieveData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await retrieveAllMarketData()
      setMarketData(data)
      console.log('✅ Market data retrieved successfully:', data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Failed to retrieve market data:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToJSON = () => {
    const dataStr = JSON.stringify(marketData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `market-data-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalMarkets = marketData.length
  const totalTokens = marketData.reduce((sum, m) => sum + m.totalTokens, 0)
  const totalParticipants = marketData.reduce((sum, m) => sum + m.totalUniqueParticipants, 0)
  const activeMarkets = marketData.filter(m => m.status === 'active').length

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Market Data</h1>
        <p className="text-gray-600">
          Retrieve and analyze all market data including names, options, token commitments, and participant counts.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-500" />
            Data Retrieval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={handleRetrieveData} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              {loading ? 'Retrieving Data...' : 'Retrieve Market Data'}
            </Button>
            
            {marketData.length > 0 && (
              <Button 
                variant="outline" 
                onClick={exportToJSON}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
            )}
          </div>
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
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              Overall Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalMarkets}</div>
                <div className="text-sm text-gray-600">Total Markets</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{activeMarkets}</div>
                <div className="text-sm text-gray-600">Active Markets</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{totalTokens.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Tokens</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{totalParticipants}</div>
                <div className="text-sm text-gray-600">Total Participants</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Data Display */}
      {marketData.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Details</h2>
          
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
                    <span className="font-medium">{market.totalUniqueParticipants}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Options:</span>
                    <span className="font-medium">{market.options.length}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">Options Breakdown:</h4>
                  {market.options.map((option, optIndex) => {
                    const percentage = market.totalTokens > 0 ? 
                      ((option.tokensCommitted / market.totalTokens) * 100).toFixed(1) : '0.0'
                    
                    return (
                      <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            optIndex === 0 ? 'bg-green-500' :
                            optIndex === 1 ? 'bg-red-500' :
                            optIndex === 2 ? 'bg-blue-500' :
                            optIndex === 3 ? 'bg-yellow-500' :
                            'bg-purple-500'
                          }`}></div>
                          <span className="font-medium text-gray-800">{option.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-800">
                            {option.tokensCommitted.toLocaleString()} tokens ({percentage}%)
                          </div>
                          <div className="text-sm text-gray-600">
                            {option.participantCount} participants
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Debug Info</h5>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>Market ID: {market.id}</div>
                    <div>Total Tokens Calculated: {market.totalTokens}</div>
                    <div>Options Found: {market.options.length}</div>
                    <div>Participants: {market.totalUniqueParticipants}</div>
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
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No market data retrieved yet. Click "Retrieve Market Data" to fetch data from Firestore.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}