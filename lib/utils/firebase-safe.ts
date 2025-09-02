/**
 * Firebase Safe Utilities
 * Provides safe access to Firebase collections with proper initialization checks
 */

import { collection, doc, CollectionReference, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/db/database"

/**
 * Safely get a collection reference with Firebase initialization check
 */
export function safeCollection(collectionName: string): CollectionReference | null {
  if (!db) {
    console.error(`Firebase database not initialized - cannot access collection: ${collectionName}`)
    return null
  }
  return collection(db, collectionName)
}

/**
 * Safely get a document reference with Firebase initialization check
 */
export function safeDoc(collectionName: string, docId?: string): DocumentReference | null {
  if (!db) {
    console.error(`Firebase database not initialized - cannot access document in collection: ${collectionName}`)
    return null
  }
  
  if (docId) {
    return doc(db, collectionName, docId)
  } else {
    return doc(collection(db, collectionName))
  }
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return !!db
}

/**
 * Throw error if Firebase is not initialized
 */
export function requireFirebase(operation: string): void {
  if (!db) {
    throw new Error(`Firebase database not initialized - cannot perform operation: ${operation}`)
  }
}