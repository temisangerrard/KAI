"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  query,
  where
} from "firebase/firestore"
import { db } from "@/lib/db/database"
import {
  Wrench,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Database,
  Target
} from "lucide-react"

interface CommitmentFix {
  id: string
  currentPosition: string
  suggestedOptionId: string
  tokens: number
  marketTitle: string
}

interface MarketAnalysis {
  marketId: string
  marketTitle: string
  options: Array<{ id: string, name: string }>
  commitments: CommitmentFix[]
  needsFixes: number
}

export default function FixCommitmentsPage() {
  const [analysis, setAnalysis] = useState<MarketAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<string[]>([])

  const analyzeCommitments = async () => {
    setLoading(true)
    setError(null)
    setAnalysis([])
    
    try {
      console.log('🔍 Analyzing commitment option ID issues...')
      
      // Get all markets
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      console.log(`Found ${marketsSnapshot.size} markets to analyze`)
      
      const marketAnalyses: MarketAnalysis[] = []
      
      for (const marketDoc of marketsSnapshot.docs) {
        const marketData = marketDoc.data()
        const marketId = marketDoc.id
        const marketTitle = marketData.title || 'Unnamed Market'
        
        console.log(`Analyzing market: "${marketTitle}"`)
        
        // Extract market options
        const marketOptions: Array<{ id: string, name: string }> = []
        
        if (marketData.options && Array.isArray(marketData.options)) {
          marketData.options.forEach((option: any, index: number) => {
            const optionId = option.id || `option_${index}`
            const optionName = option.name || option.text || `Option ${index + 1}`
            marketOptions.push({ id: optionId, name: optionName })
          })
        }
        
        // Get commitments for this market
        const commitmentsQuery = query(
          collection(db, 'prediction_commitments'),
          where('predictionId', '==', marketId)
        )
        
        const commitmentsSnapshot = await getDocs(commitmentsQuery)
        const commitments = commitmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        const commitmentFixes: CommitmentFix[] = []
        
        // Analyze each commitment
        for (const commitment of commitments) {
          const currentPosition = commitment.position
          const tokens = commitment.tokensCommitted || 0
          
          // Determine the correct option ID
          let suggestedOptionId = currentPosition
          
          // If it's a generic yes/no, try to map to actual options
          if (currentPosition === 'yes' || currentPosition === 'no') {
            if (marketOptions.length === 2) {
              // Binary market - map yes to first option, no to second
              if (currentPosition === 'yes') {
                suggestedOptionId = marketOptions[0].id
              } else {
                suggestedOptionId = marketOptions[1].id
              }
            } else if (marketOptions.length > 2) {
              // Multi-option market - try semantic matching
              const yesKeywords = ['yes', 'stay', 'together', 'will', 'true', 'positive']
              const noKeywords = ['no', 'break', 'up', 'wont', 'false', 'negative']
              
              if (currentPosition === 'yes') {
                const matchedOption = marketOptions.find(opt => 
                  yesKeywords.some(keyword => opt.name.toLowerCase().includes(keyword))
                )
                if (matchedOption) {
                  suggestedOptionId = matchedOption.id
                }
              } else {
                const matchedOption = marketOptions.find(opt => 
                  noKeywords.some(keyword => opt.name.toLowerCase().includes(keyword))
                )
                if (matchedOption) {
                  suggestedOptionId = matchedOption.id
                }
              }
            }
          }
          
          commitmentFixes.push({
            id: commitment.id,
            currentPosition,
            suggestedOptionId,
            tokens,
            marketTitle
          })
        }
        
        const needsFixes = commitmentFixes.filter(c => c.currentPosition !== c.suggestedOptionId).length
        
        marketAnalyses.push({
          marketId,
          marketTitle,
          options: marketOptions,
          commitments: commitmentFixes,
          needsFixes
        })
      }
      
      setAnalysis(marketAnalyses)
      console.log('✅ Analysis complete')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyFixes = async () => {
    setFixing(true)
    setFixResults([])
    
    try {
      const results: string[] = []
      let totalFixed = 0
      
      for (const market of analysis) {
        const commitmentsToFix = market.commitments.filter(c => 
          c.currentPosition !== c.suggestedOptionId
        )
        
        if (commitmentsToFix.length === 0) {
          results.push(`✅ ${market.marketTitle}: No fixes needed`)
          continue
        }
        
        results.push(`🔧 ${market.marketTitle}: Fixing ${commitmentsToFix.length} commitments`)
        
        const batch = writeBatch(db)
        
        for (const commitment of commitmentsToFix) {
          const commitmentRef = doc(db, 'prediction_commitments', commitment.id)
          batch.update(commitmentRef, {
            position: commitment.suggestedOptionId,
            fixedAt: new Date(),
            originalPosition: commitment.currentPosition
          })
          
          results.push(`  • ${commitment.id}: "${commitment.currentPosition}" → "${commitment.suggestedOptionId}" (${commitment.tokens} tokens)`)
        }
        
        try {
          await batch.commit()
          totalFixed += commitmentsToFix.length
          results.push(`  ✅ Successfully updated ${commitmentsToFix.length} commitments`)
        } catch (error) {
          results.push(`  ❌ Failed to update commitments: ${error}`)
        }
      }
      
      results.push(`\n🎉 Total commitments fixed: ${totalFixed}`)
      setFixResults(results)
      
      // Refresh analysis to show updated state
      setTimeout(() => {
        analyzeCommitments()
      }, 1000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Fix failed:', err)
    } finally {
      setFixing(false)
    }
  }

  const totalCommitments = analysis.reduce((sum, m) => sum + m.commitments.length, 0)
  const totalNeedsFixes = analysis.reduce((sum, m) => sum + m.needsFixes, 0)

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fix Commitment Option IDs</h1>
        <p className="text-gray-600">
          Fix commitments that use generic "yes"/"no" positions instead of proper market option IDs.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-blue-500" />
            Commitment Analysis & Fixes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={analyzeCommitments} 
              disabled={loading || fixing}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {loading ? 'Analyzing...' : 'Analyze Commitments'}
            </Button>
            
            {analysis.length > 0 && totalNeedsFixes > 0 && (
              <Button 
                onClick={applyFixes}
                disabled={loading || fixing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {fixing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Target className="h-4 w-4" />
                )}
                {fixing ? 'Applying Fixes...' : `Fix ${totalNeedsFixes} Commitments`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Fix Results */}
      {fixResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Fix Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {fixResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Summary */}
      {analysis.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-500" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analysis.length}</div>
                <div className="text-sm text-gray-600">Markets Analyzed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{totalCommitments}</div>
                <div className="text-sm text-gray-600">Total Commitments</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{totalNeedsFixes}</div>
                <div className="text-sm text-gray-600">Need Fixes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {totalCommitments - totalNeedsFixes}
                </div>
                <div className="text-sm text-gray-600">Already Correct</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Analysis Details */}
      {analysis.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Market Analysis</h2>
          
          {analysis.map((market) => (
            <Card key={market.marketId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{market.marketTitle}</span>
                  <div className="flex items-center gap-2">
                    {market.needsFixes > 0 ? (
                      <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded">
                        {market.needsFixes} fixes needed
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded">
                        All correct
                      </span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Market Options:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {market.options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className={`w-3 h-3 rounded-full ${
                          index === 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm">
                          <strong>{option.id}</strong>: {option.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {market.needsFixes > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Commitments Needing Fixes:</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {market.commitments
                        .filter(c => c.currentPosition !== c.suggestedOptionId)
                        .map((commitment) => (
                          <div key={commitment.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-gray-600">
                                {commitment.id.slice(-8)}
                              </span>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                  {commitment.currentPosition}
                                </span>
                                <ArrowRight className="h-3 w-3 inline mx-2" />
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  {commitment.suggestedOptionId}
                                </span>
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-800">
                              {commitment.tokens} tokens
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Market ID: {market.marketId} • {market.commitments.length} total commitments
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Data Message */}
      {!loading && analysis.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No analysis data yet. Click "Analyze Commitments" to check for issues.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}