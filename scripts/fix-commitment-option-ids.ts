/**
 * Script to fix commitment option IDs in the database
 * Converts generic "yes"/"no" positions to actual market option IDs
 */

import { initializeApp } from "firebase/app"
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  query,
  where
} from "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

interface FixResult {
  totalCommitments: number
  fixedCommitments: number
  errors: string[]
  marketAnalysis: Array<{
    marketId: string
    marketTitle: string
    options: Array<{ id: string, name: string }>
    commitments: Array<{
      id: string
      currentPosition: string
      suggestedOptionId: string
      tokens: number
    }>
  }>
}

async function analyzeAndFixCommitmentOptionIds(): Promise<FixResult> {
  console.log('🔍 Analyzing commitment option ID issues...\n')
  
  const result: FixResult = {
    totalCommitments: 0,
    fixedCommitments: 0,
    errors: [],
    marketAnalysis: []
  }
  
  try {
    // Get all markets
    const marketsSnapshot = await getDocs(collection(db, 'markets'))
    console.log(`Found ${marketsSnapshot.size} markets to analyze\n`)
    
    for (const marketDoc of marketsSnapshot.docs) {
      const marketData = marketDoc.data()
      const marketId = marketDoc.id
      const marketTitle = marketData.title || 'Unnamed Market'
      
      console.log(`\n=== ANALYZING MARKET: "${marketTitle}" ===`)
      console.log(`Market ID: ${marketId}`)
      
      // Extract market options
      const marketOptions: Array<{ id: string, name: string }> = []
      
      if (marketData.options && Array.isArray(marketData.options)) {
        marketData.options.forEach((option: any, index: number) => {
          const optionId = option.id || `option_${index}`
          const optionName = option.name || option.text || `Option ${index + 1}`
          marketOptions.push({ id: optionId, name: optionName })
        })
      }
      
      console.log(`Market Options (${marketOptions.length}):`)
      marketOptions.forEach((opt, idx) => {
        console.log(`  ${idx + 1}. ID: "${opt.id}", Name: "${opt.name}"`)
      })
      
      // Get commitments for this market
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('predictionId', '==', marketId)
      )
      
      const commitmentsSnapshot = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      console.log(`\nCommitments found: ${commitments.length}`)
      
      const marketAnalysis = {
        marketId,
        marketTitle,
        options: marketOptions,
        commitments: [] as any[]
      }
      
      // Analyze each commitment
      for (const commitment of commitments) {
        result.totalCommitments++
        
        const currentPosition = commitment.position
        const tokens = commitment.tokensCommitted || 0
        
        console.log(`\nCommitment ${commitment.id}:`)
        console.log(`  Current Position: "${currentPosition}"`)
        console.log(`  Tokens: ${tokens}`)
        console.log(`  Status: ${commitment.status}`)
        
        // Determine the correct option ID
        let suggestedOptionId = currentPosition
        
        // If it's a generic yes/no, try to map to actual options
        if (currentPosition === 'yes' || currentPosition === 'no') {
          if (marketOptions.length === 2) {
            // Binary market - map yes to first option, no to second
            if (currentPosition === 'yes') {
              suggestedOptionId = marketOptions[0].id
              console.log(`  🔄 Mapping "yes" → "${marketOptions[0].name}" (${marketOptions[0].id})`)
            } else {
              suggestedOptionId = marketOptions[1].id
              console.log(`  🔄 Mapping "no" → "${marketOptions[1].name}" (${marketOptions[1].id})`)
            }
          } else if (marketOptions.length > 2) {
            // Multi-option market - try semantic matching
            const yesKeywords = ['yes', 'stay', 'together', 'will', 'true', 'positive']
            const noKeywords = ['no', 'break', 'up', 'wont', 'false', 'negative']
            
            if (currentPosition === 'yes') {
              const matchedOption = marketOptions.find(opt => 
                yesKeywords.some(keyword => opt.name.toLowerCase().includes(keyword))
              )
              if (matchedOption) {
                suggestedOptionId = matchedOption.id
                console.log(`  🔄 Semantic mapping "yes" → "${matchedOption.name}" (${matchedOption.id})`)
              }
            } else {
              const matchedOption = marketOptions.find(opt => 
                noKeywords.some(keyword => opt.name.toLowerCase().includes(keyword))
              )
              if (matchedOption) {
                suggestedOptionId = matchedOption.id
                console.log(`  🔄 Semantic mapping "no" → "${matchedOption.name}" (${matchedOption.id})`)
              }
            }
          }
        }
        
        // Check if the current position matches any existing option ID
        const existingOption = marketOptions.find(opt => opt.id === currentPosition)
        if (existingOption) {
          console.log(`  ✅ Position already matches option ID: "${existingOption.name}"`)
        } else if (suggestedOptionId !== currentPosition) {
          console.log(`  🔧 Needs fixing: "${currentPosition}" → "${suggestedOptionId}"`)
        } else {
          console.log(`  ⚠️ No clear mapping found for position: "${currentPosition}"`)
        }
        
        marketAnalysis.commitments.push({
          id: commitment.id,
          currentPosition,
          suggestedOptionId,
          tokens
        })
      }
      
      result.marketAnalysis.push(marketAnalysis)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Error analyzing commitments:', error)
    result.errors.push(`Analysis failed: ${error}`)
    return result
  }
}

