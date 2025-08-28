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
  Target,
  Search
} from "lucide-react"

interface CommitmentAnalysis {
  marketId: string
  marketTitle: string
  marketOptions: Array<{
    id: string
    name: string
    index: number
  }>
  commitments: Array<{
    id: string
    currentPosition: string
    tokens: number
    userId: string
    shouldMapTo: string
    confidence: 'high' | 'medium' | 'low'
    reason: string
  }>
  totalTokens: number
  needsFixes: number
}

interface FixResult {
  success: boolean
  fixed: number
  errors: string[]
}

export default function FixCommitmentStructurePage() {
  const [analysis, setAnalysis] = useState<CommitmentAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)

  const analyzeCommitmentStructure = async () => {
    setLoading(true)
    setError(null)
    setAnalysis([])
    
    try {
      console.log('🔍 Analyzing commitment structure...')
      
      // Get all markets
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      const markets = marketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Get all commitments
      const commitmentsSnapshot = await getDocs(collection(db, 'prediction_commitments'))
      const commitments = commitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log(`Found ${markets.length} markets, ${commitments.length} commitments`)
      
      const analysisResults: CommitmentAnalysis[] = []
      
      for (const market of markets) {
        const marketTitle = market.title || 'Unnamed Market'
        console.log(`\nAnalyzing market: "${marketTitle}"`)
        
        // Extract market options with their proper structure
        const marketOptions = (market.options || []).map((option: any, index: number) => ({
          id: option.id || `option_${index}`,
          name: option.name || option.text || `Option ${index + 1}`,
          index: index
        }))
        
        console.log(`  Market options:`)
        marketOptions.forEach(opt => {
          console.log(`    ${opt.index + 1}. "${opt.name}" (ID: ${opt.id})`)
        })
        
        // Get commitments for this market
        const marketCommitments = commitments.filter(c => c.predictionId === market.id)
        console.log(`  Found ${marketCommitments.length} commitments`)
        
        const analyzedCommitments = marketCommitments.map((commitment: any) => {
          const currentPosition = commitment.position
          const tokens = commitment.tokensCommitted || 0
          
          console.log(`    Commitment: "${currentPosition}" | ${tokens} tokens`)
          
          // Determine what this commitment should map to
          let shouldMapTo = ''
          let confidence: 'high' | 'medium' | 'low' = 'low'
          let reason = ''
          
          // Strategy 1: Direct match with option ID
          const directMatch = marketOptions.find(opt => opt.id === currentPosition)
          if (directMatch) {
            shouldMapTo = directMatch.id
            confidence = 'high'
            reason = `Direct match with option ID "${directMatch.id}"`
          }
          
          // Strategy 2: Pattern matching for generated IDs
          if (!shouldMapTo && currentPosition.includes('_')) {
            // Extract the ending number from positions like "option_market_1756222446235_jzmg4ef_1"
            const match = currentPosition.match(/_(\d+)$/)
            if (match) {
              const endingNumber = parseInt(match[1])
              const optionIndex = endingNumber - 1 // Convert 1-based to 0-based
              
              if (optionIndex >= 0 && optionIndex < marketOptions.length) {
                shouldMapTo = marketOptions[optionIndex].id
                confidence = 'high'
                reason = `Pattern match: ending "_${endingNumber}" maps to option ${optionIndex + 1} (${marketOptions[optionIndex].name})`
              }
            }
          }
          
          // Strategy 3: For simple option_X patterns
          if (!shouldMapTo && currentPosition.startsWith('option_')) {
            const match = currentPosition.match(/option_(\d+)$/)
            if (match) {
              const optionNumber = parseInt(match[1])
              const optionIndex = optionNumber - 1 // Convert 1-based to 0-based
              
              if (optionIndex >= 0 && optionIndex < marketOptions.length) {
                shouldMapTo = marketOptions[optionIndex].id
                confidence = 'high'
                reason = `Simple pattern: "option_${optionNumber}" maps to option ${optionIndex + 1} (${marketOptions[optionIndex].name})`
              }
            }
          }
          
          // Strategy 4: Binary market fallback (yes/no)
          if (!shouldMapTo && marketOptions.length === 2) {
            if (currentPosition.toLowerCase().includes('yes') || currentPosition === '1') {
              shouldMapTo = marketOptions[0].id
              confidence = 'medium'
              reason = `Binary market: "${currentPosition}" assumed to be first option (${marketOptions[0].name})`
            } else if (currentPosition.toLowerCase().includes('no') || currentPosition === '2') {
              shouldMapTo = marketOptions[1].id
              confidence = 'medium'
              reason = `Binary market: "${currentPosition}" assumed to be second option (${marketOptions[1].name})`
            }
          }
          
          if (!shouldMapTo) {
            reason = `No clear mapping found for position "${currentPosition}"`
          }
          
          console.log(`      → Should map to: "${shouldMapTo}" (${confidence} confidence)`)
          console.log(`      → Reason: ${reason}`)
          
          return {
            id: commitment.id,
            currentPosition,
            tokens,
            userId: commitment.userId,
            shouldMapTo,
            confidence,
            reason
          }
        })
        
        const totalTokens = analyzedCommitments.reduce((sum, c) => sum + c.tokens, 0)
        const needsFixes = analyzedCommitments.filter(c => c.currentPosition !== c.shouldMapTo && c.shouldMapTo).length
        
        analysisResults.push({
          marketId: market.id,
          marketTitle,
          marketOptions,
          commitments: analyzedCommitments,
          totalTokens,
          needsFixes
        })
        
        console.log(`  Analysis complete: ${needsFixes} commitments need fixing`)
      }
      
      setAnalysis(analysisResults)
      console.log('✅ Analysis complete')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyStructureFixes = async () => {
    setFixing(true)
    setFixResult(null)
    
    try {
      let totalFixed = 0
      const errors: string[] = []
      
      for (const marketAnalysis of analysis) {
        const commitmentsToFix = marketAnalysis.commitments.filter(c => 
          c.currentPosition !== c.shouldMapTo && 
          c.shouldMapTo && 
          c.confidence !== 'low'
        )
        
        if (commitmentsToFix.length === 0) continue
        
        console.log(`Fixing ${commitmentsToFix.length} commitments for market "${marketAnalysis.marketTitle}"`)
        
        const batch = writeBatch(db)
        
        for (const commitment of commitmentsToFix) {
          try {
            const commitmentRef = doc(db, 'prediction_commitments', commitment.id)
            batch.update(commitmentRef, {
              position: commitment.shouldMapTo,
              // Keep track of the fix
              originalPosition: commitment.currentPosition,
              fixedAt: new Date(),
              fixReason: commitment.reason
            })
            
            console.log(`  Fixed: ${commitment.id} | "${commitment.currentPosition}" → "${commitment.shouldMapTo}"`)
            totalFixed++
            
          } catch (error) {
            const errorMsg = `Failed to fix commitment ${commitment.id}: ${error}`
            errors.push(errorMsg)
            console.error(errorMsg)
          }
        }
        
        try {
          await batch.commit()
          console.log(`✅ Batch committed for market "${marketAnalysis.marketTitle}"`)
        } catch (error) {
          const errorMsg = `Failed to commit batch for market ${marketAnalysis.marketTitle}: ${error}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }
      
      setFixResult({
        success: errors.length === 0,
        fixed: totalFixed,
        errors
      })
      
      console.log(`🎉 Structure fix complete: ${totalFixed} commitments fixed`)
      
      // Refresh analysis to show updated state
      setTimeout(() => {
        analyzeCommitmentStructure()
      }, 1000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Structure fix failed:', err)
    } finally {
      setFixing(false)
    }
  }

  const totalCommitments = analysis.reduce((sum, m) => sum + m.commitments.length, 0)
  const totalNeedsFixes = analysis.reduce((sum, m) => sum + m.needsFixes, 0)
  const highConfidenceFixes = analysis.reduce((sum, m) => 
    sum + m.commitments.filter(c => c.confidence === 'high' && c.currentPosition !== c.shouldMapTo).length, 0
  )

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fix Commitment Structure</h1>
        <p className="text-gray-600">
          Phase 1: Analyze and fix the core commitment-to-option mapping structure.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-500" />
            Structure Analysis & Fixes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={analyzeCommitmentStructure} 
              disabled={loading || fixing}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {loading ? 'Analyzing...' : 'Analyze Structure'}
            </Button>
            
            {analysis.length > 0 && totalNeedsFixes > 0 && (
              <Button 
                onClick={applyStructureFixes}
                disabled={loading || fixing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {fixing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                {fixing ? 'Applying Fixes...' : `Fix ${highConfidenceFixes} High-Confidence Issues`}
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
      {fixResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              {fixResult.success ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              )}
              Structure Fix Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-lg font-semibold text-green-600">
                ✅ {fixResult.fixed} commitments fixed successfully
              </div>
            </div>
            
            {fixResult.errors.length > 0 && (
              <div>
                <div className="text-sm font-medium text-red-600 mb-2">Errors:</div>
                <div className="bg-red-50 p-3 rounded-lg">
                  {fixResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700">{error}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis Summary */}
      {analysis.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-500" />
              Structure Analysis Summary
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
                <div className="text-sm text-gray-600">Need Structure Fixes</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{highConfidenceFixes}</div>
                <div className="text-sm text-gray-600">High Confidence Fixes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      {analysis.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Structure Analysis</h2>
          
          {analysis.map((marketAnalysis) => (
            <Card key={marketAnalysis.marketId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{marketAnalysis.marketTitle}</span>
                  <div className="flex items-center gap-2">
                    {marketAnalysis.needsFixes > 0 ? (
                      <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded">
                        {marketAnalysis.needsFixes} need fixes
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded">
                        Structure correct
                      </span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Market Options:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {marketAnalysis.marketOptions.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <div className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                          {index + 1}
                        </div>
                        <span className="text-sm">
                          <strong>{option.id}</strong>: {option.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {marketAnalysis.needsFixes > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Commitments Needing Structure Fixes:</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {marketAnalysis.commitments
                        .filter(c => c.currentPosition !== c.shouldMapTo && c.shouldMapTo)
                        .map((commitment) => (
                          <div key={commitment.id} className={`p-3 rounded-lg border ${
                            commitment.confidence === 'high' ? 'bg-green-50 border-green-200' :
                            commitment.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-mono text-gray-600">
                                {commitment.id.slice(-8)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                commitment.confidence === 'high' ? 'bg-green-100 text-green-800' :
                                commitment.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {commitment.confidence} confidence
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-mono">
                                {commitment.currentPosition}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-mono">
                                {commitment.shouldMapTo}
                              </span>
                              <span className="font-medium text-gray-800">
                                {commitment.tokens} tokens
                              </span>
                            </div>
                            <div className="text-xs text-gray-600">
                              {commitment.reason}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Market ID: {marketAnalysis.marketId} • {marketAnalysis.totalTokens} total tokens
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}