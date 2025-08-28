import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/database'
import { doc, getDoc, runTransaction, collection, Timestamp, query, where, getDocs } from 'firebase/firestore'

const CommitTokensSchema = z.object({
  predictionId: z.string().min(1, 'Prediction ID is required'),
  tokensToCommit: z.number().min(1, 'Must commit at least 1 token').max(10000, 'Cannot commit more than 10,000 tokens'),
  position: z.string().min(1, 'Option ID is required'), // Changed to accept actual option IDs
  userId: z.string().min(1, 'User ID is required')
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[COMMIT_API] Starting token commitment process')
    
    const body = await request.json()
    console.log('[COMMIT_API] Request body received:', body)
    
    const result = CommitTokensSchema.safeParse(body)
    
    if (!result.success) {
      console.error('[COMMIT_API] Invalid request data:', result.error.errors)
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: result.error.errors,
          errorCode: 'VALIDATION_ERROR'
        },
        { status: 400 }
      )
    }

    const { predictionId, tokensToCommit, position, userId } = result.data
    console.log(`[COMMIT_API] Processing commitment: userId=${userId}, predictionId=${predictionId}, tokens=${tokensToCommit}, position=${position}`)
    
    // Debug: Check if position is "yes" or "no"
    if (position === 'yes' || position === 'no') {
      console.warn(`[COMMIT_API] ⚠️  RECEIVED YES/NO POSITION: ${position}`)
      console.warn(`[COMMIT_API] This suggests the frontend is sending yes/no instead of actual option IDs`)
    }

    // Get market data
    const marketRef = doc(db, 'markets', predictionId)
    const marketSnap = await getDoc(marketRef)
    
    if (!marketSnap.exists()) {
      console.error(`[COMMIT_API] Market not found: predictionId=${predictionId}`)
      return NextResponse.json(
        { error: 'Market not found', errorCode: 'MARKET_NOT_FOUND' },
        { status: 404 }
      )
    }

    const market = marketSnap.data()
    console.log(`[COMMIT_API] Market data:`, { 
      id: predictionId, 
      title: market.title, 
      status: market.status
    })
    
    if (market.status !== 'active') {
      console.warn(`[COMMIT_API] Market not active: predictionId=${predictionId}, status=${market.status}`)
      return NextResponse.json(
        { 
          error: 'Market is not active', 
          status: market.status,
          errorCode: 'MARKET_INACTIVE'
        },
        { status: 400 }
      )
    }

    // Get existing commitments to count unique participants (before transaction)
    const existingCommitmentsQuery = query(
      collection(db, 'prediction_commitments'),
      where('predictionId', '==', predictionId),
      where('status', '==', 'active')
    )
    const existingCommitmentsSnap = await getDocs(existingCommitmentsQuery)
    const existingUserIds = new Set(existingCommitmentsSnap.docs.map(doc => doc.data().userId))
    const isNewParticipant = !existingUserIds.has(userId)
    
    console.log(`[COMMIT_API] Participant analysis:`, {
      userId,
      existingParticipants: existingUserIds.size,
      isNewParticipant,
      existingUserIds: Array.from(existingUserIds)
    })

    // Get or create user balance
    const balanceRef = doc(db, 'user_balances', userId)
    let userBalance
    
    const commitment = await runTransaction(db, async (transaction) => {
      console.log('[COMMIT_API] Starting Firestore transaction')
      // Get user balance
      const balanceSnap = await transaction.get(balanceRef)
      
      let currentBalance
      if (balanceSnap.exists()) {
        currentBalance = balanceSnap.data()
      } else {
        // Create initial balance if doesn't exist
        currentBalance = {
          userId,
          availableTokens: 0, // Start with 0 tokens
          committedTokens: 0,
          totalEarned: 0,
          totalSpent: 0,
          lastUpdated: Timestamp.now(),
          version: 1
        }
      }

      // Validate sufficient balance
      if (currentBalance.availableTokens < tokensToCommit) {
        throw new Error(`Insufficient balance: available=${currentBalance.availableTokens}, required=${tokensToCommit}`)
      }

      // Update user balance
      const updatedBalance = {
        ...currentBalance,
        availableTokens: currentBalance.availableTokens - tokensToCommit,
        committedTokens: currentBalance.committedTokens + tokensToCommit,
        lastUpdated: Timestamp.now(),
        version: currentBalance.version + 1
      }

      transaction.set(balanceRef, updatedBalance)

      // Create commitment record
      const commitmentRef = doc(collection(db, 'prediction_commitments'))
      const commitmentData = {
        userId,
        predictionId,
        tokensCommitted: tokensToCommit,
        position,
        odds: 2.0, // Simple odds for now
        potentialWinning: tokensToCommit * 2,
        status: 'active',
        committedAt: Timestamp.now(),
        metadata: {
          marketStatus: market.status,
          marketTitle: market.title,
          marketEndsAt: Timestamp.fromDate(new Date(market.endDate)),
          oddsSnapshot: {
            yesOdds: 2.0,
            noOdds: 2.0,
            totalYesTokens: 0,
            totalNoTokens: 0,
            totalParticipants: market.participants || 0,
          },
          userBalanceAtCommitment: currentBalance.availableTokens,
          commitmentSource: 'web'
        }
      }

      transaction.set(commitmentRef, commitmentData)

      // Update market statistics
      console.log(`[COMMIT_API] Updating market for option ID: ${position}`)
      console.log(`[COMMIT_API] Market options before update:`, market.options?.map((opt, idx) => ({ 
        index: idx, 
        id: opt.id, 
        name: opt.name || opt.text, 
        tokens: opt.tokens, 
        percentage: opt.percentage 
      })))
      
      // Only increment participants if this is a new user
      const newParticipantCount = isNewParticipant ? (market.participants || 0) + 1 : (market.participants || 0)
      
      const updatedMarket = {
        ...market,
        totalTokens: (market.totalTokens || 0) + tokensToCommit,
        participants: newParticipantCount,
        options: (market.options || []).map((option, index) => {
          // Direct match by option ID (no more guessing!)
          const isTargetOption = option.id === position
          
          console.log(`[COMMIT_API] Checking option ${index}: id="${option.id}", name="${option.name}", position="${position}", isTarget=${isTargetOption}`)
          
          if (isTargetOption) {
            console.log(`[COMMIT_API] ✅ EXACT MATCH: Updating option "${option.name}" (${option.id}) with ${tokensToCommit} tokens`)
            return {
              ...option,
              tokens: (option.tokens || 0) + tokensToCommit,
              totalTokens: (option.totalTokens || 0) + tokensToCommit,
              commitmentCount: (option.commitmentCount || 0) + 1
            }
          }
          return option
        })
      }

      // Recalculate percentages
      const totalMarketTokens = updatedMarket.totalTokens
      if (totalMarketTokens > 0) {
        updatedMarket.options = updatedMarket.options.map(option => ({
          ...option,
          percentage: Math.round(((option.tokens || 0) / totalMarketTokens) * 100)
        }))
      }

      console.log(`[COMMIT_API] Market options after update:`, updatedMarket.options?.map((opt, idx) => ({ 
        index: idx, 
        id: opt.id, 
        name: opt.name || opt.text, 
        tokens: opt.tokens, 
        percentage: opt.percentage 
      })))

      transaction.update(marketRef, updatedMarket)

      console.log(`[COMMIT_API] Transaction completed successfully`)

      return {
        id: commitmentRef.id,
        ...commitmentData,
        updatedBalance
      }
    })

    const duration = Date.now() - startTime
    console.log(`[COMMIT_API] Commitment successful: userId=${userId}, commitmentId=${commitment.id}, duration=${duration}ms`)

    return NextResponse.json({
      success: true,
      commitment: {
        id: commitment.id,
        predictionId: commitment.predictionId,
        tokensCommitted: commitment.tokensCommitted,
        position: commitment.position,
        odds: commitment.odds,
        potentialWinning: commitment.potentialWinning,
        status: commitment.status
      },
      updatedBalance: {
        availableTokens: commitment.updatedBalance.availableTokens,
        committedTokens: commitment.updatedBalance.committedTokens,
        totalBalance: commitment.updatedBalance.availableTokens + commitment.updatedBalance.committedTokens
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[COMMIT_API] Error committing tokens: duration=${duration}ms`, {
      error: error.message,
      stack: error.stack
    })
    
    // Handle specific error types
    if (error.message.includes('Insufficient balance')) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance', 
          message: error.message,
          errorCode: 'INSUFFICIENT_BALANCE'
        },
        { status: 400 }
      )
    }
    
    if (error.message.includes('Market not found')) {
      return NextResponse.json(
        { 
          error: 'Market not found', 
          message: error.message,
          errorCode: 'MARKET_NOT_FOUND'
        },
        { status: 404 }
      )
    }
    
    if (error.message.includes('Market is not active')) {
      return NextResponse.json(
        { 
          error: 'Market is not active', 
          message: error.message,
          errorCode: 'MARKET_INACTIVE'
        },
        { status: 400 }
      )
    }
    
    // Generic error for unexpected issues
    return NextResponse.json(
      { 
        error: 'Failed to commit tokens', 
        message: error.message,
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const predictionId = searchParams.get('predictionId')
    const status = searchParams.get('status') || 'active'

    console.log(`[COMMIT_API_GET] Fetching commitments: userId=${userId}, predictionId=${predictionId}, status=${status}`)

    if (!userId?.trim()) {
      console.warn('[COMMIT_API_GET] Missing userId parameter')
      return NextResponse.json(
        { 
          error: 'User ID is required',
          errorCode: 'MISSING_USER_ID'
        },
        { status: 400 }
      )
    }

    // Build query based on parameters
    let commitmentsQuery
    if (predictionId) {
      commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        where('predictionId', '==', predictionId),
        where('status', '==', status)
      )
    } else {
      commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('userId', '==', userId),
        where('status', '==', status)
      )
    }

    const commitmentsSnap = await getDocs(commitmentsQuery)
    const commitments = commitmentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionCommitment[]

    const duration = Date.now() - startTime
    console.log(`[COMMIT_API_GET] Successfully fetched ${commitments.length} commitments: userId=${userId}, duration=${duration}ms`)

    return NextResponse.json({ 
      commitments,
      count: commitments.length,
      filters: {
        userId,
        predictionId,
        status
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[COMMIT_API_GET] Error fetching commitments: duration=${duration}ms`, {
      error: error.message,
      stack: error.stack,
      userId: new URL(request.url).searchParams.get('userId')
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch commitments',
        message: 'An error occurred while retrieving commitment data',
        errorCode: 'FETCH_ERROR'
      },
      { status: 500 }
    )
  }
}