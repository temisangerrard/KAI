/**
 * Evidence Storage Service
 * Handles secure storage and retrieval of evidence files and data
 */

import {
  Evidence,
  EvidenceStorageResult,
  EvidenceFile,
  EvidenceUploadOptions
} from '@/lib/types/evidence'
import { EvidenceValidationService } from './evidence-validation-service'
import { db } from '@/lib/db/database'
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'

export class EvidenceStorageService {
  private static readonly COLLECTION_NAME = 'evidence'
  private static readonly FILES_COLLECTION = 'evidence_files'

  /**
   * Stores evidence with validation and sanitization
   */
  static async storeEvidence(
    evidence: Omit<Evidence, 'id' | 'uploadedAt'>,
    options: EvidenceUploadOptions = {}
  ): Promise<EvidenceStorageResult> {
    try {
      // Validate evidence before storing
      const validation = EvidenceValidationService.validateEvidence(evidence, options)
      
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        }
      }

      // Prepare evidence document with sanitized content
      const evidenceDoc = {
        type: evidence.type,
        content: validation.sanitizedContent || evidence.content,
        description: evidence.description,
        resolutionId: evidence.resolutionId,
        uploadedBy: evidence.uploadedBy,
        uploadedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // Store in Firestore
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), evidenceDoc)

      return {
        success: true,
        evidenceId: docRef.id
      }

    } catch (error) {
      console.error('Failed to store evidence:', error)
      return {
        success: false,
        error: `Storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Stores evidence file (screenshot, document)
   */
  static async storeEvidenceFile(
    file: EvidenceFile,
    evidenceId: string,
    options: EvidenceUploadOptions = {}
  ): Promise<EvidenceStorageResult> {
    try {
      // Validate file
      const validation = EvidenceValidationService.validateFile(file, options)
      
      if (!validation.isValid) {
        return {
          success: false,
          error: `File validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        }
      }

      // For now, we'll store file metadata in Firestore
      // In a production system, you'd upload to Firebase Storage or similar
      const fileDoc = {
        evidenceId,
        originalName: file.name,
        sanitizedName: validation.sanitizedContent || file.name,
        type: file.type,
        size: file.size,
        uploadedAt: serverTimestamp(),
        // In production, this would be the storage URL
        storageUrl: `evidence-files/${evidenceId}/${validation.sanitizedContent || file.name}`
      }

      const docRef = await addDoc(collection(db, this.FILES_COLLECTION), fileDoc)

      return {
        success: true,
        evidenceId: docRef.id,
        url: fileDoc.storageUrl
      }

    } catch (error) {
      console.error('Failed to store evidence file:', error)
      return {
        success: false,
        error: `File storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Retrieves evidence by ID
   */
  static async getEvidence(evidenceId: string): Promise<Evidence | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, evidenceId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data()
      
      return {
        id: docSnap.id,
        type: data.type,
        content: data.content,
        description: data.description,
        uploadedAt: data.uploadedAt?.toDate() || new Date(),
        resolutionId: data.resolutionId,
        uploadedBy: data.uploadedBy
      }

    } catch (error) {
      console.error('Failed to retrieve evidence:', error)
      return null
    }
  }

  /**
   * Retrieves all evidence for a resolution
   */
  static async getEvidenceByResolution(resolutionId: string): Promise<Evidence[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('resolutionId', '==', resolutionId),
        orderBy('uploadedAt', 'asc')
      )

      const querySnapshot = await getDocs(q)
      const evidence: Evidence[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        evidence.push({
          id: doc.id,
          type: data.type,
          content: data.content,
          description: data.description,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
          resolutionId: data.resolutionId,
          uploadedBy: data.uploadedBy
        })
      })

      return evidence

    } catch (error) {
      console.error('Failed to retrieve evidence by resolution:', error)
      return []
    }
  }

  /**
   * Updates evidence content (with validation)
   */
  static async updateEvidence(
    evidenceId: string,
    updates: Partial<Pick<Evidence, 'content' | 'description'>>,
    options: EvidenceUploadOptions = {}
  ): Promise<EvidenceStorageResult> {
    try {
      // Get existing evidence
      const existing = await this.getEvidence(evidenceId)
      if (!existing) {
        return {
          success: false,
          error: 'Evidence not found'
        }
      }

      // Validate updates
      const updatedEvidence = { ...existing, ...updates }
      const validation = EvidenceValidationService.validateEvidence(updatedEvidence, options)
      
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        }
      }

      // Prepare update document
      const updateData: any = {
        updatedAt: serverTimestamp()
      }

      if (updates.content !== undefined) {
        updateData.content = validation.sanitizedContent || updates.content
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description
      }

      // Update in Firestore
      const docRef = doc(db, this.COLLECTION_NAME, evidenceId)
      await updateDoc(docRef, updateData)

      return {
        success: true,
        evidenceId
      }

    } catch (error) {
      console.error('Failed to update evidence:', error)
      return {
        success: false,
        error: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Deletes evidence and associated files
   */
  static async deleteEvidence(evidenceId: string): Promise<EvidenceStorageResult> {
    try {
      // Delete associated files first
      const filesQuery = query(
        collection(db, this.FILES_COLLECTION),
        where('evidenceId', '==', evidenceId)
      )

      const filesSnapshot = await getDocs(filesQuery)
      const deletePromises = filesSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      // Delete evidence document
      const evidenceRef = doc(db, this.COLLECTION_NAME, evidenceId)
      await deleteDoc(evidenceRef)

      return {
        success: true,
        evidenceId
      }

    } catch (error) {
      console.error('Failed to delete evidence:', error)
      return {
        success: false,
        error: `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Gets file metadata for evidence
   */
  static async getEvidenceFiles(evidenceId: string) {
    try {
      const q = query(
        collection(db, this.FILES_COLLECTION),
        where('evidenceId', '==', evidenceId),
        orderBy('uploadedAt', 'asc')
      )

      const querySnapshot = await getDocs(q)
      const files: any[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        files.push({
          id: doc.id,
          evidenceId: data.evidenceId,
          originalName: data.originalName,
          sanitizedName: data.sanitizedName,
          type: data.type,
          size: data.size,
          storageUrl: data.storageUrl,
          uploadedAt: data.uploadedAt?.toDate() || new Date()
        })
      })

      return files

    } catch (error) {
      console.error('Failed to retrieve evidence files:', error)
      return []
    }
  }

  /**
   * Validates evidence storage integrity
   */
  static async validateStorageIntegrity(resolutionId: string): Promise<{
    isValid: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      const evidence = await this.getEvidenceByResolution(resolutionId)

      for (const item of evidence) {
        // Re-validate stored content
        const validation = EvidenceValidationService.validateEvidence(item)
        if (!validation.isValid) {
          issues.push(`Evidence ${item.id}: ${validation.errors.map(e => e.message).join(', ')}`)
        }

        // Check for file consistency if it's a screenshot
        if (item.type === 'screenshot') {
          const files = await this.getEvidenceFiles(item.id)
          if (files.length === 0) {
            issues.push(`Evidence ${item.id}: Screenshot evidence missing file`)
          }
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      }

    } catch (error) {
      issues.push(`Storage integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        isValid: false,
        issues
      }
    }
  }

  /**
   * Bulk stores multiple evidence items
   */
  static async storeEvidenceList(
    evidenceList: Omit<Evidence, 'id' | 'uploadedAt'>[],
    options: EvidenceUploadOptions = {}
  ): Promise<{
    success: boolean
    results: EvidenceStorageResult[]
    errors: string[]
  }> {
    const results: EvidenceStorageResult[] = []
    const errors: string[] = []

    // Validate all evidence first
    const validation = EvidenceValidationService.validateEvidenceList(evidenceList)
    if (!validation.isValid) {
      return {
        success: false,
        results: [],
        errors: validation.errors.map(e => `${e.field}: ${e.message}`)
      }
    }

    // Store each evidence item
    for (let i = 0; i < evidenceList.length; i++) {
      try {
        const result = await this.storeEvidence(evidenceList[i], options)
        results.push(result)
        
        if (!result.success) {
          errors.push(`Evidence ${i}: ${result.error}`)
        }
      } catch (error) {
        const errorMsg = `Evidence ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        results.push({
          success: false,
          error: errorMsg
        })
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    }
  }
}