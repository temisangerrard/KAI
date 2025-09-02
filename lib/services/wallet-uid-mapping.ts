/**
 * Wallet to UID Mapping Service
 * 
 * This service creates a bridge between CDP wallet addresses and existing Firebase UIDs,
 * allowing us to keep all existing data structure while adding CDP authentication.
 */

import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/db/database"
import { safeCollection, safeDoc, requireFirebase } from "@/lib/utils/firebase-safe"

export interface WalletUidMapping {
  walletAddress: string    // CDP wallet address
  firebaseUid: string     // Original Firebase UID
  email: string           // User email (for verification)
  createdAt: Date         // When mapping was created
  lastUsed: Date          // Last time this mapping was used
}

export class WalletUidMappingService {
  private static COLLECTION = 'wallet_uid_mappings'

  /**
   * Create a mapping between wallet address and Firebase UID
   */
  static async createMapping(
    walletAddress: string,
    firebaseUid: string,
    email: string
  ): Promise<WalletUidMapping> {
    requireFirebase('createMapping')

    const mapping: WalletUidMapping = {
      walletAddress,
      firebaseUid,
      email,
      createdAt: new Date(),
      lastUsed: new Date()
    }

    // Store mapping with wallet address as document ID for fast lookup
    const docRef = safeDoc(this.COLLECTION, walletAddress)
    if (!docRef) throw new Error('Failed to create document reference')
    
    await setDoc(docRef, mapping)
    
    console.log('✅ Created wallet-to-UID mapping:', { walletAddress, firebaseUid, email })
    return mapping
  }

  /**
   * Get Firebase UID from wallet address
   */
  static async getFirebaseUid(walletAddress: string): Promise<string | null> {
    try {
      requireFirebase('getFirebaseUid')

      const docRef = safeDoc(this.COLLECTION, walletAddress)
      if (!docRef) return null
      
      const mappingDoc = await getDoc(docRef)
      
      if (mappingDoc.exists()) {
        const mapping = mappingDoc.data() as WalletUidMapping
        
        // Update last used timestamp
        const updateDocRef = safeDoc(this.COLLECTION, walletAddress)
        if (updateDocRef) {
          await setDoc(updateDocRef, {
            ...mapping,
            lastUsed: new Date()
          })
        }
        
        console.log('✅ Found Firebase UID for wallet:', { walletAddress, firebaseUid: mapping.firebaseUid })
        return mapping.firebaseUid
      }
      
      console.log('❌ No Firebase UID found for wallet:', walletAddress)
      return null
    } catch (error) {
      console.error('Error getting Firebase UID:', error)
      return null
    }
  }

  /**
   * Find existing Firebase UID by email (for migration)
   */
  static async findFirebaseUidByEmail(email: string): Promise<string | null> {
    try {
      requireFirebase('findFirebaseUidByEmail')

      // First check if we already have a mapping for this email
      const mappingsRef = safeCollection(this.COLLECTION)
      if (!mappingsRef) return null
      
      const emailQuery = query(mappingsRef, where('email', '==', email))
      const emailSnapshot = await getDocs(emailQuery)
      
      if (!emailSnapshot.empty) {
        const mapping = emailSnapshot.docs[0].data() as WalletUidMapping
        console.log('✅ Found existing mapping by email:', { email, firebaseUid: mapping.firebaseUid })
        return mapping.firebaseUid
      }

      // If no mapping exists, look in the users collection for existing Firebase user
      const usersRef = safeCollection('users')
      if (!usersRef) return null
      
      const userQuery = query(usersRef, where('email', '==', email))
      const userSnapshot = await getDocs(userQuery)
      
      if (!userSnapshot.empty) {
        const firebaseUid = userSnapshot.docs[0].id
        console.log('✅ Found existing Firebase user by email:', { email, firebaseUid })
        return firebaseUid
      }

      console.log('❌ No existing Firebase user found for email:', email)
      return null
    } catch (error) {
      console.error('Error finding Firebase UID by email:', error)
      return null
    }
  }

  /**
   * Get or create mapping for CDP user
   */
  static async getOrCreateMapping(
    walletAddress: string,
    email: string
  ): Promise<{ firebaseUid: string; isNewMapping: boolean }> {
    // First try to get existing mapping
    const existingUid = await this.getFirebaseUid(walletAddress)
    if (existingUid) {
      return { firebaseUid: existingUid, isNewMapping: false }
    }

    // Look for existing Firebase user by email
    const existingFirebaseUid = await this.findFirebaseUidByEmail(email)
    
    if (existingFirebaseUid) {
      // Create mapping to existing Firebase user
      await this.createMapping(walletAddress, existingFirebaseUid, email)
      return { firebaseUid: existingFirebaseUid, isNewMapping: true }
    }

    // No existing user found - this would be a completely new user
    // For now, we'll generate a new UID (you might want to handle this differently)
    const newFirebaseUid = `cdp_${walletAddress.slice(2, 12)}_${Date.now()}`
    await this.createMapping(walletAddress, newFirebaseUid, email)
    
    console.log('✅ Created new Firebase UID for CDP user:', { walletAddress, newFirebaseUid, email })
    return { firebaseUid: newFirebaseUid, isNewMapping: true }
  }

  /**
   * Get mapping details
   */
  static async getMapping(walletAddress: string): Promise<WalletUidMapping | null> {
    try {
      requireFirebase('getMapping')

      const docRef = safeDoc(this.COLLECTION, walletAddress)
      if (!docRef) return null
      
      const mappingDoc = await getDoc(docRef)
      return mappingDoc.exists() ? mappingDoc.data() as WalletUidMapping : null
    } catch (error) {
      console.error('Error getting mapping:', error)
      return null
    }
  }
}