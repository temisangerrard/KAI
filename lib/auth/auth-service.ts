/**
 * Authentication Service for KAI Platform
 * Uses CDP for authentication and Firestore for user profiles
 */

import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/db/database"
import { safeDoc, requireFirebase } from "@/lib/utils/firebase-safe"

export interface AuthUser {
  id: string // Firebase UID (for compatibility with existing services)
  address: string // Wallet address (for CDP integration)
  email: string
  displayName: string
  profileImage?: string
  tokenBalance: number
  hasCompletedOnboarding: boolean
  level: number
  totalPredictions: number
  correctPredictions: number
  streak: number
  createdAt: string
  updatedAt: string
  bio?: string
  location?: string
  joinDate?: string
  isInitialized: boolean // CDP initialization status
  stats?: {
    predictionsCount: number
    marketsCreated: number
    winRate: number
    tokensEarned: number
  }
  predictions?: any[]
  marketsCreated?: any[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  displayName: string
}

export interface AuthResponse {
  user: AuthUser
}

// User profile interface for Firestore
interface UserProfile {
  address: string // Wallet address (document ID)
  email: string
  displayName: string
  photoURL?: string
  createdAt: any
  lastLoginAt: any
  tokenBalance: number
  level: number
  totalPredictions: number
  correctPredictions: number
  streak: number
  bio?: string
  location?: string
}

class AuthService {
  /**
   * Get user by wallet address (for CDP integration)
   * Uses wallet-to-UID mapping to maintain compatibility with existing data structure
   */
  async getUserByAddress(address: string): Promise<AuthUser | null> {
    try {
      // Validate address parameter
      if (!address || typeof address !== 'string') {
        console.error('Invalid address provided to getUserByAddress:', address)
        return null
      }

      requireFirebase('getUserByAddress')
      // Get Firebase UID from wallet address mapping
      const { WalletUidMappingService } = await import('@/lib/services/wallet-uid-mapping')
      const firebaseUid = await WalletUidMappingService.getFirebaseUid(address)
      
      if (!firebaseUid) {
        console.log('No Firebase UID mapping found for wallet address:', address)
        return null
      }

      // Get user profile from Firestore using Firebase UID (existing structure)
      const userRef = safeDoc('users', firebaseUid)
      if (!userRef) return null
      
      const userSnap = await getDoc(userRef)
      
      if (!userSnap.exists()) {
        console.log('No user profile found for Firebase UID:', firebaseUid)
        return null
      }

      const profile = userSnap.data() as UserProfile

      // Convert profile to AuthUser format, including wallet address (avoid undefined values)
      const authUser: any = {
        id: firebaseUid, // Keep Firebase UID as primary ID
        address: address, // Add wallet address for CDP compatibility
        email: profile.email,
        displayName: profile.displayName,
        tokenBalance: profile.tokenBalance,
        hasCompletedOnboarding: true,
        level: profile.level,
        totalPredictions: profile.totalPredictions,
        correctPredictions: profile.correctPredictions,
        streak: profile.streak,
        createdAt: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: profile.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        joinDate: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isInitialized: true,
        stats: {
          predictionsCount: profile.totalPredictions,
          marketsCreated: 0,
          winRate: profile.totalPredictions > 0 ? (profile.correctPredictions / profile.totalPredictions) * 100 : 0,
          tokensEarned: 0,
        },
        predictions: [],
        marketsCreated: [],
      }
      
      // Only add optional fields if they have values
      if (profile.photoURL) {
        authUser.profileImage = profile.photoURL;
      }
      if (profile.bio) {
        authUser.bio = profile.bio;
      }
      if (profile.location) {
        authUser.location = profile.location;
      }
      
      return authUser
    } catch (error) {
      console.error('Error getting user by address:', error)
      return null
    }
  }

