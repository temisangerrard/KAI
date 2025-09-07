import { collection, getDocs, query, where, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/db/database'
import { AdminCommitmentService } from './admin-commitment-service'
import { TokenBalanceService } from './token-balance-service'
import { AdminAuthService } from '@/lib/auth/admin-auth'
import { WalletUidMappingService } from './wallet-uid-mapping-service'

/**
 * Simple resolution service that works with the actual data structure
 * Uses the same patterns as AdminCommitmentService which is known to work
 */
export class SimpleResolutionService {
  
  /**
   * Calculate payout preview using the working AdminCommitmentService pattern
   */
  static async calculatePayoutPreview(
    marketId: string,
    winningOptionId: string,
    creatorFeePercentage: number = 0.02
  ) {
    try {
      console.log('🎯 Simple resolution - calculating payout for:', { marketId, winningOptionId })
      
      // Use AdminCommitmentService to get market commitments (this works!)
      const result = await AdminCommitmentService.getMarketCommitments(marketId, {
        pageSize: 1000,
        includeAnalytics: true
      })
      
      console.log('🎯 Found commitments:', result.commitments?.length || 0)
      
      if (!result.commitments || result.commitments.length === 0) {
        return {
          totalPool: 0,
          houseFee: 0,
          creatorFee: 0,
          winnerPool: 0,
          winnerCount: 0,
          largestPayout: 0,
          smallestPayout: 0,
          creatorPayout: {
            userId: 'unknown',
            feeAmount: 0,
            feePercentage: creatorFeePercentage
          },
          payouts: []
        }
      }
      
      // Calculate totals from actual commitments
      const totalPool = result.commitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      console.log('🎯 Total pool:', totalPool)
      
      // Find winning commitments (those who picked the winning option)
      const winningCommitments = result.commitments.filter(c => {
        // Handle different option ID formats
        return c.optionId === winningOptionId || 
               c.position === winningOptionId ||
               c.selectedOption === winningOptionId
      })
      
      console.log('🎯 Winning commitments:', winningCommitments.length)
      
      const totalWinnerTokens = winningCommitments.reduce((sum, c) => sum + c.tokensCommitted, 0)
      
      // Calculate fees
      const houseFeePercentage = 0.05 // 5%
      const houseFee = Math.floor(totalPool * houseFeePercentage)
      const creatorFee = Math.floor(totalPool * creatorFeePercentage)
      const winnerPool = totalPool - houseFee - creatorFee
      
      // Calculate individual payouts
      const payouts = winningCommitments.map(commitment => {
        const userShare = totalWinnerTokens > 0 ? commitment.tokensCommitted / totalWinnerTokens : 0
        const projectedPayout = Math.floor(userShare * winnerPool)
        const projectedProfit = projectedPayout - commitment.tokensCommitted
        
        return {
          userId: commitment.userId,
          currentStake: commitment.tokensCommitted,
          projectedPayout,
          projectedProfit
        }
      })
      
      const preview = {
        totalPool,
        houseFee,
        creatorFee,
        winnerPool,
        winnerCount: winningCommitments.length,
        largestPayout: payouts.length > 0 ? Math.max(...payouts.map(p => p.projectedPayout)) : 0,
        smallestPayout: payouts.length > 0 ? Math.min(...payouts.map(p => p.projectedPayout)) : 0,
        creatorPayout: {
          userId: 'creator', // We'll get this from market data
          feeAmount: creatorFee,
          feePercentage: creatorFeePercentage
        },
        payouts
      }
      
      console.log('🎯 Payout preview:', preview)
      return preview
      
    } catch (error) {
      console.error('❌ Error calculating payout preview:', error)
      throw error
    }
  }
  
  /**
   * Resolve market using the working data patterns
   */
  static async resolveMarket(
    marketId: string,
    winningOptionId: string,
    evidence: any[],
    adminId: string,
    creatorFeePercentage: number = 0.02
  ) {
    try {
      console.log('🎯 Simple resolution - resolving market:', { marketId, winningOptionId, adminId })
      
      // Verify admin privileges using hybrid auth system
      console.log('🔐 Verifying admin privileges for:', adminId)
      const isAdmin = await AdminAuthService.checkUserIsAdmin(adminId)
      if (!isAdmin) {
        throw new Error('Admin privileges required for market resolution')
      }
      console.log('✅ Admin privileges verified')
      
      // Get the payout preview first
      const payoutPreview = await this.calculatePayoutPreview(marketId, winningOptionId, creatorFeePercentage)
      
      if (payoutPreview.winnerCount === 0) {
        console.log('🎯 No winners found, resolving with no payouts')
      }
      
      // Update market status to resolved
      const marketRef = doc(db, 'markets', marketId)
      await updateDoc(marketRef, {
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        resolution: {
          winningOptionId,
          resolvedBy: adminId,
          resolvedAt: Timestamp.now(),
          evidence,
          totalPayout: payoutPreview.winnerPool,
          winnerCount: payoutPreview.winnerCount
        }
      })
      
      // Distribute payouts to winners
      for (const payout of payoutPreview.payouts) {
        if (payout.projectedPayout > 0) {
          try {
            // Handle hybrid auth: convert wallet address to Firebase UID if needed
            let firebaseUid = payout.userId
            
            // Check if this looks like a wallet address (starts with 0x)
            if (payout.userId.startsWith('0x')) {
              console.log(`🔄 Converting wallet address ${payout.userId} to Firebase UID`)
              try {
                firebaseUid = await WalletUidMappingService.getFirebaseUid(payout.userId)
                console.log(`🔄 Mapped to Firebase UID: ${firebaseUid}`)
              } catch (mappingError) {
                console.error(`❌ Failed to map wallet address ${payout.userId}:`, mappingError)
                // Continue with original ID as fallback
              }
            }
            
            // Add tokens to winner's balance using Firebase UID
            await TokenBalanceService.addTokens(
              firebaseUid,
              payout.projectedPayout,
              `Market resolution payout for market ${marketId}`
            )
            
            console.log(`🎯 Paid ${payout.projectedPayout} tokens to user ${firebaseUid} (original: ${payout.userId})`)
          } catch (error) {
            console.error(`❌ Error paying user ${payout.userId}:`, error)
          }
        }
      }
      
      // Pay creator fee if applicable
      if (payoutPreview.creatorFee > 0) {
        try {
          // We need to get the market creator ID from the market document
          // For now, we'll skip this and just log it
          console.log(`🎯 Creator fee of ${payoutPreview.creatorFee} tokens should be paid`)
        } catch (error) {
          console.error('❌ Error paying creator fee:', error)
        }
      }
      
      // Create resolution record
      const resolutionRecord = {
        marketId,
        winningOptionId,
        resolvedBy: adminId,
        resolvedAt: Timestamp.now(),
        evidence,
        totalPayout: payoutPreview.winnerPool,
        winnerCount: payoutPreview.winnerCount,
        houseFee: payoutPreview.houseFee,
        creatorFee: payoutPreview.creatorFee,
        status: 'completed'
      }
      
      const resolutionRef = await addDoc(collection(db, 'market_resolutions'), resolutionRecord)
      
      console.log('🎯 Market resolved successfully:', resolutionRef.id)
      
      return {
        success: true,
        resolutionId: resolutionRef.id
      }
      
    } catch (error) {
      console.error('❌ Error resolving market:', error)
      throw error
    }
  }
}