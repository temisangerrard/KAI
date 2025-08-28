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
  Target
} from "lucide-react"

interface NoCommitmentFix {
  commitmentId: string
  marketId: string
  marketTitle: string
  currentPosition: string
  correctOptionId: string
  correctOptionName: string
  tokens: number
  userId: string
}

export default function FixNoCommitmentsPage() {
  const [fixes, setFixes] = useState<NoCommitmentFix[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<{ fixed: number; errors: string[] } | null>(null)

  const analyzeNoCommitments = async () => {
    setLoading(true)
    setError(null)
    setFixes([])
    
    try {
      console.log('🔍 Analyzing "no" commitments...')
      
      // Get all markets
      const marketsSnapshot = await getDocs(collection(db, 'markets'))
      const markets = marketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Get all commitments with position "no"
      const noCommitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('position', '==', 'no')
      )
      
      const noCommitmentsSnapshot = await getDocs(noCommitmentsQuery)
      const noCommitments = noCommitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log(`Found ${noCommitments.length} commitments with position "no"`)
      
      const fixesList: NoCommitmentFix[] = []
      
      for (const commitment of noCommitments) {
        const market = markets.find(m => m.id === commitment.predictionId)
        
        if (!market) {
          console.warn(`Market not found for commitment ${commitment.id}`)
          continue
        }
        
        console.log(`\nAnalyzing commitment for market: "${market.title}"`)
        console.log(`  Commitment ID: ${commitment.id}`)
        console.log(`  Current position: "${commitment.position}"`)
        console.log(`  Tokens: ${commitment.tokensCommitted}`)
        
        // For Love Island market, "no" should map to "They'll stay together" (first option)
        // This is based on your observation that "no" votes are actually for staying together
        let correctOptionId = ''
        let correctOptionName = ''
        
        if (market.title === 'Love Island') {
          // For Love Island, "no" means "They'll stay together" (first option)
          const firstOption = market.options?.[0]
          if (firstOption) {
            correctOptionId = firstOption.id
            correctOptionName = firstOption.name || firstOption.text || 'First Option'
          }
        } else {
          // For other markets, "no" typically maps to the second option
          const secondOption = market.options?.[1]
          if (secondOption) {
            correctOptionId = secondOption.id
            correctOptionName = secondOption.name || secondOption.text || 'Second Option'
          }
        }
        
        if (correctOptionId) {
          fixesList.push({
            commitmentId: commitment.id,
            marketId: market.id,
            marketTitle: market.title || 'Unnamed Market',
            currentPosition: commitment.position,
            correctOptionId,
            correctOptionName,
            tokens: commitment.tokensCommitted || 0,
            userId: commitment.userId
          })
          
          console.log(`  ✅ Will fix: "no" → "${correctOptionName}" (${correctOptionId})`)
        } else {
          console.warn(`  ❌ No suitable option found for market "${market.title}"`)
        }
      }
      
      setFixes(fixesList)
      console.log(`✅ Analysis complete: ${fixesList.length} commitments need fixing`)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Analysis failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const applyNoCommitmentFixes = async () => {
    setFixing(true)
    setFixResult(null)
    
    try {
      let totalFixed = 0
      const errors: string[] = []
      
      console.log(`Fixing ${fixes.length} "no" commitments...`)
      
      const batch = writeBatch(db)
      
      for (const fix of fixes) {
        try {
          const commitmentRef = doc(db, 'prediction_commitments', fix.commitmentId)
          batch.update(commitmentRef, {
            position: fix.correctOptionId,
            // Keep track of the fix
            originalPosition: fix.currentPosition,
            fixedAt: new Date(),
            fixReason: `Fixed "no" position to correct option ID for ${fix.marketTitle}`
          })
          
          console.log(`Fixed: ${fix.commitmentId} | "${fix.currentPosition}" → "${fix.correctOptionId}" (${fix.correctOptionName})`)
          totalFixed++
          
        } catch (error) {
          const errorMsg = `Failed to fix commitment ${fix.commitmentId}: ${error}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }
      
      try {
        await batch.commit()
        console.log(`✅ Batch committed: ${totalFixed} commitments fixed`)
      } catch (error) {
        const errorMsg = `Failed to commit batch: ${error}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
      
      setFixResult({
        fixed: totalFixed,
        errors
      })
      
      console.log(`🎉 Fix complete: ${totalFixed} "no" commitments fixed`)
      
      // Refresh analysis to show updated state
      setTimeout(() => {
        analyzeNoCommitments()
      }, 1000)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('💥 Fix failed:', err)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fix "No" Commitments</h1>
        <p className="text-gray-600">
          Fix commitments with position "no" to use proper option IDs based on market context.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-500" />
            "No" Position Fixes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={analyzeNoCommitments} 
              disabled={loading || fixing}
              className="flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              {loading ? 'Analyzing...' : 'Analyze "No" Commitments'}
            </Button>
            
            {fixes.length > 0 && (
              <Button 
                onClick={applyNoCommitmentFixes}
                disabled={loading || fixing}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {fixing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                {fixing ? 'Applying Fixes...' : `Fix ${fixes.length} "No" Commitments`}
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
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Fix Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-lg font-semibold text-green-600">
                ✅ {fixResult.fixed} "no" commitments fixed successfully
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

      {/* Analysis Results */}
      {fixes.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Commitments to Fix ({fixes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {fixes.map((fix) => (
                <div key={fix.commitmentId} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{fix.marketTitle}</span>
                    <span className="text-sm font-medium text-gray-600">{fix.tokens} tokens</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-mono">
                      {fix.currentPosition}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      {fix.correctOptionName}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Commitment ID: {fix.commitmentId} | User: {fix.userId}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {fixes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fix Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">What this will do:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Fix {fixes.length} commitments with position "no"</li>
                <li>• For Love Island: "no" → "They'll stay together" (as you observed)</li>
                <li>• For other markets: "no" → Second option (standard mapping)</li>
                <li>• Keep original position in "originalPosition" field for audit</li>
                <li>• Add fix timestamp and reason for tracking</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}