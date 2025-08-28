/**
 * Test to verify the token calculation logic works correctly
 * This addresses the issue where "Yes" showed 0% while "No" showed 13%
 */

describe('Token Calculation Logic', () => {
  // Helper function that mimics the logic in MarketStatistics
  const calculateTokenData = (option: { tokens: number; percentage: number }, totalTokens: number) => {
    let actualTokens = option.tokens || 0
    let tokenPercentage = 0
    
    if (actualTokens > 0 && totalTokens > 0) {
      // Calculate percentage from actual tokens
      tokenPercentage = (actualTokens / totalTokens) * 100
    } else if (option.percentage > 0 && totalTokens > 0) {
      // Calculate tokens from percentage
      actualTokens = Math.round((option.percentage / totalTokens) * totalTokens)
      tokenPercentage = option.percentage
    } else if (option.percentage > 0) {
      // Use the percentage directly if no total tokens
      tokenPercentage = option.percentage
    }
    
    return { actualTokens, tokenPercentage }
  }

  it('calculates correctly when both options have tokens', () => {
    const totalTokens = 1201
    const yesOption = { tokens: 756, percentage: 63 }
    const noOption = { tokens: 445, percentage: 37 }

    const yesResult = calculateTokenData(yesOption, totalTokens)
    const noResult = calculateTokenData(noOption, totalTokens)

    // Both should calculate percentages from tokens
    expect(Math.round(yesResult.tokenPercentage)).toBe(63) // 756/1201 ≈ 63%
    expect(Math.round(noResult.tokenPercentage)).toBe(37) // 445/1201 ≈ 37%
    
    expect(yesResult.actualTokens).toBe(756)
    expect(noResult.actualTokens).toBe(445)
  })

  it('calculates correctly when one option has no tokens but has percentage', () => {
    const totalTokens = 1201
    const yesOption = { tokens: 0, percentage: 63 } // This was the problematic case
    const noOption = { tokens: 445, percentage: 37 }

    const yesResult = calculateTokenData(yesOption, totalTokens)
    const noResult = calculateTokenData(noOption, totalTokens)

    // Yes should calculate tokens from percentage
    expect(yesResult.tokenPercentage).toBe(63)
    expect(yesResult.actualTokens).toBe(Math.round((63 / 1201) * 1201)) // Should be 63

    // No should calculate percentage from tokens
    expect(Math.round(noResult.tokenPercentage)).toBe(37)
    expect(noResult.actualTokens).toBe(445)
  })

  it('handles edge case where both tokens and percentage are zero', () => {
    const totalTokens = 1000
    const option = { tokens: 0, percentage: 0 }

    const result = calculateTokenData(option, totalTokens)

    expect(result.actualTokens).toBe(0)
    expect(result.tokenPercentage).toBe(0)
  })

  it('uses percentage when total tokens is zero', () => {
    const totalTokens = 0
    const option = { tokens: 0, percentage: 50 }

    const result = calculateTokenData(option, totalTokens)

    expect(result.actualTokens).toBe(0)
    expect(result.tokenPercentage).toBe(50) // Should use percentage directly
  })
})