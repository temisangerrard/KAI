/**
 * Evidence Validation Service
 * Provides comprehensive validation and sanitization for evidence content
 * to ensure Firestore compatibility and security
 */

import {
  Evidence,
  EvidenceValidationResult,
  EvidenceValidationError,
  EvidenceValidationWarning,
  EvidenceValidationErrorCode,
  EvidenceFile,
  EvidenceUploadOptions,
  FIRESTORE_SAFE_PATTERNS,
  CONTENT_SANITIZATION_PATTERNS,
  EVIDENCE_LIMITS
} from '@/lib/types/evidence'

export class EvidenceValidationService {
  /**
   * Validates evidence content with comprehensive sanitization
   */
  static validateEvidence(
    evidence: Partial<Evidence>,
    options: EvidenceUploadOptions = {}
  ): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []
    const warnings: EvidenceValidationWarning[] = []
    
    // Apply default options
    const opts = {
      maxFileSize: EVIDENCE_LIMITS.MAX_FILE_SIZE,
      allowedFileTypes: EVIDENCE_LIMITS.ALLOWED_FILE_TYPES,
      maxContentLength: EVIDENCE_LIMITS.MAX_DESCRIPTION_LENGTH,
      sanitizeContent: true,
      ...options
    }

    // Validate required fields
    if (!evidence.type) {
      errors.push({
        field: 'type',
        message: 'Evidence type is required',
        code: EvidenceValidationErrorCode.CONTENT_EMPTY
      })
    }

