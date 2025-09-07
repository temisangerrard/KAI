/**
 * Tests for Evidence Validation Service
 */

import { EvidenceValidationService } from '@/lib/services/evidence-validation-service'
import {
  Evidence,
  EvidenceValidationErrorCode,
  EvidenceFile,
  EVIDENCE_LIMITS
} from '@/lib/types/evidence'

describe('EvidenceValidationService', () => {
  describe('validateEvidence', () => {
    it('should validate valid URL evidence', () => {
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: 'https://example.com/news-article',
        description: 'News article about the event'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.sanitizedContent).toBe('https://example.com/news-article')
    })

    it('should validate valid description evidence', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'This is a detailed explanation of what happened.',
        description: 'Admin observation'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject evidence without type', () => {
      const evidence: Partial<Evidence> = {
        content: 'Some content'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.CONTENT_EMPTY)
      expect(result.errors[0].field).toBe('type')
    })

    it('should reject evidence without content', () => {
      const evidence: Partial<Evidence> = {
        type: 'description'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.CONTENT_EMPTY)
      expect(result.errors[0].field).toBe('content')
    })

    it('should reject evidence with empty content', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: '   '
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.CONTENT_EMPTY)
    })
  })

  describe('URL validation', () => {
    it('should validate valid HTTPS URLs', () => {
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: 'https://www.example.com/article'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate valid HTTP URLs', () => {
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: 'http://example.com/page'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid URL protocols', () => {
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: 'ftp://example.com/file'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.INVALID_URL)
    })

    it('should reject malformed URLs', () => {
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: 'not-a-url'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.INVALID_URL)
    })

    it('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(EVIDENCE_LIMITS.MAX_URL_LENGTH)
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: longUrl
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.CONTENT_TOO_LONG)
    })

    it('should warn about suspicious domains', () => {
      const evidence: Partial<Evidence> = {
        type: 'url',
        content: 'https://bit.ly/shortened-link'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('suspicious_domain')
    })
  })

  describe('Description validation', () => {
    it('should validate normal descriptions', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'This is a normal description with regular text.'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject descriptions that are too long', () => {
      const longDescription = 'a'.repeat(EVIDENCE_LIMITS.MAX_DESCRIPTION_LENGTH + 1)
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: longDescription
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.CONTENT_TOO_LONG)
    })

    it('should sanitize dangerous characters', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'Text with\x00control\x01characters\x1F'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.sanitizedContent).not.toContain('\x00')
      expect(result.sanitizedContent).not.toContain('\x01')
      expect(result.sanitizedContent).not.toContain('\x1F')
    })

    it('should warn when content is heavily sanitized', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x7F'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('content_sanitized')
    })

    it('should handle Unicode normalization', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'Café' // Contains combining characters
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.isValid).toBe(true)
      expect(result.sanitizedContent).toBe('Café')
    })
  })

  describe('File validation', () => {
    it('should validate valid image files', () => {
      const file: EvidenceFile = {
        name: 'screenshot.png',
        type: 'image/png',
        size: 1024 * 1024, // 1MB
        content: new ArrayBuffer(1024)
      }

      const result = EvidenceValidationService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject files that are too large', () => {
      const file: EvidenceFile = {
        name: 'large-file.png',
        type: 'image/png',
        size: EVIDENCE_LIMITS.MAX_FILE_SIZE + 1,
        content: new ArrayBuffer(1024)
      }

      const result = EvidenceValidationService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.INVALID_FILE_TYPE)
    })

    it('should reject invalid file types', () => {
      const file: EvidenceFile = {
        name: 'malicious.exe',
        type: 'application/x-executable',
        size: 1024,
        content: new ArrayBuffer(1024)
      }

      const result = EvidenceValidationService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.INVALID_FILE_TYPE)
    })

    it('should validate allowed file types', () => {
      const allowedTypes = EVIDENCE_LIMITS.ALLOWED_FILE_TYPES

      allowedTypes.forEach(type => {
        const file: EvidenceFile = {
          name: `test.${type.split('/')[1]}`,
          type,
          size: 1024,
          content: new ArrayBuffer(1024)
        }

        const result = EvidenceValidationService.validateFile(file)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('Filename validation', () => {
    it('should validate normal filenames', () => {
      const file: EvidenceFile = {
        name: 'normal-filename.png',
        type: 'image/png',
        size: 1024,
        content: new ArrayBuffer(1024)
      }

      const result = EvidenceValidationService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject filenames that are too long', () => {
      const longName = 'a'.repeat(EVIDENCE_LIMITS.MAX_FILENAME_LENGTH + 1) + '.png'
      const file: EvidenceFile = {
        name: longName,
        type: 'image/png',
        size: 1024,
        content: new ArrayBuffer(1024)
      }

      const result = EvidenceValidationService.validateFile(file)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.INVALID_FILENAME)
    })

    it('should reject filenames with dangerous characters', () => {
      const dangerousNames = [
        'file<script>.png',
        'file>redirect.png',
        'file:colon.png',
        'file"quote.png',
        'file/slash.png',
        'file\\backslash.png',
        'file|pipe.png',
        'file?question.png',
        'file*asterisk.png'
      ]

      dangerousNames.forEach(name => {
        const file: EvidenceFile = {
          name,
          type: 'image/png',
          size: 1024,
          content: new ArrayBuffer(1024)
        }

        const result = EvidenceValidationService.validateFile(file)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.INVALID_FILENAME)
      })
    })
  })

  describe('Firestore field name validation', () => {
    it('should validate normal field names', () => {
      const result = EvidenceValidationService.validateFirestoreFieldName('normalFieldName')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject field names with invalid characters', () => {
      const invalidNames = ['field~name', 'field*name', 'field/name', 'field[name]']

      invalidNames.forEach(name => {
        const result = EvidenceValidationService.validateFirestoreFieldName(name)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.FIRESTORE_UNSAFE_FIELD)
      })
    })

    it('should reject field names starting with __', () => {
      const result = EvidenceValidationService.validateFirestoreFieldName('__reservedField')

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.FIRESTORE_UNSAFE_FIELD)
    })

    it('should reject field names that are too long', () => {
      const longName = 'a'.repeat(1501) // Over 1500 byte limit
      const result = EvidenceValidationService.validateFirestoreFieldName(longName)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe(EvidenceValidationErrorCode.FIRESTORE_UNSAFE_FIELD)
    })
  })

  describe('Batch validation', () => {
    it('should validate multiple evidence items', () => {
      const evidenceList: Partial<Evidence>[] = [
        {
          type: 'url',
          content: 'https://example.com/article1'
        },
        {
          type: 'description',
          content: 'This is a valid description'
        }
      ]

      const result = EvidenceValidationService.validateEvidenceList(evidenceList)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should collect errors from multiple evidence items', () => {
      const evidenceList: Partial<Evidence>[] = [
        {
          type: 'url',
          content: 'invalid-url'
        },
        {
          type: 'description'
          // Missing content
        }
      ]

      const result = EvidenceValidationService.validateEvidenceList(evidenceList)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].field).toBe('evidence[0].content')
      expect(result.errors[1].field).toBe('evidence[1].content')
    })
  })

  describe('Content sanitization', () => {
    it('should remove control characters', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'Text\x00with\x01control\x1Fcharacters'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.sanitizedContent).toBe('Textwithcontrolcharacters')
    })

    it('should preserve newlines and tabs', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'Text\nwith\ttabs\nand\nnewlines'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.sanitizedContent).toBe('Text\nwith\ttabs\nand\nnewlines')
    })

    it('should remove zero-width characters', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'Text\u200Bwith\u200Czero\u200Dwidth\uFEFFchars'
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.sanitizedContent).toBe('Textwithzerowidthchars')
    })

    it('should normalize Unicode', () => {
      const evidence: Partial<Evidence> = {
        type: 'description',
        content: 'Cafe\u0301' // e + combining acute accent
      }

      const result = EvidenceValidationService.validateEvidence(evidence)

      expect(result.sanitizedContent).toBe('Café')
    })
  })
})