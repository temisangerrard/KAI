import { PayoutCalculationService, PayoutCalculationInput } from '@/lib/services/payout-calculation-service'

describe('PayoutCalculationService', () => {
  describe('calculatePayouts', () => {
    it('should calculate payouts correctly with basic scenario', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 300 },
          { userId: 'user2', tokensCommitted: 200 }
        ],
        creatorFeePercentage: 0.02 // 2%
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // Expected calculations:
      // House fee: 1000 * 0.05 = 50
      // Creator fee: 1000 * 0.02 = 20
      // Winner pool: 1000 - 50 - 20 = 930
      // Total winning tokens: 300 + 200 = 500
      // User1 share: 300/500 = 0.6, payout: 930 * 0.6 = 558
      // User2 share: 200/500 = 0.4, payout: 930 * 0.4 = 372

      expect(result.totalPool).toBe(1000)
      expect(result.houseFee).toBe(50)
      expect(result.creatorFee).toBe(20)
      expect(result.totalFees).toBe(70)
      expect(result.winnerPool).toBe(930)
      expect(result.winnerCount).toBe(2)

      expect(result.payouts).toHaveLength(2)
      expect(result.payouts[0]).toEqual({
        userId: 'user1',
        tokensStaked: 300,
        payoutAmount: 558,
        profit: 258,
        winShare: 0.6
      })
      expect(result.payouts[1]).toEqual({
        userId: 'user2',
        tokensStaked: 200,
        payoutAmount: 372,
        profit: 172,
        winShare: 0.4
      })

      expect(result.feeBreakdown).toEqual({
        houseFeePercentage: 0.05,
        creatorFeePercentage: 0.02,
        totalFeePercentage: 0.07,
        remainingForWinners: 0.93
      })
    })

    it('should handle single winner scenario', () => {
      const input: PayoutCalculationInput = {
        totalPool: 500,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 100 }
        ],
        creatorFeePercentage: 0.03 // 3%
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // Expected calculations:
      // House fee: 500 * 0.05 = 25
      // Creator fee: 500 * 0.03 = 15
      // Winner pool: 500 - 25 - 15 = 460
      // User1 gets all: 460

      expect(result.houseFee).toBe(25)
      expect(result.creatorFee).toBe(15)
      expect(result.winnerPool).toBe(460)
      expect(result.payouts[0]).toEqual({
        userId: 'user1',
        tokensStaked: 100,
        payoutAmount: 460,
        profit: 360,
        winShare: 1
      })
    })

    it('should handle maximum creator fee (5%)', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 200 }
        ],
        creatorFeePercentage: 0.05 // 5% maximum
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // Expected calculations:
      // House fee: 1000 * 0.05 = 50
      // Creator fee: 1000 * 0.05 = 50
      // Total fees: 100 (10% total)
      // Winner pool: 1000 - 100 = 900

      expect(result.houseFee).toBe(50)
      expect(result.creatorFee).toBe(50)
      expect(result.totalFees).toBe(100)
      expect(result.winnerPool).toBe(900)
      expect(result.feeBreakdown.totalFeePercentage).toBe(0.10)
      expect(result.feeBreakdown.remainingForWinners).toBe(0.90)
    })

    it('should handle minimum creator fee (1%)', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 200 }
        ],
        creatorFeePercentage: 0.01 // 1% minimum
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // Expected calculations:
      // House fee: 1000 * 0.05 = 50
      // Creator fee: 1000 * 0.01 = 10
      // Total fees: 60 (6% total)
      // Winner pool: 1000 - 60 = 940

      expect(result.houseFee).toBe(50)
      expect(result.creatorFee).toBe(10)
      expect(result.totalFees).toBe(60)
      expect(result.winnerPool).toBe(940)
      expect(result.feeBreakdown.totalFeePercentage).toBe(0.06)
      expect(result.feeBreakdown.remainingForWinners).toBe(0.94)
    })

    it('should handle multiple winners with different stakes', () => {
      const input: PayoutCalculationInput = {
        totalPool: 2000,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 100 }, // 10% of winning pool
          { userId: 'user2', tokensCommitted: 300 }, // 30% of winning pool
          { userId: 'user3', tokensCommitted: 600 }  // 60% of winning pool
        ],
        creatorFeePercentage: 0.025 // 2.5%
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // Expected calculations:
      // House fee: 2000 * 0.05 = 100
      // Creator fee: 2000 * 0.025 = 50
      // Winner pool: 2000 - 100 - 50 = 1850
      // Total winning tokens: 100 + 300 + 600 = 1000

      expect(result.houseFee).toBe(100)
      expect(result.creatorFee).toBe(50)
      expect(result.winnerPool).toBe(1850)
      expect(result.winnerCount).toBe(3)

      // User1: (100/1000) * 1850 = 185
      expect(result.payouts[0]).toEqual({
        userId: 'user1',
        tokensStaked: 100,
        payoutAmount: 185,
        profit: 85,
        winShare: 0.1
      })

      // User2: (300/1000) * 1850 = 555
      expect(result.payouts[1]).toEqual({
        userId: 'user2',
        tokensStaked: 300,
        payoutAmount: 555,
        profit: 255,
        winShare: 0.3
      })

      // User3: (600/1000) * 1850 = 1110
      expect(result.payouts[2]).toEqual({
        userId: 'user3',
        tokensStaked: 600,
        payoutAmount: 1110,
        profit: 510,
        winShare: 0.6
      })
    })

    it('should handle zero pool scenario', () => {
      const input: PayoutCalculationInput = {
        totalPool: 0,
        winningCommitments: [],
        creatorFeePercentage: 0.02
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      expect(result.totalPool).toBe(0)
      expect(result.houseFee).toBe(0)
      expect(result.creatorFee).toBe(0)
      expect(result.winnerPool).toBe(0)
      expect(result.payouts).toHaveLength(0)
    })

    it('should handle no winners scenario', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [],
        creatorFeePercentage: 0.02
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      expect(result.totalPool).toBe(1000)
      expect(result.houseFee).toBe(50)
      expect(result.creatorFee).toBe(20)
      expect(result.winnerPool).toBe(930)
      expect(result.winnerCount).toBe(0)
      expect(result.payouts).toHaveLength(0)
    })

    it('should floor payout amounts correctly', () => {
      const input: PayoutCalculationInput = {
        totalPool: 100,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 33 }, // Should get 33% of winner pool
          { userId: 'user2', tokensCommitted: 67 }  // Should get 67% of winner pool
        ],
        creatorFeePercentage: 0.02
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // House fee: 100 * 0.05 = 5
      // Creator fee: 100 * 0.02 = 2
      // Winner pool: 100 - 5 - 2 = 93
      // User1: (33/100) * 93 = 30.69 -> floor to 30
      // User2: (67/100) * 93 = 62.31 -> floor to 62

      expect(result.winnerPool).toBe(93)
      expect(result.payouts[0].payoutAmount).toBe(30) // Floored
      expect(result.payouts[1].payoutAmount).toBe(62) // Floored
    })
  })

  describe('calculatePayoutPreview', () => {
    it('should include additional statistics in preview', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 100 },
          { userId: 'user2', tokensCommitted: 200 },
          { userId: 'user3', tokensCommitted: 300 }
        ],
        creatorFeePercentage: 0.02
      }

      const result = PayoutCalculationService.calculatePayoutPreview(input)

      // Should include all base calculation results
      expect(result.totalPool).toBe(1000)
      expect(result.houseFee).toBe(50)
      expect(result.creatorFee).toBe(20)
      expect(result.winnerPool).toBe(930)

      // Additional preview statistics
      expect(result.largestPayout).toBe(465) // User3's payout
      expect(result.smallestPayout).toBe(155) // User1's payout
      expect(result.averagePayout).toBe(310) // (155 + 310 + 465) / 3
      expect(result.totalProfit).toBe(330) // Sum of all profits
    })

    it('should handle empty winners in preview', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [],
        creatorFeePercentage: 0.02
      }

      const result = PayoutCalculationService.calculatePayoutPreview(input)

      expect(result.largestPayout).toBe(0)
      expect(result.smallestPayout).toBe(0)
      expect(result.averagePayout).toBe(0)
      expect(result.totalProfit).toBe(0)
    })
  })

  describe('validateCreatorFeePercentage', () => {
    it('should validate creator fee within range', () => {
      expect(PayoutCalculationService.validateCreatorFeePercentage(0.01)).toBe(true) // 1%
      expect(PayoutCalculationService.validateCreatorFeePercentage(0.03)).toBe(true) // 3%
      expect(PayoutCalculationService.validateCreatorFeePercentage(0.05)).toBe(true) // 5%
    })

    it('should reject creator fee outside range', () => {
      expect(PayoutCalculationService.validateCreatorFeePercentage(0.005)).toBe(false) // 0.5%
      expect(PayoutCalculationService.validateCreatorFeePercentage(0.06)).toBe(false)  // 6%
      expect(PayoutCalculationService.validateCreatorFeePercentage(0)).toBe(false)     // 0%
      expect(PayoutCalculationService.validateCreatorFeePercentage(0.1)).toBe(false)   // 10%
    })
  })

  describe('getFeeBreakdown', () => {
    it('should provide detailed fee breakdown', () => {
      const breakdown = PayoutCalculationService.getFeeBreakdown(1000, 0.03)

      expect(breakdown).toEqual({
        totalPool: 1000,
        houseFee: 50,
        houseFeePercentage: 0.05,
        creatorFee: 30,
        creatorFeePercentage: 0.03,
        totalFees: 80,
        totalFeePercentage: 0.08,
        winnerPool: 920,
        winnerPoolPercentage: 0.92
      })
    })

    it('should throw error for invalid creator fee', () => {
      expect(() => {
        PayoutCalculationService.getFeeBreakdown(1000, 0.06)
      }).toThrow('Creator fee must be between 1% and 5%')
    })
  })

  describe('calculateProportionalDistribution', () => {
    it('should calculate proportional distribution correctly', () => {
      const commitments = [
        { userId: 'user1', tokensCommitted: 100 },
        { userId: 'user2', tokensCommitted: 300 }
      ]

      const result = PayoutCalculationService.calculateProportionalDistribution(800, commitments)

      expect(result).toEqual([
        { userId: 'user1', share: 0.25, amount: 200 }, // 100/400 * 800
        { userId: 'user2', share: 0.75, amount: 600 }  // 300/400 * 800
      ])
    })

    it('should handle zero commitments', () => {
      const result = PayoutCalculationService.calculateProportionalDistribution(800, [])
      expect(result).toEqual([])
    })

    it('should handle zero total committed', () => {
      const commitments = [
        { userId: 'user1', tokensCommitted: 0 },
        { userId: 'user2', tokensCommitted: 0 }
      ]

      const result = PayoutCalculationService.calculateProportionalDistribution(800, commitments)

      expect(result).toEqual([
        { userId: 'user1', share: 0, amount: 0 },
        { userId: 'user2', share: 0, amount: 0 }
      ])
    })
  })

  describe('input validation', () => {
    it('should throw error for negative total pool', () => {
      const input: PayoutCalculationInput = {
        totalPool: -100,
        winningCommitments: [],
        creatorFeePercentage: 0.02
      }

      expect(() => {
        PayoutCalculationService.calculatePayouts(input)
      }).toThrow('Total pool cannot be negative')
    })

    it('should throw error for invalid creator fee percentage', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [],
        creatorFeePercentage: 0.06 // Too high
      }

      expect(() => {
        PayoutCalculationService.calculatePayouts(input)
      }).toThrow('Creator fee percentage must be between 1% and 5%')
    })

    it('should throw error for negative token commitments', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: -50 }
        ],
        creatorFeePercentage: 0.02
      }

      expect(() => {
        PayoutCalculationService.calculatePayouts(input)
      }).toThrow('Token commitments cannot be negative')
    })

    it('should throw error when committed tokens exceed total pool', () => {
      const input: PayoutCalculationInput = {
        totalPool: 100,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 150 } // More than total pool
        ],
        creatorFeePercentage: 0.02
      }

      expect(() => {
        PayoutCalculationService.calculatePayouts(input)
      }).toThrow('Total committed tokens cannot exceed total pool')
    })

    it('should throw error for non-array winning commitments', () => {
      const input = {
        totalPool: 1000,
        winningCommitments: null as any,
        creatorFeePercentage: 0.02
      }

      expect(() => {
        PayoutCalculationService.calculatePayouts(input)
      }).toThrow('Winning commitments must be an array')
    })
  })

  describe('edge cases', () => {
    it('should handle very small pools', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 1 }
        ],
        creatorFeePercentage: 0.01
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // House fee: 1 * 0.05 = 0.05 -> floor to 0
      // Creator fee: 1 * 0.01 = 0.01 -> floor to 0
      // Winner pool: 1 - 0 - 0 = 1

      expect(result.houseFee).toBe(0)
      expect(result.creatorFee).toBe(0)
      expect(result.winnerPool).toBe(1)
      expect(result.payouts[0].payoutAmount).toBe(1)
    })

    it('should handle large pools', () => {
      const input: PayoutCalculationInput = {
        totalPool: 1000000, // 1 million
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 500000 }
        ],
        creatorFeePercentage: 0.05
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      expect(result.houseFee).toBe(50000)   // 5%
      expect(result.creatorFee).toBe(50000) // 5%
      expect(result.winnerPool).toBe(900000) // 90%
      expect(result.payouts[0].payoutAmount).toBe(900000)
    })

    it('should maintain precision with fractional calculations', () => {
      const input: PayoutCalculationInput = {
        totalPool: 999,
        winningCommitments: [
          { userId: 'user1', tokensCommitted: 333 },
          { userId: 'user2', tokensCommitted: 333 },
          { userId: 'user3', tokensCommitted: 333 }
        ],
        creatorFeePercentage: 0.033 // 3.3%
      }

      const result = PayoutCalculationService.calculatePayouts(input)

      // Verify that all payouts are integers (floored)
      result.payouts.forEach(payout => {
        expect(Number.isInteger(payout.payoutAmount)).toBe(true)
        expect(Number.isInteger(payout.profit)).toBe(true)
      })

      // Verify fees are integers
      expect(Number.isInteger(result.houseFee)).toBe(true)
      expect(Number.isInteger(result.creatorFee)).toBe(true)
    })
  })
})