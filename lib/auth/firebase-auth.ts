import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  TwitterAuthProvider,
  FacebookAuthProvider,
  AuthError
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/db/database"

// Auth providers
const googleProvider = new GoogleAuthProvider()
const twitterProvider = new TwitterAuthProvider()
const facebookProvider = new FacebookAuthProvider()

// User profile interface
export interface UserProfile {
  uid: string
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
  // Smart account fields
  smartAccountAddress?: string
  walletAddress?: string
  creationMethod?: 'email' | 'wallet'
  hasSmartAccount?: boolean
  isSmartAccount?: boolean
}

// Auth service class
export class FirebaseAuthService {
  // Sign up with email and password
  static async signUp(email: string, password: string, displayName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update user profile
      await updateProfile(user, { displayName })

      // Create user document in Firestore
      await this.createUserProfile(user, { displayName })

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Sign in with email and password
  static async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Update last login time
      await this.updateLastLogin(userCredential.user.uid)
      
      return { user: userCredential.user, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Sign in with Google
  static async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      // Try to check if user profile exists, create if not (handle offline gracefully)
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (!userDoc.exists()) {
          await this.createUserProfile(user)
        } else {
          await this.updateLastLogin(user.uid)
        }
      } catch (firestoreError) {
        console.warn('Firestore unavailable during Google sign-in, continuing with auth only')
      }

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Sign in with Twitter
  static async signInWithTwitter() {
    try {
      const result = await signInWithPopup(auth, twitterProvider)
      const user = result.user

      // Check if user profile exists, create if not
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        await this.createUserProfile(user)
      } else {
        await this.updateLastLogin(user.uid)
      }

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Sign in with Facebook
  static async signInWithFacebook() {
    try {
      const result = await signInWithPopup(auth, facebookProvider)
      const user = result.user

      // Check if user profile exists, create if not
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        await this.createUserProfile(user)
      } else {
        await this.updateLastLogin(user.uid)
      }

      return { user, error: null }
    } catch (error) {
      return { user: null, error: error as AuthError }
    }
  }

  // Sign out
  static async signOut() {
    try {
      await signOut(auth)
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email)
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  // Create user profile in Firestore
  static async createUserProfile(user: User, additionalData?: { displayName?: string }) {
    try {
      const userProfile: any = {
        uid: user.uid,
        email: user.email || "",
        displayName: additionalData?.displayName || user.displayName || "",
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        tokenBalance: 2500, // Starting tokens as mentioned in landing page
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0
      }
      
      // Only add photoURL if it has a value (Firestore doesn't allow undefined)
      if (user.photoURL) {
        userProfile.photoURL = user.photoURL;
      }

      console.log('Creating user profile in Firestore:', userProfile)
      await setDoc(doc(db, "users", user.uid), userProfile)
      console.log('User profile created successfully')
      return userProfile
    } catch (error) {
      console.warn('Firestore unavailable, creating local user profile:', error.message)
      // Return a local profile when Firestore is offline
      const localProfile: any = {
        uid: user.uid,
        email: user.email || "",
        displayName: additionalData?.displayName || user.displayName || "",
        createdAt: new Date(),
        lastLoginAt: new Date(),
        tokenBalance: 2500,
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0
      }
      
      // Only add photoURL if it has a value
      if (user.photoURL) {
        localProfile.photoURL = user.photoURL;
      }
      
      return localProfile
    }
  }

  // Update last login time
  static async updateLastLogin(uid: string) {
    try {
      await updateDoc(doc(db, "users", uid), {
        lastLoginAt: serverTimestamp()
      })
    } catch (error) {
      console.warn('Could not update last login time (Firestore offline):', error.message)
      // Silently fail when offline
    }
  }

  // Get user profile from Firestore
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching user profile for UID:', uid)
      const userDoc = await getDoc(doc(db, "users", uid))
      if (userDoc.exists()) {
        console.log('User profile found:', userDoc.data())
        return userDoc.data() as UserProfile
      }
      console.log('User profile not found, creating default profile')
      // Return a default profile if not found
      return this.createDefaultProfile(uid)
    } catch (error) {
      console.warn("Firestore unavailable, creating default profile:", error.message)
      // Return a default profile when Firestore is offline
      return this.createDefaultProfile(uid)
    }
  }

  // Get user profile by wallet address (for CDP integration)
  static async getUserProfileByAddress(address: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching user profile for wallet address:', address)
      const userDoc = await getDoc(doc(db, "users", address))
      if (userDoc.exists()) {
        console.log('User profile found:', userDoc.data())
        return userDoc.data() as UserProfile
      }
      console.log('User profile not found for address:', address)
      return null
    } catch (error) {
      console.warn("Error fetching user profile by address:", error.message)
      return null
    }
  }

  // Create user profile from CDP data (for new CDP users)
  static async createUserProfileFromCDP(address: string, email: string, displayName?: string): Promise<UserProfile> {
    try {
      const userProfile: any = {
        uid: address, // Use wallet address as UID for consistency
        email: email,
        displayName: displayName || email.split('@')[0],
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        tokenBalance: 2500, // Starting tokens
        level: 1,
        totalPredictions: 0,
        correctPredictions: 0,
        streak: 0,
        // CDP-specific fields
        walletAddress: address,
        creationMethod: 'email',
        hasSmartAccount: true,
        isSmartAccount: true
      }
      
      // Don't add photoURL field at all since it would be undefined

      console.log('Creating CDP user profile in Firestore:', userProfile)
      await setDoc(doc(db, "users", address), userProfile)
      console.log('CDP user profile created successfully')
      return userProfile
    } catch (error) {
      console.error('Error creating CDP user profile:', error)
      throw error
    }
  }

  // Create a default user profile for offline mode
  static createDefaultProfile(uid: string): UserProfile {
    const currentUser = auth.currentUser
    const profile: any = {
      uid,
      email: currentUser?.email || "",
      displayName: currentUser?.displayName || "User",
      createdAt: new Date(),
      lastLoginAt: new Date(),
      tokenBalance: 2500,
      level: 1,
      totalPredictions: 0,
      correctPredictions: 0,
      streak: 0
    }
    
    // Only add photoURL if it has a value
    if (currentUser?.photoURL) {
      profile.photoURL = currentUser.photoURL;
    }
    
    return profile
  }

  // Update user profile
  static async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    try {
      await updateDoc(doc(db, "users", uid), updates)
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  // Update user profile by wallet address (for CDP integration)
  static async updateUserProfileByAddress(address: string, updates: Partial<UserProfile>) {
    try {
      await updateDoc(doc(db, "users", address), updates)
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  // Auth state observer
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  }

  // Get current user
  static getCurrentUser(): User | null {
    return auth.currentUser
  }
}

// Export auth error codes for better error handling
export const AUTH_ERROR_CODES = {
  EMAIL_ALREADY_IN_USE: 'auth/email-already-in-use',
  WEAK_PASSWORD: 'auth/weak-password',
  INVALID_EMAIL: 'auth/invalid-email',
  USER_NOT_FOUND: 'auth/user-not-found',
  WRONG_PASSWORD: 'auth/wrong-password',
  TOO_MANY_REQUESTS: 'auth/too-many-requests',
  POPUP_CLOSED: 'auth/popup-closed-by-user',
  CANCELLED: 'auth/cancelled-popup-request'
} as const