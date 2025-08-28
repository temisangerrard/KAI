"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/db/database"
import {
  Database,
  RefreshCw,
  Search,
  FileText
} from "lucide-react"

interface DatabaseStructure {
  markets: Array<{
    id: string
    title: string
    status: string
    options: Array<{
      id: string
      name: string
      tokens: number
    }>
    rawKeys: string[]
  }>
  commitments: Array<{
    id: string
    marketId: string
    position: string
    tokens: number
    userId: string
    status: string
    rawKeys: string[]
  }>
  analysis: Array<{
    marketId: string
    marketTitle: string
    marketOptions: Array<{ id: string, name: string }>
    commitmentPositions: Array<{ position: string, tokens: number, count: number }>
    matches: Array<{ optionId: string, optionName: string, matchedTokens: number }>
    unmatched: Array<{ position: string, tokens: number }>
  }>
}

export default function ExamineDatabasePage() {
  const [structure, setStructure] = useState<DatabaseStructure | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const examineDatabase = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Examining database structure...')
      
      // Get all markets
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      const markets = marketsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || 'Unnamed Market',
          status: data.status || 'unknown',
          options: (data.options || []).map((opt: any) => ({
            id: opt.id || 'no-id',
            name: opt.name || opt.text || 'Unnamed Option',
            tokens: opt.tokens || opt.totalTokens || 0
          })),
          rawKeys: Object.keys(data)
        }
      })
      
      console.log(`Found ${markets.length} markets`)
      
      // Get all commitments
      const commitmentsSnapshot = await getDocs(collection(db, 'prediction_commitments'))
      const commitments = commitmentsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          marketId: data.predictionId || 'no-market-id',
          position: data.position || 'no-position',
          tokens: data.tokensCommitted || 0,
          userId: data.userId || 'no-user',
          status: data.status || 'unknown',
          rawKeys: Object.keys(data)
        }
      })
      
      console.log(`Found ${commitments.length} commitments`)
      
      // Analyze relationships
      const analysis = markets.map(market => {
        const marketCommitments = commitments.filter(c => c.marketId === market.id)
        
        // Group commitments by position
        const positionGroups = new Map<string, { tokens: number, count: number }>()
        marketCommitments.forEach(c => {
          if (!positionGroups.has(c.position)) {
            positionGroups.set(c.position, { tokens: 0, count: 0 })
          }
          const group = positionGroups.get(c.position)!
          group.tokens += c.tokens
          group.count += 1
        })
        
        const commitmentPositions = Array.from(positionGroups.entries()).map(([position, data]) => ({
          position,
          tokens: data.tokens,
          count: data.count
        }))
        
        // Find matches between options and positions
        const matches = market.options.map(option => {
          const matchingCommitments = marketCommitments.filter(c => 
            c.position === option.id || 
            c.position === option.name ||
            c.position.toLowerCase() === option.name.toLowerCase()
          )
          
          const matchedTokens = matchingCommitments.reduce((sum, c) => sum + c.tokens, 0)
          
          return {
            optionId: option.id,
            optionName: option.name,
            matchedTokens
          }
        })
        
        // Find unmatched positions
        const unmatched = commitmentPositions.filter(cp => {
          return !market.options.some(opt => 
            cp.position === opt.id || 
            cp.position === opt.name ||
            cp.position.toLowerCase() === opt.name.toLowerCase()
          )
        }).map(cp => ({
          position: cp.position,
          tokens: cp.tokens
        }))
        
        return {
          marketId: market.id,
          marketTitle: market.title,
          marketOptions: market.options.map(opt => ({ id: opt.id, name: opt.name })),
          commitmentPositions,
          matches,
          unmatched
        }
      })
      
      setStructure({
        markets,
        commitments,
        analysis
      })
      
      console.log('✅ Database examination complete')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Examination failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Structure Examination</h1>
        <p className="text-gray-600">
          Examine how commitments are stored and how they relate to market options.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-500" />
            Database Examination
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={examineDatabase} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {loading ? 'Examining...' : 'Examine Database Structure'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800"><strong>Error:</strong> {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {structure && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Database Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{structure.markets.length}</div>
                  <div className="text-sm text-gray-600">Markets</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{structure.commitments.length}</div>
                  <div className="text-sm text-gray-600">Commitments</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Analysis */}
          {structure.analysis.map((analysis, index) => (
            <Card key={analysis.marketId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Market: {analysis.marketTitle}</span>
                  <span className="text-sm font-normal text-gray-500">ID: {analysis.marketId}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Market Options */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Market Options ({analysis.marketOptions.length})</h4>
                    <div className="space-y-2">
                      {analysis.marketOptions.map((option, idx) => (
                        <div key={option.id} className="p-3 bg-blue-50 rounded-lg">
                          <div className="font-medium text-blue-800">{option.name}</div>
                          <div className="text-sm text-blue-600">ID: {option.id}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commitment Positions */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">Commitment Positions ({analysis.commitmentPositions.length})</h4>
                    <div className="space-y-2">
                      {analysis.commitmentPositions.map((position, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg">
                          <div className="font-medium text-green-800">{position.position}</div>
                          <div className="text-sm text-green-600">
                            {position.tokens} tokens • {position.count} commitments
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Matching Analysis */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Matching Analysis</h4>
                  
                  {/* Matches */}
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Matched Options:</h5>
                    <div className="space-y-2">
                      {analysis.matches.map((match, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${
                          match.matchedTokens > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{match.optionName}</span>
                            <span className={`text-sm ${
                              match.matchedTokens > 0 ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {match.matchedTokens > 0 ? `✅ ${match.matchedTokens} tokens` : '❌ No matches'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unmatched */}
                  {analysis.unmatched.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Unmatched Positions:</h5>
                      <div className="space-y-2">
                        {analysis.unmatched.map((unmatched, idx) => (
                          <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-red-800">{unmatched.position}</span>
                              <span className="text-sm text-red-600">⚠️ {unmatched.tokens} tokens</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Raw Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Raw Data Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                <div className="mb-4">
                  <div className="text-yellow-400 font-bold">MARKETS:</div>
                  {structure.markets.map((market, idx) => (
                    <div key={idx} className="ml-2 mb-2">
                      <div>ID: {market.id}</div>
                      <div>Title: {market.title}</div>
                      <div>Keys: {market.rawKeys.join(', ')}</div>
                      <div>Options: {market.options.length}</div>
                    </div>
                  ))}
                </div>
                
                <div>
                  <div className="text-yellow-400 font-bold">COMMITMENTS:</div>
                  {structure.commitments.slice(0, 10).map((commitment, idx) => (
                    <div key={idx} className="ml-2 mb-2">
                      <div>ID: {commitment.id}</div>
                      <div>Market: {commitment.marketId}</div>
                      <div>Position: {commitment.position}</div>
                      <div>Tokens: {commitment.tokens}</div>
                      <div>Keys: {commitment.rawKeys.join(', ')}</div>
                    </div>
                  ))}
                  {structure.commitments.length > 10 && (
                    <div className="ml-2 text-gray-400">... and {structure.commitments.length - 10} more</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}