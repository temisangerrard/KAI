/**
 * Authentication Service for KAI Platform
 * Uses Firebase Auth for authentication and Firestore for user profiles
 */

import { FirebaseAuthService, UserProfile, AUTH_ERROR_CODES } from './firebase-auth'
import { User } from 'firebase/auth'

export interface AuthUser {
  id: string
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

// Convert Firebase User + UserProfile to AuthUser
function convertToAuthUser(firebaseUser: User, profile: UserProfile): AuthUser {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || profile.email,
    displayName: firebaseUser.displayName || profile.displayName,
    profileImage: firebaseUser.photoURL || profile.photoURL,
    tokenBalance: profile.tokenBalance,
    hasCompletedOnboarding: true, // Set based on your onboarding logic
    level: profile.level,
    totalPredictions: profile.totalPredictions,
    correctPredictions: profile.correctPredictions,
    streak: profile.streak,
    createdAt: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: profile.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    bio: profile.bio,
    location: profile.location,
    joinDate: profile.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    stats: {
      predictionsCount: profile.totalPredictions,
      marketsCreated: 0, // This would need to be calculated from actual data
      winRate: profile.totalPredictions > 0 ? (profile.correctPredictions / profile.totalPredictions) * 100 : 0,
      tokensEarned: 0, // This would need to be calculated from transaction history
    },
    predictions: [], // This would need to be fetched separately
    marketsCreated: [], // This would need to be fetched separately
  }
}

class AuthService {
  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const { user: firebaseUser, error } = await FirebaseAuthService.signUp(
      credentials.email,
      credentials.password,
      credentials.displayName
    )

    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }

    if (!firebaseUser) {
      throw new Error('Registration failed')
    }

    // Get the created user profile
    const profile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
    if (!profile) {
      throw new Error('Failed to create user profile')
    }

    return {
      user: convertToAuthUser(firebaseUser, profile)
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { user: firebaseUser, error } = await FirebaseAuthService.signIn(
      credentials.email,
      credentials.password
    )

    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }

    if (!firebaseUser) {
      throw new Error('Login failed')
    }

    // Get user profile
    const profile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
    if (!profile) {
      throw new Error('User profile not found')
    }

    return {
      user: convertToAuthUser(firebaseUser, profile)
    }
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(): Promise<AuthResponse> {
    const { user: firebaseUser, error } = await FirebaseAuthService.signInWithGoogle()

    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }

    if (!firebaseUser) {
      throw new Error('Google login failed')
    }

    const profile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
    if (!profile) {
      throw new Error('User profile not found')
    }

    return {
      user: convertToAuthUser(firebaseUser, profile)
    }
  }

  /**
   * Login with Twitter
   */
  async loginWithTwitter(): Promise<AuthResponse> {
    const { user: firebaseUser, error } = await FirebaseAuthService.signInWithTwitter()

    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }

    if (!firebaseUser) {
      throw new Error('Twitter login failed')
    }

    const profile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
    if (!profile) {
      throw new Error('User profile not found')
    }

    return {
      user: convertToAuthUser(firebaseUser, profile)
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const { error } = await FirebaseAuthService.signOut()
    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const firebaseUser = FirebaseAuthService.getCurrentUser()
    
    if (!firebaseUser) {
      return null
    }

    const profile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
    if (!profile) {
      return null
    }

    return convertToAuthUser(firebaseUser, profile)
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
    const firebaseUser = FirebaseAuthService.getCurrentUser()
    
    if (!firebaseUser) {
      throw new Error('User not authenticated')
    }

    // Convert AuthUser updates to UserProfile updates
    const profileUpdates: Partial<UserProfile> = {}
    
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

    const { error } = await FirebaseAuthService.updateUserProfile(firebaseUser.uid, profileUpdates)
    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }

    // Get updated profile
    const updatedProfile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
    if (!updatedProfile) {
      throw new Error('Failed to fetch updated profile')
    }

    return convertToAuthUser(firebaseUser, updatedProfile)
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await FirebaseAuthService.resetPassword(email)
    if (error) {
      throw new Error(this.getErrorMessage(error.code))
    }
  }

  /**
   * Set up auth state listener
   */
  onAuthStateChanged(callback: (user: AuthUser | null) => void) {
    return FirebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await FirebaseAuthService.getUserProfile(firebaseUser.uid)
        if (profile) {
          callback(convertToAuthUser(firebaseUser, profile))
        } else {
          callback(null)
        }
      } else {
        callback(null)
      }
    })
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE:
        return 'An account with this email already exists'
      case AUTH_ERROR_CODES.WEAK_PASSWORD:
        return 'Password should be at least 6 characters'
      case AUTH_ERROR_CODES.INVALID_EMAIL:
        return 'Please enter a valid email address'
      case AUTH_ERROR_CODES.USER_NOT_FOUND:
        return 'No account found with this email'
      case AUTH_ERROR_CODES.WRONG_PASSWORD:
        return 'Incorrect password'
      case AUTH_ERROR_CODES.TOO_MANY_REQUESTS:
        return 'Too many failed attempts. Please try again later'
      case AUTH_ERROR_CODES.POPUP_CLOSED:
        return 'Sign-in popup was closed'
      case AUTH_ERROR_CODES.CANCELLED:
        return 'Sign-in was cancelled'
      default:
        return 'An error occurred. Please try again'
    }
  }
}

export const authService = new AuthService()
