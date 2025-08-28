/**
 * Script to examine the actual database structure
 * Shows how commitments are stored and how they relate to market options
 */

import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore"

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

async function examineDatabase() {
  console.log('🔍 Examining database structure...\n')
  
  try {
    // Get all collections
    console.log('📊 Available collections:')
    
    // Check markets collection
    console.log('\n=== MARKETS COLLECTION ===')
    const marketsSnapshot = await getDocs(collection(db, 'markets'))
    console.log(`Found ${marketsSnapshot.size} markets`)
    
    marketsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`\nMarket ${index + 1}: ${data.title || 'Unnamed'}`)
      console.log(`  ID: ${doc.id}`)
      console.log(`  Status: ${data.status}`)
      console.log(`  Options:`)
      
      if (data.options && Array.isArray(data.options)) {
        data.options.forEach((option: any, optIndex: number) => {
          console.log(`    ${optIndex + 1}. ID: "${option.id}"`)
          console.log(`       Name: "${option.name || option.text}"`)
          console.log(`       Tokens: ${option.tokens || 0}`)
          console.log(`       Total Tokens: ${option.totalTokens || 0}`)
          console.log(`       Percentage: ${option.percentage || 0}%`)
        })
      } else {
        console.log('    No options array found')
      }
      
      console.log(`  Raw data keys: ${Object.keys(data).join(', ')}`)
    })
    
    // Check commitments collection
    console.log('\n=== COMMITMENTS COLLECTION ===')
    const commitmentsSnapshot = await getDocs(collection(db, 'prediction_commitments'))
    console.log(`Found ${commitmentsSnapshot.size} commitments`)
    
    commitmentsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`\nCommitment ${index + 1}:`)
      console.log(`  ID: ${doc.id}`)
      console.log(`  Market ID: ${data.predictionId}`)
      console.log(`  Position: "${data.position}"`)
      console.log(`  Tokens: ${data.tokensCommitted}`)
      console.log(`  User: ${data.userId}`)
      console.log(`  Status: ${data.status}`)
      console.log(`  Created: ${data.committedAt}`)
      console.log(`  Raw data keys: ${Object.keys(data).join(', ')}`)
    })
    
    // Check if there are other collections
    console.log('\n=== OTHER COLLECTIONS ===')
    
    try {
      const userBalancesSnapshot = await getDocs(collection(db, 'user_balances'))
      console.log(`user_balances: ${userBalancesSnapshot.size} documents`)
    } catch (e) {
      console.log('user_balances: Collection does not exist')
    }
    
    try {
      const tokenTransactionsSnapshot = await getDocs(collection(db, 'token_transactions'))
      console.log(`token_transactions: ${tokenTransactionsSnapshot.size} documents`)
    } catch (e) {
      console.log('token_transactions: Collection does not exist')
    }
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      console.log(`users: ${usersSnapshot.size} documents`)
    } catch (e) {
      console.log('users: Collection does not exist')
    }
    
    // Analyze the relationship
    console.log('\n=== RELATIONSHIP ANALYSIS ===')
    
    const markets = marketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    const commitments = commitmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    markets.forEach((market: any) => {
      console.log(`\nMarket: "${market.title}"`)
      console.log(`  Market ID: ${market.id}`)
      
      if (market.options) {
        console.log(`  Market Options:`)
        market.options.forEach((option: any, idx: number) => {
          console.log(`    ${idx + 1}. "${option.name || option.text}" (ID: ${option.id})`)
        })
      }
      
      const marketCommitments = commitments.filter((c: any) => c.predictionId === market.id)
      console.log(`  Commitments (${marketCommitments.length}):`)
      
      marketCommitments.forEach((commitment: any, idx: number) => {
        console.log(`    ${idx + 1}. Position: "${commitment.position}" | Tokens: ${commitment.tokensCommitted}`)
      })
      
      // Check for matches
      if (market.options && marketCommitments.length > 0) {
        console.log(`  Matching Analysis:`)
        market.options.forEach((option: any) => {
          const matchingCommitments = marketCommitments.filter((c: any) => 
            c.position === option.id || 
            c.position === option.name || 
            c.position === option.text
          )
          
          if (matchingCommitments.length > 0) {
            const totalTokens = matchingCommitments.reduce((sum: number, c: any) => sum + c.tokensCommitted, 0)
            console.log(`    ✅ Option "${option.name || option.text}" matches ${matchingCommitments.length} commitments (${totalTokens} tokens)`)
          } else {
            console.log(`    ❌ Option "${option.name || option.text}" has no matching commitments`)
          }
        })
        
        // Check for unmatched commitments
        const unmatchedCommitments = marketCommitments.filter((c: any) => {
          return !market.options.some((opt: any) => 
            c.position === opt.id || 
            c.position === opt.name || 
            c.position === opt.text
          )
        })
        
        if (unmatchedCommitments.length > 0) {
          console.log(`  Unmatched Commitments:`)
          unmatchedCommitments.forEach((c: any, idx: number) => {
            console.log(`    ${idx + 1}. Position: "${c.position}" | Tokens: ${c.tokensCommitted}`)
          })
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Error examining database:', error)
  }
}

// Run the examination
examineDatabase().then(() => {
  console.log('\n✅ Database examination complete!')
}).catch(error => {
  console.error('💥 Examination failed:', error)
})