  /**
   * Create user from CDP data (for new CDP users)
   * Uses wallet-to-UID mapping to maintain compatibility with existing data structure
   */
  async createUserFromCDP(address: string, email: string, displayName?: string): Promise<AuthUser> {
    try {
      // Validate parameters
      if (!address || typeof address !== 'string') {
        throw new Error('Invalid address provided to createUserFromCDP')
      }
      if (!email || typeof email !== 'string') {
        throw new Error('Invalid email provided to createUserFromCDP')
      }

      requireFirebase('createUserFromCDP')
      // Get or create wallet-to-UID mapping
      const { WalletUidMappingService } = await import('@/lib/services/wallet-uid-mapping')
      const { firebaseUid, isNewMapping } = await WalletUidMappingService.getOrCreateMapping(address, email)
      
      console.log('🔗 Wallet-to-UID mapping:', { address, firebaseUid, isNewMapping })

      // Check if user profile already exists
      const existingUser = await this.getUserByAddress(address)
      if (existingUser) {
        console.log('✅ User profile already exists, returning existing user')
        return existingUser
      }

      // Double-check if user profile exists using the Firebase UID directly
      // This handles cases where the mapping exists but getUserByAddress failed
      const userRef = safeDoc('users', firebaseUid)
      if (userRef) {
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          console.log('✅ Found existing user profile by Firebase UID, returning existing user')
          const profile = userSnap.data() as UserProfile
          
          // Convert to AuthUser format and return (avoid undefined values)
          const authUser: any = {
            id: firebaseUid,
            address: address,
            email: profile.email,
            displayName: profile.displayName,
            tokenBalance: profile.tokenBalance,
            hasCompletedOnboarding: true,
            level: profile.level,
            totalPredictions: profile.totalPredictions,
            correctPredictions: profile.correctPredictions,
            streak: profile.streak,
            createdAt: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: profile.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            joinDate: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            isInitialized: true,
            stats: {
              predictionsCount: profile.totalPredictions,
              marketsCreated: 0,
              winRate: profile.totalPredictions > 0 ? (profile.correctPredictions / profile.totalPredictions) * 100 : 0,
              tokensEarned: 0,
            },
            predictions: [],
            marketsCreated: [],
          }
          
          // Only add optional fields if they have values
          if (profile.photoURL) {
            authUser.profileImage = profile.photoURL;
          }
          if (profile.bio) {
            authUser.bio = profile.bio;
          }
          if (profile.location) {
            authUser.location = profile.location;
          }
          
          return authUser
        }
      }

      // Create user profile in Firestore using Firebase UID as document ID (existing structure)
      console.log('🔧 Creating user profile in Firestore...')
      console.log('   Firebase UID:', firebaseUid)
      console.log('   Wallet Address:', address)
      console.log('   Email:', email)
      
      const newUserRef = safeDoc('users', firebaseUid)
      if (!newUserRef) {
        const error = 'Failed to create user document reference'
        console.error('❌', error)
        throw new Error(error)
      }
      
      const profileData: UserProfile = {
        address: address, // Store wallet address in profile
        email: email,
        displayName: displayName || email.split('@')[0],
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        tokenBalance: 2500, // Starting tokens
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0,
      }
      
      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      // photoURL, bio, and location are omitted if undefined

      console.log('🔧 Profile data to be saved:', {
        address: profileData.address,
        email: profileData.email,
        displayName: profileData.displayName,
        tokenBalance: profileData.tokenBalance
      })

      await setDoc(newUserRef, profileData)
      console.log('✅ Created user profile with Firebase UID:', firebaseUid)
      
      // Verify the user was created successfully
      const verificationSnap = await getDoc(newUserRef)
      if (!verificationSnap.exists()) {
        const error = 'User profile creation verification failed - document does not exist after creation'
        console.error('❌', error)
        throw new Error(error)
      }
      
      console.log('✅ User profile creation verified successfully')
      
      // Convert to AuthUser format (don't set undefined values)
      const authUser: any = {
        id: firebaseUid, // Firebase UID for compatibility
        address: address, // Wallet address for CDP
        email: email,
        displayName: displayName || email.split('@')[0],
        tokenBalance: 2500, // Starting tokens
        hasCompletedOnboarding: true,
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        joinDate: new Date().toISOString(),
        isInitialized: true,
        stats: {
          predictionsCount: 0,
          marketsCreated: 0,
          winRate: 0,
          tokensEarned: 0,
        },
        predictions: [],
        marketsCreated: [],
      }
      
      // Don't set profileImage, bio, or location if they would be undefined
      return authUser
    } catch (error) {
      console.error('Error creating user from CDP:', error)
      throw error
    }
  }

