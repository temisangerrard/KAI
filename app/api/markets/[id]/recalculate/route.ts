import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/database'
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const marketId = params.id
    console.log(`[RECALCULATE] Starting recalculation for market: ${marketId}`)

    // Get market data
    const marketRef = doc(db, 'markets', marketId)
    const marketSnap = await getDoc(marketRef)
    
    if (!marketSnap.exists()) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      )
    }

    const market = marketSnap.data()
    
    // Get all commitments for this market
    const commitmentsQuery = query(
      collection(db, 'prediction_commitments'),
      where('predictionId', '==', marketId),
      where('status', '==', 'active')
    )
    
    const commitmentsSnap = await getDocs(commitmentsQuery)
    const commitments = commitmentsSnap.docs.map(doc => doc.data())
    
    console.log(`[RECALCULATE] Found ${commitments.length} commitments`)
    
    // Calculate totals by position
    const yesTokens = commitments
      .filter(c => c.position === 'yes')
      .reduce((sum, c) => sum + (c.tokensCommitted || 0), 0)
    
    const noTokens = commitments
      .filter(c => c.position === 'no')
      .reduce((sum, c) => sum + (c.tokensCommitted || 0), 0)
    
    // Count commitments per position (more accurate than participant counts)
    const yesCommitments = commitments.filter(c => c.position === 'yes').length
    const noCommitments = commitments.filter(c => c.position === 'no').length
    
    // Total unique participants across the entire market
    const totalTokens = yesTokens + noTokens
    const totalParticipants = new Set(commitments.map(c => c.userId)).size
    
    console.log(`[RECALCULATE] Calculated totals:`, {
      yesTokens,
      noTokens,
      totalTokens,
      yesCommitments,
      noCommitments,
      totalParticipants,
      uniqueUsers: Array.from(new Set(commitments.map(c => c.userId)))
    })
    
    // Update market with recalculated data
    const updatedOptions = (market.options || []).map((option, index) => {
      if (index === 0) { // Yes option
        return {
          ...option,
          tokens: yesTokens,
          totalTokens: yesTokens,
          commitmentCount: yesCommitments,
          percentage: totalTokens > 0 ? Math.round((yesTokens / totalTokens) * 100) : 0
        }
      } else if (index === 1) { // No option
        return {
          ...option,
          tokens: noTokens,
          totalTokens: noTokens,
          commitmentCount: noCommitments,
          percentage: totalTokens > 0 ? Math.round((noTokens / totalTokens) * 100) : 0
        }
      }
      return option
    })
    
    const updatedMarket = {
      ...market,
      totalTokens,
      participants: totalParticipants,
      options: updatedOptions
    }
    
    await updateDoc(marketRef, updatedMarket)
    
    console.log(`[RECALCULATE] Market updated successfully`)
    
    return NextResponse.json({
      success: true,
      recalculated: {
        totalTokens,
        totalParticipants,
        options: updatedOptions.map(opt => ({
          name: opt.name,
          tokens: opt.tokens,
          percentage: opt.percentage,
          commitmentCount: opt.commitmentCount
        }))
      }
    })
    
  } catch (error) {
    console.error('[RECALCULATE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate market data' },
      { status: 500 }
    )
  }
}