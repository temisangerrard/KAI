/**
 * Tests for Evidence Storage Service
 */

import { EvidenceStorageService } from '@/lib/services/evidence-storage-service'
import {
  Evidence,
  EvidenceFile,
  EvidenceStorageResult
} from '@/lib/types/evidence'

// Mock Firebase services
jest.mock('@/lib/db/database', () => ({
  db: {}
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mock-collection'),
  doc: jest.fn(() => 'mock-doc'),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 }))
}))

// Mock validation service
jest.mock('@/lib/services/evidence-validation-service', () => ({
  EvidenceValidationService: {
    validateEvidence: jest.fn(),
    validateFile: jest.fn(),
    validateEvidenceList: jest.fn()
  }
}))

import { 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  collection
} from 'firebase/firestore'
import { EvidenceValidationService } from '@/lib/services/evidence-validation-service'

const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>
const mockCollection = collection as jest.MockedFunction<typeof collection>
const mockValidateEvidence = EvidenceValidationService.validateEvidence as jest.MockedFunction<typeof EvidenceValidationService.validateEvidence>
const mockValidateFile = EvidenceValidationService.validateFile as jest.MockedFunction<typeof EvidenceValidationService.validateFile>
const mockValidateEvidenceList = EvidenceValidationService.validateEvidenceList as jest.MockedFunction<typeof EvidenceValidationService.validateEvidenceList>