  /**
   * Register a new user (CDP handles this automatically)
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    // CDP handles registration automatically when user signs in
    // This method is kept for backward compatibility but doesn't do anything
    throw new Error('Registration is handled automatically by CDP')
  }

  /**
   * Login user (CDP handles this automatically)
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // CDP handles login automatically when user signs in
    // This method is kept for backward compatibility but doesn't do anything
    throw new Error('Login is handled automatically by CDP')
  }

  /**
   * Login with Google (not supported with CDP)
   */
  async loginWithGoogle(): Promise<AuthResponse> {
    throw new Error('Google login not supported with CDP')
  }

  /**
   * Login with Twitter (not supported with CDP)
   */
  async loginWithTwitter(): Promise<AuthResponse> {
    throw new Error('Twitter login not supported with CDP')
  }

  /**
   * Logout user (handled by CDP context)
   */
  async logout(): Promise<void> {
    // Logout is handled by the CDP context
    console.log('Logout handled by CDP context')
  }

  /**
   * Get current authenticated user (handled by CDP context)
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    // Current user is handled by the CDP context
    return null
  }

  /**
   * Update user profile by wallet address (for CDP integration)
   */
  async updateProfileByAddress(address: string, updates: Partial<AuthUser>): Promise<AuthUser> {
    try {
      requireFirebase('updateProfileByAddress')
      
      // Get Firebase UID from wallet address mapping first
      const { WalletUidMappingService } = await import('@/lib/services/wallet-uid-mapping')
      const firebaseUid = await WalletUidMappingService.getFirebaseUid(address)
      
      if (!firebaseUid) {
        throw new Error('No Firebase UID mapping found for wallet address')
      }
      
      // Convert AuthUser updates to UserProfile updates
      const profileUpdates: any = {
        lastLoginAt: serverTimestamp()
      }
      
      if (updates.displayName !== undefined) {
        profileUpdates.displayName = updates.displayName
      }
      if (updates.tokenBalance !== undefined) {
        profileUpdates.tokenBalance = updates.tokenBalance
      }
      if (updates.level !== undefined) {
        profileUpdates.level = updates.level
      }
      if (updates.totalPredictions !== undefined) {
        profileUpdates.totalPredictions = updates.totalPredictions
      }
      if (updates.correctPredictions !== undefined) {
        profileUpdates.correctPredictions = updates.correctPredictions
      }
      if (updates.streak !== undefined) {
        profileUpdates.streak = updates.streak
      }
      if (updates.bio !== undefined) {
        profileUpdates.bio = updates.bio
      }
      if (updates.location !== undefined) {
        profileUpdates.location = updates.location
      }

      // Update user profile in Firestore using Firebase UID as document ID
      const userRef = safeDoc('users', firebaseUid)
      if (!userRef) throw new Error('Failed to create user document reference')
      
      await updateDoc(userRef, profileUpdates)

      // Get updated profile
      const userSnap = await getDoc(userRef)
      if (!userSnap.exists()) {
        throw new Error('Failed to fetch updated profile')
      }

      const updatedProfile = userSnap.data() as UserProfile

      const authUser: any = {
        id: firebaseUid, // Include the Firebase UID
        address: address,
        email: updatedProfile.email,
        displayName: updatedProfile.displayName,
        tokenBalance: updatedProfile.tokenBalance,
        hasCompletedOnboarding: true,
        level: updatedProfile.level,
        totalPredictions: updatedProfile.totalPredictions,
        correctPredictions: updatedProfile.correctPredictions,
        streak: updatedProfile.streak,
        createdAt: updatedProfile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: updatedProfile.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        joinDate: updatedProfile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isInitialized: true,
        stats: {
          predictionsCount: updatedProfile.totalPredictions,
          marketsCreated: 0,
          winRate: updatedProfile.totalPredictions > 0 ? (updatedProfile.correctPredictions / updatedProfile.totalPredictions) * 100 : 0,
          tokensEarned: 0,
        },
        predictions: [],
        marketsCreated: [],
      }
      
      // Only add optional fields if they have values
      if (updatedProfile.photoURL) {
        authUser.profileImage = updatedProfile.photoURL;
      }
      if (updatedProfile.bio) {
        authUser.bio = updatedProfile.bio;
      }
      if (updatedProfile.location) {
        authUser.location = updatedProfile.location;
      }
      
      return authUser
    } catch (error) {
      console.error('Error updating profile by address:', error)
      throw error
    }
  }