    if (!evidence.content || evidence.content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Evidence content cannot be empty',
        code: EvidenceValidationErrorCode.CONTENT_EMPTY
      })
    }

    let sanitizedContent = evidence.content

    if (evidence.content && opts.sanitizeContent) {
      // Sanitize content based on evidence type
      switch (evidence.type) {
        case 'url':
          const urlValidation = this.validateAndSanitizeUrl(evidence.content)
          if (!urlValidation.isValid) {
            errors.push(...urlValidation.errors)
          }
          warnings.push(...urlValidation.warnings)
          sanitizedContent = urlValidation.sanitizedContent
          break

        case 'description':
          const descValidation = this.validateAndSanitizeDescription(
            evidence.content,
            opts.maxContentLength
          )
          if (!descValidation.isValid) {
            errors.push(...descValidation.errors)
          }
          warnings.push(...descValidation.warnings)
          sanitizedContent = descValidation.sanitizedContent
          break

        case 'screenshot':
          // For screenshots, content should be a file path or base64
          const fileValidation = this.validateFileContent(evidence.content)
          if (!fileValidation.isValid) {
            errors.push(...fileValidation.errors)
          }
          sanitizedContent = fileValidation.sanitizedContent
          break
      }
    }

    // Validate description field if present
    if (evidence.description) {
      const descValidation = this.validateAndSanitizeDescription(
        evidence.description,
        500 // Shorter limit for description field
      )
      if (!descValidation.isValid) {
        errors.push(...descValidation.errors.map(err => ({
          ...err,
          field: 'description'
        })))
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent
    }
  }

  /**
   * Validates and sanitizes URL content
   */
  private static validateAndSanitizeUrl(url: string): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []
    const warnings: EvidenceValidationWarning[] = []

    // Check length
    if (url.length > EVIDENCE_LIMITS.MAX_URL_LENGTH) {
      errors.push({
        field: 'content',
        message: `URL too long. Maximum ${EVIDENCE_LIMITS.MAX_URL_LENGTH} characters allowed`,
        code: EvidenceValidationErrorCode.CONTENT_TOO_LONG
      })
    }

    // Sanitize dangerous characters
    let sanitizedUrl = this.sanitizeFirestoreContent(url)

    // Validate URL format
    try {
      const urlObj = new URL(sanitizedUrl)
      
      // Check for valid protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push({
          field: 'content',
          message: 'URL must use HTTP or HTTPS protocol',
          code: EvidenceValidationErrorCode.INVALID_URL
        })
      }

      // Warn about suspicious domains
      const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl']
      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        warnings.push({
          field: 'content',
          message: 'Shortened URLs may not be reliable evidence sources',
          code: 'suspicious_domain'
        })
      }

    } catch (error) {
      errors.push({
        field: 'content',
        message: 'Invalid URL format',
        code: EvidenceValidationErrorCode.INVALID_URL,
        details: error
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent: sanitizedUrl
    }
  }

  /**
   * Validates and sanitizes description content
   */
  private static validateAndSanitizeDescription(
    description: string,
    maxLength: number
  ): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []
    const warnings: EvidenceValidationWarning[] = []

    // Check length
    if (description.length > maxLength) {
      errors.push({
        field: 'content',
        message: `Description too long. Maximum ${maxLength} characters allowed`,
        code: EvidenceValidationErrorCode.CONTENT_TOO_LONG
      })
    }

    // Sanitize content
    let sanitizedDescription = this.sanitizeFirestoreContent(description)

    // Check for potentially problematic content
    if (sanitizedDescription.length < description.length * 0.8) {
      warnings.push({
        field: 'content',
        message: 'Content contained characters that were removed during sanitization',
        code: 'content_sanitized'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent: sanitizedDescription
    }
  }

  /**
   * Validates file content (for screenshots)
   */
  private static validateFileContent(content: string): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []

    // For now, just sanitize the file path/identifier
    const sanitizedContent = this.sanitizeFirestoreContent(content)

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      sanitizedContent
    }
  }

  /**
   * Validates uploaded files
   */
  static validateFile(file: EvidenceFile, options: EvidenceUploadOptions = {}): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []
    const warnings: EvidenceValidationWarning[] = []

    const opts = {
      maxFileSize: EVIDENCE_LIMITS.MAX_FILE_SIZE,
      allowedFileTypes: EVIDENCE_LIMITS.ALLOWED_FILE_TYPES,
      ...options
    }

    // Validate file size
    if (file.size > opts.maxFileSize) {
      errors.push({
        field: 'file',
        message: `File too large. Maximum size is ${Math.round(opts.maxFileSize / 1024 / 1024)}MB`,
        code: EvidenceValidationErrorCode.INVALID_FILE_TYPE
      })
    }

    // Validate file type
    if (!opts.allowedFileTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        message: `File type not allowed. Allowed types: ${opts.allowedFileTypes.join(', ')}`,
        code: EvidenceValidationErrorCode.INVALID_FILE_TYPE
      })
    }

    // Validate and sanitize filename
    const filenameValidation = this.validateFilename(file.name)
    if (!filenameValidation.isValid) {
      errors.push(...filenameValidation.errors)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validates and sanitizes filenames for safe storage
   */
  private static validateFilename(filename: string): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []

    // Check length
    if (filename.length > EVIDENCE_LIMITS.MAX_FILENAME_LENGTH) {
      errors.push({
        field: 'filename',
        message: `Filename too long. Maximum ${EVIDENCE_LIMITS.MAX_FILENAME_LENGTH} characters allowed`,
        code: EvidenceValidationErrorCode.INVALID_FILENAME
      })
    }

    // Check for dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/g
    if (dangerousChars.test(filename)) {
      errors.push({
        field: 'filename',
        message: 'Filename contains invalid characters',
        code: EvidenceValidationErrorCode.INVALID_FILENAME
      })
    }

    // Sanitize filename
    const sanitizedFilename = filename
      .replace(dangerousChars, '_')
      .replace(/\.+/g, '.') // Replace multiple dots
      .replace(/^\./, '_') // Don't start with dot
      .trim()

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      sanitizedContent: sanitizedFilename
    }
  }

  /**
   * Comprehensive Firestore-safe content sanitization
   */
  private static sanitizeFirestoreContent(content: string): string {
    if (!content) return content

    let sanitized = content

    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(CONTENT_SANITIZATION_PATTERNS.CONTROL_CHARS, '')

    // Remove zero-width characters
    sanitized = sanitized.replace(CONTENT_SANITIZATION_PATTERNS.ZERO_WIDTH, '')

    // Remove private use area characters
    sanitized = sanitized.replace(CONTENT_SANITIZATION_PATTERNS.PRIVATE_USE, '')

    // Remove unpaired surrogates
    sanitized = sanitized.replace(CONTENT_SANITIZATION_PATTERNS.UNPAIRED_SURROGATES, '')

    // Remove other non-printable characters (but preserve newlines and tabs)
    try {
      // More selective removal that preserves \n and \t
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    } catch (error) {
      // Fallback if regex fails
      console.warn('Failed to remove non-printable characters:', error)
    }

    // Normalize Unicode
    try {
      sanitized = sanitized.normalize('NFC')
    } catch (error) {
      console.warn('Failed to normalize Unicode:', error)
    }

    // Trim whitespace
    sanitized = sanitized.trim()

    return sanitized
  }

  /**
   * Validates Firestore field names
   */
  static validateFirestoreFieldName(fieldName: string): EvidenceValidationResult {
    const errors: EvidenceValidationError[] = []

    // Check for invalid characters - reset regex lastIndex to avoid issues
    const invalidCharsRegex = /[~*/[\]]/g
    if (invalidCharsRegex.test(fieldName)) {
      errors.push({
        field: 'fieldName',
        message: 'Field name contains invalid characters (~*/[])',
        code: EvidenceValidationErrorCode.FIRESTORE_UNSAFE_FIELD
      })
    }

    // Check for reserved prefix
    if (fieldName.startsWith('__')) {
      errors.push({
        field: 'fieldName',
        message: 'Field name cannot start with "__"',
        code: EvidenceValidationErrorCode.FIRESTORE_UNSAFE_FIELD
      })
    }

    // Check length (Firestore limit is 1500 bytes)
    const byteLength = new TextEncoder().encode(fieldName).length
    if (byteLength > FIRESTORE_SAFE_PATTERNS.MAX_FIELD_LENGTH) {
      errors.push({
        field: 'fieldName',
        message: `Field name too long. Maximum ${FIRESTORE_SAFE_PATTERNS.MAX_FIELD_LENGTH} bytes allowed`,
        code: EvidenceValidationErrorCode.FIRESTORE_UNSAFE_FIELD
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  /**
   * Batch validates multiple evidence items
   */
  static validateEvidenceList(evidenceList: Partial<Evidence>[]): EvidenceValidationResult {
    const allErrors: EvidenceValidationError[] = []
    const allWarnings: EvidenceValidationWarning[] = []

    evidenceList.forEach((evidence, index) => {
      const result = this.validateEvidence(evidence)
      
      // Add index to error field names
      result.errors.forEach(error => {
        allErrors.push({
          ...error,
          field: `evidence[${index}].${error.field}`
        })
      })

      result.warnings.forEach(warning => {
        allWarnings.push({
          ...warning,
          field: `evidence[${index}].${warning.field}`
        })
      })
    })

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    }
  }
}