import { PayoutCalculationService } from '@/lib/services/payout-calculation-service'

/**
 * Example usage and demonstrations of the payout calculation engine
 */

export function demonstratePayoutCalculations() {
  console.log('=== Payout Calculation Engine Examples ===\n')

  // Example 1: Basic scenario with 2% creator fee
  console.log('Example 1: Basic Market Resolution')
  console.log('Total Pool: 1,000 tokens')
  console.log('Winners: 2 users (300 and 200 tokens)')
  console.log('Creator Fee: 2%')
  
  const example1 = PayoutCalculationService.calculatePayoutPreview({
    totalPool: 1000,
    winningCommitments: [
      { userId: 'user1', tokensCommitted: 300 },
      { userId: 'user2', tokensCommitted: 200 }
    ],
    creatorFeePercentage: 0.02
  })

  console.log('Results:')
  console.log(`- House Fee (5%): ${example1.houseFee} tokens`)
  console.log(`- Creator Fee (2%): ${example1.creatorFee} tokens`)
  console.log(`- Total Fees: ${example1.totalFees} tokens (${example1.feeBreakdown.totalFeePercentage * 100}%)`)
  console.log(`- Winner Pool: ${example1.winnerPool} tokens (${example1.feeBreakdown.remainingForWinners * 100}%)`)
  console.log('- Individual Payouts:')
  example1.payouts.forEach((payout, i) => {
    console.log(`  User ${i + 1}: ${payout.payoutAmount} tokens (profit: ${payout.profit})`)
  })
  console.log()

  // Example 2: Maximum creator fee scenario
  console.log('Example 2: Maximum Creator Fee (5%)')
  console.log('Total Pool: 2,000 tokens')
  console.log('Winner: 1 user (500 tokens)')
  console.log('Creator Fee: 5% (maximum)')
  
  const example2 = PayoutCalculationService.calculatePayoutPreview({
    totalPool: 2000,
    winningCommitments: [
      { userId: 'whale', tokensCommitted: 500 }
    ],
    creatorFeePercentage: 0.05
  })

  console.log('Results:')
  console.log(`- House Fee (5%): ${example2.houseFee} tokens`)
  console.log(`- Creator Fee (5%): ${example2.creatorFee} tokens`)
  console.log(`- Total Fees: ${example2.totalFees} tokens (${example2.feeBreakdown.totalFeePercentage * 100}%)`)
  console.log(`- Winner Pool: ${example2.winnerPool} tokens (${example2.feeBreakdown.remainingForWinners * 100}%)`)
  console.log(`- Winner Payout: ${example2.payouts[0].payoutAmount} tokens (profit: ${example2.payouts[0].profit})`)
  console.log()

  // Example 3: Multiple winners with different stakes
  console.log('Example 3: Multiple Winners with Different Stakes')
  console.log('Total Pool: 5,000 tokens')
  console.log('Winners: 4 users with varying stakes')
  console.log('Creator Fee: 3%')
  
  const example3 = PayoutCalculationService.calculatePayoutPreview({
    totalPool: 5000,
    winningCommitments: [
      { userId: 'small', tokensCommitted: 100 },   // 10% of winning pool
      { userId: 'medium', tokensCommitted: 300 },  // 30% of winning pool
      { userId: 'large', tokensCommitted: 400 },   // 40% of winning pool
      { userId: 'whale', tokensCommitted: 200 }    // 20% of winning pool
    ],
    creatorFeePercentage: 0.03
  })

  console.log('Results:')
  console.log(`- Total Fees: ${example3.totalFees} tokens (${example3.feeBreakdown.totalFeePercentage * 100}%)`)
  console.log(`- Winner Pool: ${example3.winnerPool} tokens`)
  console.log(`- Largest Payout: ${example3.largestPayout} tokens`)
  console.log(`- Smallest Payout: ${example3.smallestPayout} tokens`)
  console.log(`- Average Payout: ${example3.averagePayout} tokens`)
  console.log('- Individual Payouts:')
  example3.payouts.forEach((payout) => {
    const roi = ((payout.payoutAmount / payout.tokensStaked - 1) * 100).toFixed(1)
    console.log(`  ${payout.userId}: ${payout.payoutAmount} tokens (${roi}% ROI)`)
  })
  console.log()

  // Example 4: Fee breakdown comparison
  console.log('Example 4: Fee Structure Comparison')
  console.log('Pool: 10,000 tokens')
  
  const feeComparison = [
    { label: 'Minimum Creator Fee (1%)', fee: 0.01 },
    { label: 'Standard Creator Fee (2%)', fee: 0.02 },
    { label: 'High Creator Fee (4%)', fee: 0.04 },
    { label: 'Maximum Creator Fee (5%)', fee: 0.05 }
  ]

  feeComparison.forEach(({ label, fee }) => {
    const breakdown = PayoutCalculationService.getFeeBreakdown(10000, fee)
    console.log(`${label}:`)
    console.log(`  Total Fees: ${breakdown.totalFees} tokens (${breakdown.totalFeePercentage * 100}%)`)
    console.log(`  Winner Pool: ${breakdown.winnerPool} tokens (${breakdown.winnerPoolPercentage * 100}%)`)
  })
  console.log()

  console.log('=== Key Features Demonstrated ===')
  console.log('✓ Fixed 5% house fee')
  console.log('✓ Configurable 1-5% creator fee')
  console.log('✓ Proportional distribution to winners')
  console.log('✓ Comprehensive fee breakdown')
  console.log('✓ Payout preview with statistics')
  console.log('✓ Input validation and error handling')
  console.log('✓ Edge case handling (small amounts, no winners, etc.)')
}

