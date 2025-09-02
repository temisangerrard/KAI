# KAI Market Resolution System - Requirements & Guidelines

## Market Creation Rules

### ✅ Good Markets (Resolvable)
Markets must have:
- **Clear end date** (specific date/time when outcome is known)
- **Definitive outcome** (only ONE option can be true)
- **Verifiable result** (can be proven with evidence)

**Examples:**
- "Will Drake release an album before December 31, 2024?" (Yes/No)
- "Will Taylor Swift announce tour dates by March 1, 2025?" (Yes/No)  
- "Which artist will have #1 album in Q1 2025?" (Drake/Taylor/Kendrick/Other)

### ❌ Bad Markets (Not Allowed)
- Subjective opinions: "Is Drake the best rapper?" ❌
- No clear end date: "Will Drake ever tour again?" ❌
- Ambiguous outcomes: "Will Drake have a good year?" ❌
- Multiple outcomes possible: "Will Drake release music AND tour?" ❌

## Market Resolution Logic

### 1. Payout Calculation (Winners Split Total Pool)

```typescript
interface ResolutionPayout {
  userId: string
  optionId: string
  tokensStaked: number
  payout: number
  profit: number
}

function calculatePayouts(
  market: Market, 
  winningOptionId: string
): ResolutionPayout[] {
  const winningOption = market.options.find(opt => opt.id === winningOptionId)
  const totalMarketPool = market.options.reduce((sum, opt) => sum + opt.totalTokensStaked, 0)
  const totalWinnerTokens = winningOption.totalTokensStaked
  
  // Get all users who bet on the winning option
  const winners = getUserBets(market.id, winningOptionId)
  
  return winners.map(bet => {
    // Winner's share = their stake / total winner stakes
    const userShare = bet.tokensStaked / totalWinnerTokens
    
    // Payout = their share of the ENTIRE market pool
    const payout = Math.floor(userShare * totalMarketPool)
    const profit = payout - bet.tokensStaked
    
    return {
      userId: bet.userId,
      optionId: winningOptionId,
      tokensStaked: bet.tokensStaked,
      payout,
      profit
    }
  })
}
```

### 2. Real Example

**Market**: "Will Drake drop album before Dec 31?"
- Yes: 500 tokens staked (by users A, B, C)
- No: 1,200 tokens staked (by users D, E, F, G)
- **Total pool**: 1,700 tokens

**If "No" wins:**
- User D staked 400 tokens → gets (400/1200) × 1700 = 567 tokens → profit: 167
- User E staked 300 tokens → gets (300/1200) × 1700 = 425 tokens → profit: 125  
- User F staked 250 tokens → gets (250/1200) × 1700 = 354 tokens → profit: 104
- User G staked 250 tokens → gets (250/1200) × 1700 = 354 tokens → profit: 104

**Total paid out**: 567+425+354+354 = 1,700 tokens ✅ (matches total pool)

### 3. Resolution Database Schema

```sql
-- Market resolutions table
CREATE TABLE market_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets(id),
  winning_option_id UUID REFERENCES market_options(id),
  resolved_by UUID REFERENCES users(id), -- Admin who resolved it
  resolved_at TIMESTAMP DEFAULT NOW(),
  resolution_evidence TEXT[], -- URLs, descriptions, proof
  total_payout INTEGER NOT NULL,
  winner_count INTEGER NOT NULL,
  status TEXT DEFAULT 'completed' -- completed, disputed, cancelled
);

-- Individual payouts
CREATE TABLE resolution_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID REFERENCES market_resolutions(id),
  user_id UUID REFERENCES users(id),
  option_id UUID REFERENCES market_options(id),
  tokens_staked INTEGER NOT NULL,
  payout_amount INTEGER NOT NULL,
  profit INTEGER NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'completed' -- completed, failed, pending
);
```

## Market Creation UI Guidelines

### Form Validation Rules

```typescript
interface MarketCreationRules {
  title: {
    required: true
    minLength: 10
    mustBeQuestion: true // Should end with "?" 
    noSubjectiveWords: ['best', 'worst', 'better', 'good', 'bad'] // Flag these
  }
  
  endDate: {
    required: true
    mustBeFuture: true
    maxMonthsOut: 12 // No markets longer than 1 year
  }
  
  options: {
    minOptions: 2
    maxOptions: 5 // Keep it simple
    mustHaveOneWinner: true // Only one can be correct
  }
}
```

