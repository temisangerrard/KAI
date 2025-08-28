/**
 * Script to retrieve all market data from Firestore
 * Shows market name, options, tokens committed per option, and unique participants
 */

import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore"

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

interface MarketData {
  id: string
  name: string
  options: Array<{
    id: string
    name: string
    tokensCommitted: number
    participantCount: number
  }>
  totalTokens: number
  totalUniqueParticipants: number
  status: string
}

async function retrieveAllMarketData(): Promise<MarketData[]> {
  console.log('🔍 Retrieving all market data from Firestore...\n')
  
  try {
    // Get all markets
    console.log('📊 Fetching markets...')
    const marketsSnapshot = await getDocs(collection(db, 'markets'))
    console.log(`Found ${marketsSnapshot.size} markets\n`)
    
    const marketDataList: MarketData[] = []
    
    for (const marketDoc of marketsSnapshot.docs) {
      const marketData = marketDoc.data()
      const marketId = marketDoc.id
      
      console.log(`\n🏪 Processing Market: "${marketData.title || 'Unnamed Market'}" (ID: ${marketId})`)
      console.log(`   Status: ${marketData.status || 'unknown'}`)
      console.log(`   Options: ${marketData.options?.length || 0}`)
      
      // Get all commitments for this market
      console.log(`   📈 Fetching commitments...`)
      const commitmentsQuery = query(
        collection(db, 'prediction_commitments'),
        where('predictionId', '==', marketId)
      )
      
      const commitmentsSnapshot = await getDocs(commitmentsQuery)
      const commitments = commitmentsSnapshot.docs.map(doc => doc.data())
      
      console.log(`   Found ${commitments.length} total commitments`)
      
      // Filter active commitments
      const activeCommitments = commitments.filter(c => c.status === 'active')
      console.log(`   Found ${activeCommitments.length} active commitments`)
      
      // Calculate tokens per option and unique participants
      const optionStats = new Map<string, { tokens: number, participants: Set<string> }>()
      const allParticipants = new Set<string>()
      
      // Initialize options from market data
      if (marketData.options && Array.isArray(marketData.options)) {
        marketData.options.forEach((option: any) => {
          const optionId = option.id || option.name || `option_${Math.random()}`
          optionStats.set(optionId, { tokens: 0, participants: new Set() })
        })
      }
      
      // Process commitments
      activeCommitments.forEach((commitment: any) => {
        const position = commitment.position
        const tokens = commitment.tokensCommitted || 0
        const userId = commitment.userId
        
        if (position && userId) {
          allParticipants.add(userId)
          
          // Map position to option (handle yes/no markets)
          let optionKey = position
          if (position === 'yes' || position === 'no') {
            optionKey = position
          }
          
          if (!optionStats.has(optionKey)) {
            optionStats.set(optionKey, { tokens: 0, participants: new Set() })
          }
          
          const stats = optionStats.get(optionKey)!
          stats.tokens += tokens
          stats.participants.add(userId)
        }
      })
      
      // Build options array
      const options: MarketData['options'] = []
      
      if (marketData.options && Array.isArray(marketData.options)) {
        // Use market-defined options
        marketData.options.forEach((option: any, index: number) => {
          const optionId = option.id || option.name || `option_${index}`
          const stats = optionStats.get(optionId) || { tokens: 0, participants: new Set() }
          
          options.push({
            id: optionId,
            name: option.name || option.text || `Option ${index + 1}`,
            tokensCommitted: stats.tokens,
            participantCount: stats.participants.size
          })
        })
      } else {
        // Create options from commitment positions
        optionStats.forEach((stats, position) => {
          options.push({
            id: position,
            name: position === 'yes' ? 'Yes' : position === 'no' ? 'No' : position,
            tokensCommitted: stats.tokens,
            participantCount: stats.participants.size
          })
        })
      }
      
      const totalTokens = options.reduce((sum, opt) => sum + opt.tokensCommitted, 0)
      
      const marketInfo: MarketData = {
        id: marketId,
        name: marketData.title || 'Unnamed Market',
        options,
        totalTokens,
        totalUniqueParticipants: allParticipants.size,
        status: marketData.status || 'unknown'
      }
      
      marketDataList.push(marketInfo)
      
      // Log summary for this market
      console.log(`   💰 Total tokens committed: ${totalTokens}`)
      console.log(`   👥 Unique participants: ${allParticipants.size}`)
      console.log(`   📋 Options breakdown:`)
      options.forEach(option => {
        const percentage = totalTokens > 0 ? ((option.tokensCommitted / totalTokens) * 100).toFixed(1) : '0.0'
        console.log(`      - ${option.name}: ${option.tokensCommitted} tokens (${percentage}%) - ${option.participantCount} participants`)
      })
    }
    
    return marketDataList
    
  } catch (error) {
    console.error('❌ Error retrieving market data:', error)
    throw error
  }
}

async function main() {
  try {
    const marketData = await retrieveAllMarketData()
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 MARKET DATA SUMMARY')
    console.log('='.repeat(80))
    
    marketData.forEach((market, index) => {
      console.log(`\n${index + 1}. ${market.name}`)
      console.log(`   ID: ${market.id}`)
      console.log(`   Status: ${market.status}`)
      console.log(`   Total Tokens: ${market.totalTokens.toLocaleString()}`)
      console.log(`   Unique Participants: ${market.totalUniqueParticipants}`)
      console.log(`   Options (${market.options.length}):`)
      
      market.options.forEach(option => {
        const percentage = market.totalTokens > 0 ? 
          ((option.tokensCommitted / market.totalTokens) * 100).toFixed(1) : '0.0'
        console.log(`     • ${option.name}: ${option.tokensCommitted.toLocaleString()} tokens (${percentage}%) | ${option.participantCount} participants`)
      })
    })
    
    console.log('\n' + '='.repeat(80))
    console.log('📈 OVERALL STATISTICS')
    console.log('='.repeat(80))
    
    const totalMarkets = marketData.length
    const totalTokensAcrossAllMarkets = marketData.reduce((sum, m) => sum + m.totalTokens, 0)
    const totalParticipantsAcrossAllMarkets = marketData.reduce((sum, m) => sum + m.totalUniqueParticipants, 0)
    const activeMarkets = marketData.filter(m => m.status === 'active').length
    
    console.log(`Total Markets: ${totalMarkets}`)
    console.log(`Active Markets: ${activeMarkets}`)
    console.log(`Total Tokens Committed: ${totalTokensAcrossAllMarkets.toLocaleString()}`)
    console.log(`Total Participants: ${totalParticipantsAcrossAllMarkets.toLocaleString()}`)
    console.log(`Average Tokens per Market: ${totalMarkets > 0 ? Math.round(totalTokensAcrossAllMarkets / totalMarkets).toLocaleString() : 0}`)
    console.log(`Average Participants per Market: ${totalMarkets > 0 ? Math.round(totalParticipantsAcrossAllMarkets / totalMarkets) : 0}`)
    
    console.log('\n✅ Market data retrieval completed!')
    
  } catch (error) {
    console.error('💥 Failed to retrieve market data:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { retrieveAllMarketData, type MarketData }