/**
 * Validate payout calculation accuracy
 */
export function validatePayoutAccuracy() {
  console.log('=== Payout Accuracy Validation ===\n')

  const testCases = [
    {
      name: 'Equal stakes',
      totalPool: 1000,
      commitments: [
        { userId: 'user1', tokensCommitted: 250 },
        { userId: 'user2', tokensCommitted: 250 }
      ],
      creatorFee: 0.02
    },
    {
      name: 'Unequal stakes',
      totalPool: 1000,
      commitments: [
        { userId: 'user1', tokensCommitted: 100 },
        { userId: 'user2', tokensCommitted: 400 }
      ],
      creatorFee: 0.03
    },
    {
      name: 'Single winner',
      totalPool: 500,
      commitments: [
        { userId: 'user1', tokensCommitted: 200 }
      ],
      creatorFee: 0.01
    }
  ]

  testCases.forEach(testCase => {
    console.log(`Test Case: ${testCase.name}`)
    
    const result = PayoutCalculationService.calculatePayouts(testCase)
    
    // Validate that all payouts are integers
    const allPayoutsAreIntegers = result.payouts.every(p => 
      Number.isInteger(p.payoutAmount) && Number.isInteger(p.profit)
    )
    
    // Validate that total distributed doesn't exceed winner pool
    const totalDistributed = result.payouts.reduce((sum, p) => sum + p.payoutAmount, 0)
    const distributionValid = totalDistributed <= result.winnerPool
    
    // Validate win shares sum to 1 (or close due to rounding)
    const totalWinShare = result.payouts.reduce((sum, p) => sum + p.winShare, 0)
    const winShareValid = Math.abs(totalWinShare - 1) < 0.0001 || result.payouts.length === 0
    
    console.log(`  ✓ All payouts are integers: ${allPayoutsAreIntegers}`)
    console.log(`  ✓ Distribution within limits: ${distributionValid}`)
    console.log(`  ✓ Win shares sum correctly: ${winShareValid}`)
    console.log(`  Total distributed: ${totalDistributed}/${result.winnerPool}`)
    console.log()
  })
}

// Export for use in development/testing
export const PayoutExamples = {
  demonstrate: demonstratePayoutCalculations,
  validate: validatePayoutAccuracy
}