  /**
   * Reset password (not supported with CDP)
   */
  async resetPassword(email: string): Promise<void> {
    throw new Error('Password reset not supported with CDP')
  }

  /**
   * Set up auth state listener (handled by CDP context)
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    // Auth state changes are handled by the CDP context
    console.log('Auth state changes handled by CDP context')
    return () => {} // Return empty unsubscribe function
  }

  /**
   * Fix a specific orphaned CDP user by wallet address
   * This is useful for fixing individual users who got stuck
   */
  async fixOrphanedCDPUser(walletAddress: string): Promise<boolean> {
    try {
      requireFirebase('fixOrphanedCDPUser')
      
      console.log(`🔧 Attempting to fix orphaned CDP user: ${walletAddress}`)
      
      const { WalletUidMappingService } = await import('@/lib/services/wallet-uid-mapping')
      const mapping = await WalletUidMappingService.getMapping(walletAddress)
      
      if (!mapping) {
        console.log('❌ No wallet mapping found for address:', walletAddress)
        return false
      }
      
      // Check if user profile already exists
      const userRef = safeDoc('users', mapping.firebaseUid)
      if (!userRef) {
        console.error('❌ Failed to create user ref for Firebase UID:', mapping.firebaseUid)
        return false
      }
      
      const userDoc = await getDoc(userRef)
      if (userDoc.exists()) {
        console.log('✅ User profile already exists, no fix needed')
        return true
      }
      
      // Create the missing user profile
      const profileData: UserProfile = {
        address: mapping.walletAddress,
        email: mapping.email,
        displayName: mapping.email.split('@')[0],
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        tokenBalance: 2500, // Starting tokens
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0,
      }
      
      // Only add optional fields if they have values (Firestore doesn't allow undefined)

      await setDoc(userRef, profileData)
      console.log(`✅ Successfully fixed orphaned user: ${mapping.email}`)
      
      return true
      
    } catch (error) {
      console.error(`❌ Failed to fix orphaned user ${walletAddress}:`, error)
      return false
    }
  }

  /**
   * Recover orphaned CDP users (mappings without user profiles)
   * This can be used to fix users who got stuck in the creation process
   */
  async recoverOrphanedCDPUsers(): Promise<{ recovered: number; failed: number }> {
    try {
      requireFirebase('recoverOrphanedCDPUsers')
      
      const { WalletUidMappingService } = await import('@/lib/services/wallet-uid-mapping')
      const orphanedMappings = await WalletUidMappingService.findOrphanedMappings()
      
      console.log(`🔧 Attempting to recover ${orphanedMappings.length} orphaned CDP users`)
      
      let recovered = 0
      let failed = 0
      
      for (const mapping of orphanedMappings) {
        try {
          console.log(`🔧 Recovering user: ${mapping.email} (${mapping.walletAddress})`)
          console.log(`   Firebase UID: ${mapping.firebaseUid}`)
          
          // Create user profile using the existing mapping
          const userRef = safeDoc('users', mapping.firebaseUid)
          if (!userRef) {
            const errorMsg = `Failed to create user ref for ${mapping.firebaseUid}`
            console.error(errorMsg)
            failed++
            continue
          }
          
          const profileData: UserProfile = {
            address: mapping.walletAddress,
            email: mapping.email,
            displayName: mapping.email.split('@')[0],
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            tokenBalance: 2500, // Starting tokens
            level: 1,
            totalPredictions: 0,
            correctPredictions: 0,
            streak: 0,
          }
          
          // Only add optional fields if they have values (Firestore doesn't allow undefined)

          console.log(`   Creating user profile with data:`, {
            address: profileData.address,
            email: profileData.email,
            displayName: profileData.displayName,
            tokenBalance: profileData.tokenBalance
          })

          await setDoc(userRef, profileData)
          console.log(`✅ Recovered user profile for ${mapping.email}`)
          recovered++
          
        } catch (error) {
          console.error(`❌ Failed to recover user ${mapping.email}:`, error)
          console.error(`   Error details:`, {
            name: error.name,
            message: error.message,
            stack: error.stack
          })
          failed++
        }
      }
      
      console.log(`🎉 Recovery complete: ${recovered} recovered, ${failed} failed`)
      return { recovered, failed }
      
    } catch (error) {
      console.error('Error during orphaned user recovery:', error)
      throw error
    }
  }
}

export const authService = new AuthService()
