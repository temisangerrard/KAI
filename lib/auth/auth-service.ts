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

      // Convert profile to AuthUser format, including wallet address
      return {
        id: firebaseUid, // Keep Firebase UID as primary ID
        address: address, // Add wallet address for CDP compatibility
        email: profile.email,
        displayName: profile.displayName,
        profileImage: profile.photoURL,
        tokenBalance: profile.tokenBalance,
        hasCompletedOnboarding: true,
        level: profile.level,
        totalPredictions: profile.totalPredictions,
        correctPredictions: profile.correctPredictions,
        streak: profile.streak,
        createdAt: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: profile.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        bio: profile.bio,
        location: profile.location,
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

      // Create user profile in Firestore using Firebase UID as document ID (existing structure)
      const userRef = safeDoc('users', firebaseUid)
      if (!userRef) throw new Error('Failed to create user document reference')
      const profileData: UserProfile = {
        address: address, // Store wallet address in profile
        email: email,
        displayName: displayName || email.split('@')[0],
        photoURL: undefined,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        tokenBalance: 2500, // Starting tokens
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0,
        bio: undefined,
        location: undefined,
      }

      await setDoc(userRef, profileData)
      console.log('✅ Created user profile with Firebase UID:', firebaseUid)
      
      // Convert to AuthUser format
      return {
        id: firebaseUid, // Firebase UID for compatibility
        address: address, // Wallet address for CDP
        email: email,
        displayName: displayName || email.split('@')[0],
        profileImage: undefined,
        tokenBalance: 2500, // Starting tokens
        hasCompletedOnboarding: true,
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bio: undefined,
        location: undefined,
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

      // Update user profile in Firestore
      const userRef = safeDoc('users', address)
      if (!userRef) throw new Error('Failed to create user document reference')
      
      await updateDoc(userRef, profileUpdates)

      // Get updated profile
      const userSnap = await getDoc(userRef)
      if (!userSnap.exists()) {
        throw new Error('Failed to fetch updated profile')
      }

      const updatedProfile = userSnap.data() as UserProfile

      return {
        address: address,
        email: updatedProfile.email,
        displayName: updatedProfile.displayName,
        profileImage: updatedProfile.photoURL,
        tokenBalance: updatedProfile.tokenBalance,
        hasCompletedOnboarding: true,
        level: updatedProfile.level,
        totalPredictions: updatedProfile.totalPredictions,
        correctPredictions: updatedProfile.correctPredictions,
        streak: updatedProfile.streak,
        createdAt: updatedProfile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: updatedProfile.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        bio: updatedProfile.bio,
        location: updatedProfile.location,
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
}

export const authService = new AuthService()
