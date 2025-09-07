/**
 * ResolutionService Usage Examples
 * 
 * This file demonstrates how to use the ResolutionService for market resolution
 * with the new house + creator fee structure.
 */

import { ResolutionService } from '../resolution-service'
import { Evidence } from '@/lib/types/database'
import { Timestamp } from 'firebase/firestore'

/**
 * Example 1: Get markets that need resolution
 */
export async function getPendingMarketsExample() {
  try {
    const pendingMarkets = await ResolutionService.getPendingResolutionMarkets()
    
    console.log(`Found ${pendingMarkets.length} markets needing resolution:`)
    pendingMarkets.forEach(market => {
      console.log(`- ${market.title} (ended: ${market.endsAt})`)
    })
    
    return pendingMarkets
  } catch (error) {
    console.error('Error getting pending markets:', error)
    throw error
  }
}

/**
 * Example 2: Calculate payout preview before resolution
 */
export async function calculatePayoutExample() {
  try {
    const marketId = 'market-123'
    const winningOptionId = 'yes'
    const creatorFeePercentage = 0.02 // 2% creator fee
    
    const payoutPreview = await ResolutionService.calculatePayoutPreview(
      marketId,
      winningOptionId,
      creatorFeePercentage
    )
    
    console.log('Payout Preview:')
    console.log(`Total Pool: ${payoutPreview.totalPool} tokens`)
    console.log(`House Fee (5%): ${payoutPreview.houseFee} tokens`)
    console.log(`Creator Fee (${creatorFeePercentage * 100}%): ${payoutPreview.creatorFee} tokens`)
    console.log(`Winner Pool: ${payoutPreview.winnerPool} tokens`)
    console.log(`Number of Winners: ${payoutPreview.winnerCount}`)
    
    console.log('\nIndividual Payouts:')
    payoutPreview.payouts.forEach((payout, index) => {
      console.log(`Winner ${index + 1}:`)
      console.log(`  - Staked: ${payout.currentStake} tokens`)
      console.log(`  - Payout: ${payout.projectedPayout} tokens`)
      console.log(`  - Profit: ${payout.projectedProfit} tokens`)
    })
    
    console.log(`\nCreator Payout: ${payoutPreview.creatorPayout.feeAmount} tokens`)
    
    return payoutPreview
  } catch (error) {
    console.error('Error calculating payout preview:', error)
    throw error
  }
}

/**
 * Example 3: Validate evidence before resolution
 */
export function validateEvidenceExample() {
  // Good evidence example
  const goodEvidence: Evidence[] = [
    {
      id: '1',
      type: 'url',
      content: 'https://pitchfork.com/news/drake-announces-new-album',
      description: 'Official announcement on Pitchfork music news',
      uploadedAt: Timestamp.now()
    },
    {
      id: '2',
      type: 'description',
      content: 'Drake officially announced his new album "For All The Dogs" on October 6, 2024, through his Instagram and official website. The album was released the same day, confirming the prediction outcome.',
      uploadedAt: Timestamp.now()
    }
  ]
  
  const validation = ResolutionService.validateEvidence(goodEvidence)
  
  if (validation.isValid) {
    console.log('✅ Evidence is valid and ready for resolution')
  } else {
    console.log('❌ Evidence validation failed:')
    validation.errors.forEach(error => {
      console.log(`  - ${error.message}`)
    })
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️ Warnings:')
    validation.warnings.forEach(warning => {
      console.log(`  - ${warning.message}`)
    })
  }
  
  return validation
}

/**
 * Example 4: Complete market resolution
 */
export async function resolveMarketExample() {
  try {
    const marketId = 'market-123'
    const winningOptionId = 'yes'
    const adminId = 'admin-456'
    const creatorFeePercentage = 0.025 // 2.5% creator fee
    
    // Prepare evidence
    const evidence: Evidence[] = [
      {
        id: '1',
        type: 'url',
        content: 'https://billboard.com/music/music-news/drake-new-album-release-confirmed',
        description: 'Billboard confirmation of album release',
        uploadedAt: Timestamp.now()
      },
      {
        id: '2',
        type: 'description',
        content: 'Drake released his highly anticipated album "For All The Dogs" on October 6, 2024. The album debuted at #1 on the Billboard 200, confirming the prediction that he would release an album in 2024.',
        uploadedAt: Timestamp.now()
      }
    ]
    
    // First, validate the evidence
    const evidenceValidation = ResolutionService.validateEvidence(evidence)
    if (!evidenceValidation.isValid) {
      throw new Error(`Invalid evidence: ${evidenceValidation.errors.map(e => e.message).join(', ')}`)
    }
    
    // Calculate payout preview for confirmation
    const payoutPreview = await ResolutionService.calculatePayoutPreview(
      marketId,
      winningOptionId,
      creatorFeePercentage
    )
    
    console.log('About to resolve market with the following distribution:')
    console.log(`- ${payoutPreview.winnerCount} winners will receive ${payoutPreview.winnerPool} tokens total`)
    console.log(`- Creator will receive ${payoutPreview.creatorFee} tokens (${creatorFeePercentage * 100}% fee)`)
    console.log(`- House will receive ${payoutPreview.houseFee} tokens (5% fee)`)
    
    // Resolve the market
    const result = await ResolutionService.resolveMarket(
      marketId,
      winningOptionId,
      evidence,
      adminId,
      creatorFeePercentage
    )
    
    if (result.success) {
      console.log(`✅ Market resolved successfully!`)
      console.log(`Resolution ID: ${result.resolutionId}`)
      console.log('All payouts have been distributed automatically.')
    }
    
    return result
  } catch (error) {
    console.error('Error resolving market:', error)
    throw error
  }
}