async function applyCommitmentFixes(analysisResult: FixResult, dryRun: boolean = true): Promise<void> {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`${dryRun ? '🔍 DRY RUN' : '🔧 APPLYING FIXES'} - Commitment Option ID Updates`)
  console.log(`${'='.repeat(80)}`)
  
  if (dryRun) {
    console.log('This is a dry run - no changes will be made to the database.\n')
  }
  
  let totalUpdates = 0
  
  for (const market of analysisResult.marketAnalysis) {
    console.log(`\n📊 Market: "${market.marketTitle}"`)
    
    const commitmentsToFix = market.commitments.filter(c => 
      c.currentPosition !== c.suggestedOptionId
    )
    
    if (commitmentsToFix.length === 0) {
      console.log('  ✅ No fixes needed for this market')
      continue
    }
    
    console.log(`  🔧 ${commitmentsToFix.length} commitments need fixing:`)
    
    const batch = writeBatch(db)
    
    for (const commitment of commitmentsToFix) {
      console.log(`    • ${commitment.id}: "${commitment.currentPosition}" → "${commitment.suggestedOptionId}" (${commitment.tokens} tokens)`)
      
      if (!dryRun) {
        const commitmentRef = doc(db, 'prediction_commitments', commitment.id)
        batch.update(commitmentRef, {
          position: commitment.suggestedOptionId,
          // Add metadata to track the fix
          fixedAt: new Date(),
          originalPosition: commitment.currentPosition
        })
        totalUpdates++
      }
    }
    
    if (!dryRun && commitmentsToFix.length > 0) {
      try {
        await batch.commit()
        console.log(`  ✅ Updated ${commitmentsToFix.length} commitments`)
      } catch (error) {
        console.error(`  ❌ Failed to update commitments: ${error}`)
      }
    }
  }
  
  if (dryRun) {
    console.log(`\n📋 Summary: ${totalUpdates} commitments would be updated`)
    console.log('Run with dryRun=false to apply these changes')
  } else {
    console.log(`\n✅ Successfully updated ${totalUpdates} commitments`)
  }
}

async function main() {
  try {
    console.log('🚀 Starting Commitment Option ID Fix Process\n')
    
    // Step 1: Analyze the current state
    const analysisResult = await analyzeAndFixCommitmentOptionIds()
    
    console.log(`\n${'='.repeat(80)}`)
    console.log('📊 ANALYSIS SUMMARY')
    console.log(`${'='.repeat(80)}`)
    console.log(`Total Commitments: ${analysisResult.totalCommitments}`)
    console.log(`Markets Analyzed: ${analysisResult.marketAnalysis.length}`)
    console.log(`Errors: ${analysisResult.errors.length}`)
    
    if (analysisResult.errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      analysisResult.errors.forEach(error => console.log(`  • ${error}`))
    }
    
    // Step 2: Show what would be fixed (dry run)
    await applyCommitmentFixes(analysisResult, true)
    
    // Step 3: Ask for confirmation (in a real scenario)
    console.log(`\n${'='.repeat(80)}`)
    console.log('To apply these fixes, run the script with APPLY_FIXES=true')
    console.log('Example: APPLY_FIXES=true node fix-commitment-option-ids.js')
    console.log(`${'='.repeat(80)}`)
    
    // Step 4: Apply fixes if requested
    if (process.env.APPLY_FIXES === 'true') {
      console.log('\n🔧 Applying fixes...')
      await applyCommitmentFixes(analysisResult, false)
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { analyzeAndFixCommitmentOptionIds, applyCommitmentFixes }