### Market Creation Form Updates

**Add these validation messages:**

```jsx
// In market creation form
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
  <h4 className="font-medium text-blue-800 mb-2">✅ Good Market Examples:</h4>
  <ul className="text-sm text-blue-700 space-y-1">
    <li>"Will Drake release an album before March 31, 2025?"</li>
    <li>"Will Taylor Swift announce Eras Tour extension by Jan 15, 2025?"</li>
    <li>"Which song will be #1 on Billboard Hot 100 on New Year's Day 2025?"</li>
  </ul>
  
  <h4 className="font-medium text-red-800 mb-2 mt-4">❌ Avoid These:</h4>
  <ul className="text-sm text-red-700 space-y-1">
    <li>Subjective opinions ("Who's the best rapper?")</li>
    <li>Vague timing ("Will Drake ever tour again?")</li>
    <li>Multiple outcomes ("Will Drake drop album AND go on tour?")</li>
  </ul>
</div>
```

**Add real-time validation:**
```typescript
// Check for problematic words
const subjectiveWords = ['best', 'worst', 'better', 'good', 'bad', 'greatest', 'favorite']
const hasSubjectiveWords = subjectiveWords.some(word => 
  title.toLowerCase().includes(word)
)

if (hasSubjectiveWords) {
  setErrors({
    title: "Avoid subjective terms. Markets need clear, factual outcomes."
  })
}

// Check for clear end date requirement
if (!endDate || endDate <= new Date()) {
  setErrors({
    endDate: "Markets must have a specific future end date when the outcome is known."
  })
}
```

## Admin Resolution Dashboard Requirements

### Resolution Process
1. **Market ends** (reaches end date)
2. **Admin reviews** outcome with evidence
3. **Admin selects winner** from options
4. **System calculates payouts** automatically  
5. **Tokens distributed** to winners
6. **Resolution recorded** with evidence

### Evidence Requirements
For each resolution, admin must provide:
- **Source links** (news articles, official announcements)
- **Screenshots** (social media posts, charts, official pages)
- **Description** of why this option won
- **Resolution date** (when outcome became clear)

### Admin Dashboard Flow

```jsx
// Resolution interface
<div className="resolution-form">
  <h3>Resolve: "{market.title}"</h3>
  
  <div className="outcome-selection">
    <label>Select the winning outcome:</label>
    {market.options.map(option => (
      <div key={option.id} className="option-card">
        <input 
          type="radio" 
          name="winner" 
          value={option.id}
          onChange={setWinningOption}
        />
        <div>
          <h4>{option.name}</h4>
          <p>{option.totalTokensStaked} tokens • {getBetCount(option.id)} backers</p>
          <p>If this wins: {getBetCount(option.id)} users get payouts</p>
        </div>
      </div>
    ))}
  </div>
  
  <div className="evidence-section">
    <label>Add Evidence (Required):</label>
    <input type="url" placeholder="Source URL (news, official announcement)" />
    <textarea placeholder="Explain why this outcome is correct"></textarea>
    <input type="file" accept="image/*" placeholder="Upload screenshot" />
  </div>
  
  <div className="payout-preview">
    <h4>Payout Preview:</h4>
    <p>Total pool: {market.totalTokens} tokens</p>
    <p>Winners: {getWinnerCount()} users</p>
    <p>Largest payout: {getLargestPayout()} tokens</p>
  </div>
  
  <Button onClick={handleResolve} disabled={!canResolve}>
    Resolve Market & Distribute Payouts
  </Button>
</div>
```

## API Endpoints Needed

```typescript
// Admin endpoints
POST /api/admin/markets/{id}/resolve
{
  winningOptionId: string
  evidence: {
    sourceUrl: string
    description: string
    screenshot?: File
  }[]
}

GET /api/admin/markets/pending-resolution
// Returns markets past end date, not yet resolved

POST /api/admin/markets/{id}/cancel
{
  reason: string // If market is impossible to resolve
}

// User endpoints  
GET /api/user/payouts
// User's payout history

GET /api/markets/{id}/resolution
// Resolution details for a market
```

## Key Implementation Points

1. **Pure math** - payout calculation is just proportional distribution
2. **No complex trading** - users can't sell early or change bets
3. **Clear rules** - only resolvable markets allowed
4. **Evidence required** - all resolutions must have proof
5. **Automatic distribution** - no manual payout process

This keeps the system simple, transparent, and fair while ensuring all markets can actually be resolved definitively.