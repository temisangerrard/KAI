/**
 * Admin Migration Utility for CDP Integration
 * 
 * This utility helps migrate existing admin records from Firebase UID to CDP wallet address
 */

import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/db/database"

interface AdminMigrationResult {
  success: boolean
  message: string
  adminData?: any
}

/**
 * Migrate admin record from Firebase UID to CDP wallet address
 */
export async function migrateAdminRecord(
  email: string,
  walletAddress: string
): Promise<AdminMigrationResult> {
  try {
    console.log('🔄 Starting admin record migration:', { email, walletAddress })
    
    // Step 1: Look for existing admin record by email
    const adminUsersRef = collection(db, 'admin_users')
    const emailQuery = query(adminUsersRef, where('email', '==', email))
    const emailSnapshot = await getDocs(emailQuery)
    
    if (emailSnapshot.empty) {
      console.log('ℹ️ No existing admin record found for email:', email)
      return {
        success: true,
        message: 'No existing admin record to migrate'
      }
    }
    
    const existingAdminDoc = emailSnapshot.docs[0]
    const existingAdminData = existingAdminDoc.data()
    const originalUserId = existingAdminDoc.id
    
    console.log('✅ Found existing admin record:', { originalUserId, adminData: existingAdminData })
    
    // Step 2: Check if wallet address already has an admin record
    const walletAdminRef = doc(db, 'admin_users', walletAddress)
    const walletAdminSnap = await getDoc(walletAdminRef)
    
    if (walletAdminSnap.exists()) {
      console.log('ℹ️ Wallet address already has admin record')
      return {
        success: true,
        message: 'Wallet address already has admin record - no migration needed',
        adminData: walletAdminSnap.data()
      }
    }
    
    // Step 3: Create new admin record with wallet address as ID
    const migratedAdminData = {
      ...existingAdminData,
      userId: walletAddress, // Update userId to wallet address
      walletAddress: walletAddress, // Add wallet address field
      migratedFrom: originalUserId, // Track original Firebase UID
      migratedAt: new Date(),
      // Preserve original fields
      email: existingAdminData.email,
      isActive: existingAdminData.isActive,
      role: existingAdminData.role || 'admin',
      createdAt: existingAdminData.createdAt,
      updatedAt: new Date()
    }
    
    await setDoc(walletAdminRef, migratedAdminData)
    console.log('✅ Created new admin record with wallet address')
    
    return {
      success: true,
      message: `Successfully migrated admin record to wallet address ${walletAddress}`,
      adminData: migratedAdminData
    }
    
  } catch (error) {
    console.error('💥 Error during admin record migration:', error)
    return {
      success: false,
      message: `Admin migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Check if admin migration is needed
 */
export async function checkAdminMigrationNeeded(email: string, walletAddress: string): Promise<boolean> {
  try {
    // Check if wallet address already has admin record
    const walletAdminRef = doc(db, 'admin_users', walletAddress)
    const walletAdminSnap = await getDoc(walletAdminRef)
    
    if (walletAdminSnap.exists()) {
      return false // Already migrated
    }
    
    // Check if there's existing admin record with this email
    const adminUsersRef = collection(db, 'admin_users')
    const emailQuery = query(adminUsersRef, where('email', '==', email))
    const emailSnapshot = await getDocs(emailQuery)
    
    return !emailSnapshot.empty // Migration needed if existing admin record found
  } catch (error) {
    console.error('Error checking admin migration status:', error)
    return false
  }
}