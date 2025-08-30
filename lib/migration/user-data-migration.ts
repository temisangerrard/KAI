/**
 * User Data Migration Utility for CDP Integration
 * 
 * This utility helps migrate existing Firebase Auth users to CDP wallet-based authentication
 * by linking their existing data to their new wallet address.
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/db/database"
import type { AuthUser } from "@/lib/auth/auth-service"

interface MigrationResult {
  success: boolean
  message: string
  migratedData?: {
    userProfile?: boolean
    predictions?: number
    tokenTransactions?: number
    markets?: number
  }
}

/**
 * Migrate existing user data from Firebase UID to CDP wallet address
 */
export async function migrateUserDataToCDP(
  email: string,
  walletAddress: string,
  displayName?: string
): Promise<MigrationResult> {
  try {
    console.log('🔄 Starting user data migration:', { email, walletAddress })
    
    // Step 1: Look for existing user by email in the users collection
    const usersRef = collection(db, 'users')
    const emailQuery = query(usersRef, where('email', '==', email))
    const emailSnapshot = await getDocs(emailQuery)
    
    let existingUserData = null
    let existingUserId = null
    
    if (!emailSnapshot.empty) {
      const userDoc = emailSnapshot.docs[0]
      existingUserData = userDoc.data()
      existingUserId = userDoc.id
      console.log('✅ Found existing user data:', { userId: existingUserId, email })
    } else {
      console.log('ℹ️ No existing user found with email:', email)
      return {
        success: true,
        message: 'No existing data to migrate - creating fresh profile'
      }
    }
    
    // Step 2: Check if wallet address already has a profile
    const walletUserRef = doc(db, 'users', walletAddress)
    const walletUserSnap = await getDoc(walletUserRef)
    
    if (walletUserSnap.exists()) {
      console.log('ℹ️ Wallet address already has a profile')
      return {
        success: true,
        message: 'Wallet address already has a profile - no migration needed'
      }
    }
    
    // Step 3: Create new user profile with wallet address as ID, preserving existing data
    const migratedUserData = {
      address: walletAddress,
      email: email,
      displayName: displayName || existingUserData?.displayName || email.split('@')[0],
      photoURL: existingUserData?.photoURL,
      createdAt: existingUserData?.createdAt || new Date(),
      lastLoginAt: new Date(),
      tokenBalance: existingUserData?.tokenBalance || 2500,
      level: existingUserData?.level || 1,
      totalPredictions: existingUserData?.totalPredictions || 0,
      correctPredictions: existingUserData?.correctPredictions || 0,
      streak: existingUserData?.streak || 0,
      bio: existingUserData?.bio,
      location: existingUserData?.location,
      // Preserve any other existing fields
      ...existingUserData
    }
    
    await setDoc(walletUserRef, migratedUserData)
    console.log('✅ Created new user profile with wallet address')
    
    // Step 4: Migrate related data (predictions, transactions, etc.)
    const batch = writeBatch(db)
    let migratedCounts = {
      predictions: 0,
      tokenTransactions: 0,
      markets: 0
    }
    
    // Migrate predictions
    if (existingUserId) {
      const predictionsRef = collection(db, 'predictions')
      const predictionsQuery = query(predictionsRef, where('userId', '==', existingUserId))
      const predictionsSnapshot = await getDocs(predictionsQuery)
      
      predictionsSnapshot.docs.forEach(predictionDoc => {
        const predictionData = predictionDoc.data()
        batch.update(predictionDoc.ref, {
          userId: walletAddress, // Update to use wallet address
          userAddress: walletAddress, // Add wallet address field
          migratedFrom: existingUserId // Track migration
        })
        migratedCounts.predictions++
      })
      
      // Migrate token transactions
      const transactionsRef = collection(db, 'token_transactions')
      const transactionsQuery = query(transactionsRef, where('userId', '==', existingUserId))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      
      transactionsSnapshot.docs.forEach(transactionDoc => {
        const transactionData = transactionDoc.data()
        batch.update(transactionDoc.ref, {
          userId: walletAddress,
          userAddress: walletAddress,
          migratedFrom: existingUserId
        })
        migratedCounts.tokenTransactions++
      })
      
      // Migrate created markets
      const marketsRef = collection(db, 'markets')
      const marketsQuery = query(marketsRef, where('createdBy', '==', existingUserId))
      const marketsSnapshot = await getDocs(marketsQuery)
      
      marketsSnapshot.docs.forEach(marketDoc => {
        const marketData = marketDoc.data()
        batch.update(marketDoc.ref, {
          createdBy: walletAddress,
          createdByAddress: walletAddress,
          migratedFrom: existingUserId
        })
        migratedCounts.markets++
      })
      
      // Commit all updates
      await batch.commit()
      console.log('✅ Migrated related data:', migratedCounts)
    }
    
    return {
      success: true,
      message: `Successfully migrated user data to wallet address ${walletAddress}`,
      migratedData: {
        userProfile: true,
        ...migratedCounts
      }
    }
    
  } catch (error) {
    console.error('💥 Error during user data migration:', error)
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Check if a user needs data migration
 */
export async function checkMigrationNeeded(email: string, walletAddress: string): Promise<boolean> {
  try {
    // Check if wallet address already has a profile
    const walletUserRef = doc(db, 'users', walletAddress)
    const walletUserSnap = await getDoc(walletUserRef)
    
    if (walletUserSnap.exists()) {
      return false // Already migrated or new user
    }
    
    // Check if there's existing data with this email
    const usersRef = collection(db, 'users')
    const emailQuery = query(usersRef, where('email', '==', email))
    const emailSnapshot = await getDocs(emailQuery)
    
    return !emailSnapshot.empty // Migration needed if existing data found
  } catch (error) {
    console.error('Error checking migration status:', error)
    return false
  }
}