/**
 * Example 5: Get user's resolution payouts
 */
export async function getUserPayoutsExample() {
  try {
    const userId = 'user-123'
    
    const payouts = await ResolutionService.getUserResolutionPayouts(userId)
    
    console.log(`User ${userId} Payout History:`)
    
    if (payouts.winnerPayouts.length > 0) {
      console.log('\n🏆 Winner Payouts:')
      payouts.winnerPayouts.forEach((payout, index) => {
        console.log(`${index + 1}. Resolution ${payout.resolutionId}`)
        console.log(`   Staked: ${payout.tokensStaked} tokens`)
        console.log(`   Payout: ${payout.payoutAmount} tokens`)
        console.log(`   Profit: ${payout.profit} tokens`)
        console.log(`   Date: ${payout.processedAt}`)
      })
    }
    
    if (payouts.creatorPayouts.length > 0) {
      console.log('\n💰 Creator Fee Payouts:')
      payouts.creatorPayouts.forEach((payout, index) => {
        console.log(`${index + 1}. Resolution ${payout.resolutionId}`)
        console.log(`   Fee: ${payout.feeAmount} tokens (${payout.feePercentage}%)`)
        console.log(`   Date: ${payout.processedAt}`)
      })
    }
    
    if (payouts.winnerPayouts.length === 0 && payouts.creatorPayouts.length === 0) {
      console.log('No resolution payouts found for this user.')
    }
    
    return payouts
  } catch (error) {
    console.error('Error getting user payouts:', error)
    throw error
  }
}

/**
 * Example 6: Fee structure scenarios
 */
export function feeStructureExamples() {
  console.log('KAI Market Resolution Fee Structure:')
  console.log('=====================================')
  
  const scenarios = [
    { totalPool: 1000, creatorFee: 0.01 }, // 1% creator fee
    { totalPool: 1000, creatorFee: 0.02 }, // 2% creator fee  
    { totalPool: 1000, creatorFee: 0.05 }, // 5% creator fee (max)
    { totalPool: 500, creatorFee: 0.03 },  // Smaller market
    { totalPool: 2000, creatorFee: 0.025 } // Larger market
  ]
  
  scenarios.forEach((scenario, index) => {
    const houseFee = Math.floor(scenario.totalPool * 0.05) // Always 5%
    const creatorFee = Math.floor(scenario.totalPool * scenario.creatorFee)
    const winnerPool = scenario.totalPool - houseFee - creatorFee
    const totalFeePercentage = ((houseFee + creatorFee) / scenario.totalPool * 100).toFixed(1)
    
    console.log(`\nScenario ${index + 1}: ${scenario.totalPool} token market, ${scenario.creatorFee * 100}% creator fee`)
    console.log(`├─ House Fee (5%): ${houseFee} tokens`)
    console.log(`├─ Creator Fee (${scenario.creatorFee * 100}%): ${creatorFee} tokens`)
    console.log(`├─ Winner Pool: ${winnerPool} tokens (${(winnerPool / scenario.totalPool * 100).toFixed(1)}%)`)
    console.log(`└─ Total Fees: ${totalFeePercentage}%`)
  })
  
  console.log('\nKey Points:')
  console.log('• House fee is always 5% of total pool')
  console.log('• Creator fee is configurable from 1-5% per market')
  console.log('• Winners split the remaining 90-94% proportionally')
  console.log('• All fees are deducted before winner distribution')
}

/**
 * Example usage of all functions
 */
export async function runAllExamples() {
  console.log('🎯 KAI Resolution Service Examples')
  console.log('==================================\n')
  
  try {
    // Example 1: Fee structure overview
    feeStructureExamples()
    
    // Example 2: Evidence validation
    console.log('\n📋 Evidence Validation Example:')
    validateEvidenceExample()
    
    // Example 3: Get pending markets (would work with real data)
    console.log('\n⏰ Pending Markets Example:')
    console.log('(This would fetch real pending markets from database)')
    
    // Example 4: Payout calculation (would work with real data)
    console.log('\n💰 Payout Calculation Example:')
    console.log('(This would calculate real payouts from market data)')
    
    // Example 5: Market resolution (would work with real data)
    console.log('\n✅ Market Resolution Example:')
    console.log('(This would perform actual market resolution)')
    
    console.log('\n🎉 All examples completed successfully!')
    
  } catch (error) {
    console.error('Error running examples:', error)
  }
}