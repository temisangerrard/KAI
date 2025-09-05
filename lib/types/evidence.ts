/**
 * Evidence types for market resolution system
 */

export interface Evidence {
  id: string
  type: 'url' | 'screenshot' | 'description'
  content: string
  description?: string
  uploadedAt: Date
  resolutionId?: string
  uploadedBy: string
}

export interface EvidenceValidationResult {
  isValid: boolean
  errors: EvidenceValidationError[]
  warnings: EvidenceValidationWarning[]
  sanitizedContent?: string
}

export interface EvidenceValidationError {
  field: string
  message: string
  code: EvidenceValidationErrorCode
  details?: any
}

export interface EvidenceValidationWarning {
  field: string
  message: string
  code: string
}

export enum EvidenceValidationErrorCode {
  INVALID_URL = 'invalid_url',
  INVALID_FILE_TYPE = 'invalid_file_type',
  INVALID_FILENAME = 'invalid_filename',
  CONTENT_TOO_LONG = 'content_too_long',
  CONTENT_EMPTY = 'content_empty',
  UNSAFE_CHARACTERS = 'unsafe_characters',
  FIRESTORE_UNSAFE_FIELD = 'firestore_unsafe_field',
  INVALID_UNICODE = 'invalid_unicode',
  MALFORMED_CONTENT = 'malformed_content'
}

export interface EvidenceUploadOptions {
  maxFileSize?: number // bytes
  allowedFileTypes?: string[]
  maxContentLength?: number
  sanitizeContent?: boolean
}

export interface EvidenceStorageResult {
  success: boolean
  evidenceId?: string
  url?: string
  error?: string
}

export interface EvidenceFile {
  name: string
  type: string
  size: number
  content: ArrayBuffer | string
}

// Firestore-safe field name patterns
export const FIRESTORE_SAFE_PATTERNS = {
  // Field names cannot contain certain characters
  INVALID_FIELD_CHARS: /[~*/[\]]/g,
  // Field names cannot start with __
  RESERVED_PREFIX: /^__/,
  // Field names cannot be longer than 1500 bytes
  MAX_FIELD_LENGTH: 1500
}

// Content sanitization patterns
export const CONTENT_SANITIZATION_PATTERNS = {
  // Remove control characters except newlines and tabs
  CONTROL_CHARS: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
  // Remove zero-width characters that can break Firestore
  ZERO_WIDTH: /[\u200B-\u200D\uFEFF]/g,
  // Remove private use area characters
  PRIVATE_USE: /[\uE000-\uF8FF]/g,
  // Remove surrogates that aren't properly paired
  UNPAIRED_SURROGATES: /[\uD800-\uDFFF]/g,
  // Remove non-printable Unicode categories
  NON_PRINTABLE: /\p{C}/gu
}

export const EVIDENCE_LIMITS = {
  MAX_URL_LENGTH: 2048,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain'
  ],
  MAX_FILENAME_LENGTH: 255
}