describe('EvidenceStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('storeEvidence', () => {
    it('should store valid evidence successfully', async () => {
      const evidence = {
        type: 'url' as const,
        content: 'https://example.com/article',
        description: 'News article',
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      }

      mockValidateEvidence.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedContent: 'https://example.com/article'
      })

      mockAddDoc.mockResolvedValue({ id: 'evidence-123' } as any)

      const result = await EvidenceStorageService.storeEvidence(evidence)

      expect(result.success).toBe(true)
      expect(result.evidenceId).toBe('evidence-123')
      expect(mockValidateEvidence).toHaveBeenCalledWith(evidence, {})
      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('should reject invalid evidence', async () => {
      const evidence = {
        type: 'url' as const,
        content: 'invalid-url',
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      }

      mockValidateEvidence.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'content',
            message: 'Invalid URL format',
            code: 'invalid_url' as any
          }
        ],
        warnings: []
      })

      const result = await EvidenceStorageService.storeEvidence(evidence)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid URL format')
      expect(mockAddDoc).not.toHaveBeenCalled()
    })

    it('should handle storage errors', async () => {
      const evidence = {
        type: 'description' as const,
        content: 'Valid description',
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      }

      mockValidateEvidence.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedContent: 'Valid description'
      })

      mockAddDoc.mockRejectedValue(new Error('Firestore error'))

      const result = await EvidenceStorageService.storeEvidence(evidence)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Firestore error')
    })

    it('should use sanitized content when storing', async () => {
      const evidence = {
        type: 'description' as const,
        content: 'Content\x00with\x01control\x1Fchars',
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      }

      mockValidateEvidence.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedContent: 'Contentwithcontrolchars'
      })

      mockAddDoc.mockResolvedValue({ id: 'evidence-123' } as any)

      await EvidenceStorageService.storeEvidence(evidence)

      expect(mockAddDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          content: 'Contentwithcontrolchars'
        })
      )
    })
  })

  describe('storeEvidenceFile', () => {
    it('should store valid file successfully', async () => {
      const file: EvidenceFile = {
        name: 'screenshot.png',
        type: 'image/png',
        size: 1024,
        content: new ArrayBuffer(1024)
      }

      mockValidateFile.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedContent: 'screenshot.png'
      })

      mockAddDoc.mockResolvedValue({ id: 'file-123' } as any)

      const result = await EvidenceStorageService.storeEvidenceFile(file, 'evidence-123')

      expect(result.success).toBe(true)
      expect(result.evidenceId).toBe('file-123')
      expect(result.url).toContain('evidence-files/evidence-123/screenshot.png')
    })

    it('should reject invalid files', async () => {
      const file: EvidenceFile = {
        name: 'malicious.exe',
        type: 'application/x-executable',
        size: 1024,
        content: new ArrayBuffer(1024)
      }

      mockValidateFile.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'file',
            message: 'File type not allowed',
            code: 'invalid_file_type' as any
          }
        ],
        warnings: []
      })

      const result = await EvidenceStorageService.storeEvidenceFile(file, 'evidence-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('File type not allowed')
    })
  })

  describe('getEvidence', () => {
    it('should retrieve evidence by ID', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'evidence-123',
        data: () => ({
          type: 'url',
          content: 'https://example.com/article',
          description: 'News article',
          uploadedAt: { toDate: () => new Date('2024-01-01') },
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        })
      }

      mockGetDoc.mockResolvedValue(mockDoc as any)

      const result = await EvidenceStorageService.getEvidence('evidence-123')

      expect(result).toEqual({
        id: 'evidence-123',
        type: 'url',
        content: 'https://example.com/article',
        description: 'News article',
        uploadedAt: new Date('2024-01-01'),
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      })
    })

    it('should return null for non-existent evidence', async () => {
      const mockDoc = {
        exists: () => false
      }

      mockGetDoc.mockResolvedValue(mockDoc as any)

      const result = await EvidenceStorageService.getEvidence('non-existent')

      expect(result).toBeNull()
    })

    it('should handle retrieval errors', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firestore error'))

      const result = await EvidenceStorageService.getEvidence('evidence-123')

      expect(result).toBeNull()
    })
  })

  describe('getEvidenceByResolution', () => {
    it('should retrieve all evidence for a resolution', async () => {
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          const docs = [
            {
              id: 'evidence-1',
              data: () => ({
                type: 'url',
                content: 'https://example.com/article1',
                uploadedAt: { toDate: () => new Date('2024-01-01') },
                resolutionId: 'resolution-123',
                uploadedBy: 'admin-456'
              })
            },
            {
              id: 'evidence-2',
              data: () => ({
                type: 'description',
                content: 'Admin observation',
                uploadedAt: { toDate: () => new Date('2024-01-02') },
                resolutionId: 'resolution-123',
                uploadedBy: 'admin-456'
              })
            }
          ]
          docs.forEach(callback)
        })
      }

      mockGetDocs.mockResolvedValue(mockQuerySnapshot as any)

      const result = await EvidenceStorageService.getEvidenceByResolution('resolution-123')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('evidence-1')
      expect(result[1].id).toBe('evidence-2')
    })

    it('should return empty array on error', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))

      const result = await EvidenceStorageService.getEvidenceByResolution('resolution-123')

      expect(result).toEqual([])
    })
  })

  describe('updateEvidence', () => {
    it('should update evidence successfully', async () => {
      const existingEvidence: Evidence = {
        id: 'evidence-123',
        type: 'description',
        content: 'Original content',
        uploadedAt: new Date(),
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      }

      // Mock getEvidence
      jest.spyOn(EvidenceStorageService, 'getEvidence').mockResolvedValue(existingEvidence)

      mockValidateEvidence.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedContent: 'Updated content'
      })

      mockUpdateDoc.mockResolvedValue(undefined as any)

      const result = await EvidenceStorageService.updateEvidence(
        'evidence-123',
        { content: 'Updated content' }
      )

      expect(result.success).toBe(true)
      expect(result.evidenceId).toBe('evidence-123')
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('should reject updates to non-existent evidence', async () => {
      jest.spyOn(EvidenceStorageService, 'getEvidence').mockResolvedValue(null)

      const result = await EvidenceStorageService.updateEvidence(
        'non-existent',
        { content: 'Updated content' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Evidence not found')
    })

    it('should reject invalid updates', async () => {
      const existingEvidence: Evidence = {
        id: 'evidence-123',
        type: 'description',
        content: 'Original content',
        uploadedAt: new Date(),
        resolutionId: 'resolution-123',
        uploadedBy: 'admin-456'
      }

      jest.spyOn(EvidenceStorageService, 'getEvidence').mockResolvedValue(existingEvidence)

      mockValidateEvidence.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'content',
            message: 'Content too long',
            code: 'content_too_long' as any
          }
        ],
        warnings: []
      })

      const result = await EvidenceStorageService.updateEvidence(
        'evidence-123',
        { content: 'x'.repeat(10000) }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Content too long')
    })
  })

  describe('deleteEvidence', () => {
    it('should delete evidence and associated files', async () => {
      const mockFilesSnapshot = {
        docs: [
          { ref: 'file-ref-1' },
          { ref: 'file-ref-2' }
        ]
      }

      mockGetDocs.mockResolvedValue(mockFilesSnapshot as any)
      mockDeleteDoc.mockResolvedValue(undefined)

      const result = await EvidenceStorageService.deleteEvidence('evidence-123')

      expect(result.success).toBe(true)
      expect(result.evidenceId).toBe('evidence-123')
      expect(mockDeleteDoc).toHaveBeenCalledTimes(3) // 2 files + 1 evidence doc
    })

    it('should handle deletion errors', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'))

      const result = await EvidenceStorageService.deleteEvidence('evidence-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Firestore error')
    })
  })

  describe('validateStorageIntegrity', () => {
    it('should validate storage integrity successfully', async () => {
      const mockEvidence: Evidence[] = [
        {
          id: 'evidence-1',
          type: 'url',
          content: 'https://example.com/article',
          uploadedAt: new Date(),
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        }
      ]

      jest.spyOn(EvidenceStorageService, 'getEvidenceByResolution').mockResolvedValue(mockEvidence)

      mockValidateEvidence.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await EvidenceStorageService.validateStorageIntegrity('resolution-123')

      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect validation issues', async () => {
      const mockEvidence: Evidence[] = [
        {
          id: 'evidence-1',
          type: 'url',
          content: 'invalid-url',
          uploadedAt: new Date(),
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        }
      ]

      jest.spyOn(EvidenceStorageService, 'getEvidenceByResolution').mockResolvedValue(mockEvidence)

      mockValidateEvidence.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'content',
            message: 'Invalid URL format',
            code: 'invalid_url' as any
          }
        ],
        warnings: []
      })

      const result = await EvidenceStorageService.validateStorageIntegrity('resolution-123')

      expect(result.isValid).toBe(false)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]).toContain('Invalid URL format')
    })

    it('should detect missing screenshot files', async () => {
      const mockEvidence: Evidence[] = [
        {
          id: 'evidence-1',
          type: 'screenshot',
          content: 'screenshot-path',
          uploadedAt: new Date(),
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        }
      ]

      jest.spyOn(EvidenceStorageService, 'getEvidenceByResolution').mockResolvedValue(mockEvidence)
      jest.spyOn(EvidenceStorageService, 'getEvidenceFiles').mockResolvedValue([])

      mockValidateEvidence.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await EvidenceStorageService.validateStorageIntegrity('resolution-123')

      expect(result.isValid).toBe(false)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0]).toContain('Screenshot evidence missing file')
    })
  })

  describe('storeEvidenceList', () => {
    it('should store multiple evidence items successfully', async () => {
      const evidenceList = [
        {
          type: 'url' as const,
          content: 'https://example.com/article1',
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        },
        {
          type: 'description' as const,
          content: 'Admin observation',
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        }
      ]

      mockValidateEvidenceList.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      jest.spyOn(EvidenceStorageService, 'storeEvidence')
        .mockResolvedValueOnce({ success: true, evidenceId: 'evidence-1' })
        .mockResolvedValueOnce({ success: true, evidenceId: 'evidence-2' })

      const result = await EvidenceStorageService.storeEvidenceList(evidenceList)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle validation errors for batch', async () => {
      const evidenceList = [
        {
          type: 'url' as const,
          content: 'invalid-url',
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        }
      ]

      mockValidateEvidenceList.mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'evidence[0].content',
            message: 'Invalid URL format',
            code: 'invalid_url' as any
          }
        ],
        warnings: []
      })

      const result = await EvidenceStorageService.storeEvidenceList(evidenceList)

      expect(result.success).toBe(false)
      expect(result.results).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Invalid URL format')
    })

    it('should handle partial failures', async () => {
      const evidenceList = [
        {
          type: 'url' as const,
          content: 'https://example.com/article1',
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        },
        {
          type: 'description' as const,
          content: 'Valid description',
          resolutionId: 'resolution-123',
          uploadedBy: 'admin-456'
        }
      ]

      mockValidateEvidenceList.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      jest.spyOn(EvidenceStorageService, 'storeEvidence')
        .mockResolvedValueOnce({ success: true, evidenceId: 'evidence-1' })
        .mockResolvedValueOnce({ success: false, error: 'Storage failed' })

      const result = await EvidenceStorageService.storeEvidenceList(evidenceList)

      expect(result.success).toBe(false)
      expect(result.results).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Storage failed')
    })
  })
})