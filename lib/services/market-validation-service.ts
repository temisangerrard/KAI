/**
 * Market Validation Service
 * Provides real-time validation for market creation criteria
 * Ensures all markets can be definitively resolved with verifiable outcomes
 */

import { MarketValidationResult, ValidationError, ValidationWarning } from '@/lib/types/database';

export interface MarketCreationData {
  title: string;
  description: string;
  endDate: Date;
  options: Array<{
    id: string;
    text: string;
  }>;
  category?: string;
}

export enum ValidationErrorCode {
  // Title validation
  SUBJECTIVE_LANGUAGE = 'SUBJECTIVE_LANGUAGE',
  TITLE_TOO_SHORT = 'TITLE_TOO_SHORT',
  TITLE_NOT_QUESTION = 'TITLE_NOT_QUESTION',
  TITLE_REQUIRED = 'TITLE_REQUIRED',
  
  // End date validation
  INVALID_END_DATE = 'INVALID_END_DATE',
  END_DATE_TOO_FAR = 'END_DATE_TOO_FAR',
  END_DATE_REQUIRED = 'END_DATE_REQUIRED',
  
  // Options validation
  INVALID_OPTION_COUNT = 'INVALID_OPTION_COUNT',
  DUPLICATE_OPTIONS = 'DUPLICATE_OPTIONS',
  EMPTY_OPTION_TEXT = 'EMPTY_OPTION_TEXT',
  OPTIONS_REQUIRED = 'OPTIONS_REQUIRED',
  
  // Description validation
  DESCRIPTION_TOO_SHORT = 'DESCRIPTION_TOO_SHORT',
  DESCRIPTION_REQUIRED = 'DESCRIPTION_REQUIRED'
}

export enum ValidationWarningCode {
  // Title warnings
  SUBJECTIVE_WORDS_DETECTED = 'SUBJECTIVE_WORDS_DETECTED',
  AMBIGUOUS_LANGUAGE = 'AMBIGUOUS_LANGUAGE',
  
  // End date warnings
  END_DATE_VERY_SOON = 'END_DATE_VERY_SOON',
  END_DATE_FAR_FUTURE = 'END_DATE_FAR_FUTURE',
  
  // Options warnings
  SIMILAR_OPTIONS = 'SIMILAR_OPTIONS',
  VAGUE_OPTION_TEXT = 'VAGUE_OPTION_TEXT'
}

export class MarketValidationService {
  // Subjective words that make markets hard to resolve objectively
  private static readonly SUBJECTIVE_WORDS = [
    'best', 'worst', 'better', 'worse', 'good', 'bad', 'great', 'terrible',
    'amazing', 'awful', 'excellent', 'poor', 'outstanding', 'horrible',
    'fantastic', 'disappointing', 'superior', 'inferior', 'perfect', 'flawed',
    'beautiful', 'ugly', 'attractive', 'unattractive', 'impressive', 'unimpressive',
    'successful', 'unsuccessful', 'popular', 'unpopular', 'favorite', 'least favorite'
  ];

  // Ambiguous words that can lead to unclear outcomes
  private static readonly AMBIGUOUS_WORDS = [
    'soon', 'later', 'eventually', 'might', 'could', 'possibly', 'probably',
    'likely', 'unlikely', 'maybe', 'perhaps', 'around', 'approximately',
    'about', 'roughly', 'some', 'many', 'few', 'several', 'most', 'majority'
  ];

  // Vague option words that make resolution difficult
  private static readonly VAGUE_OPTION_WORDS = [
    'other', 'something else', 'different', 'alternative', 'various', 'multiple',
    'some', 'any', 'none of the above', 'depends'
  ];

  /**
   * Validate market creation data against all criteria
   */
  static validateMarket(marketData: MarketCreationData): MarketValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate title
    const titleValidation = this.validateTitle(marketData.title);
    errors.push(...titleValidation.errors);
    warnings.push(...titleValidation.warnings);

    // Validate description
    const descriptionValidation = this.validateDescription(marketData.description);
    errors.push(...descriptionValidation.errors);
    warnings.push(...descriptionValidation.warnings);

    // Validate end date
    const endDateValidation = this.validateEndDate(marketData.endDate);
    errors.push(...endDateValidation.errors);
    warnings.push(...endDateValidation.warnings);

    // Validate options
    const optionsValidation = this.validateOptions(marketData.options);
    errors.push(...optionsValidation.errors);
    warnings.push(...optionsValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate market title for resolvability criteria
   */
  static validateTitle(title: string): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field
    if (!title || title.trim().length === 0) {
      errors.push({
        field: 'title',
        message: 'Market title is required',
        code: ValidationErrorCode.TITLE_REQUIRED
      });
      return { errors, warnings };
    }

    const trimmedTitle = title.trim();

    // Minimum length
    if (trimmedTitle.length < 10) {
      errors.push({
        field: 'title',
        message: 'Market title must be at least 10 characters long',
        code: ValidationErrorCode.TITLE_TOO_SHORT
      });
    }

    // Should be a question for clarity
    if (!trimmedTitle.endsWith('?')) {
      warnings.push({
        field: 'title',
        message: 'Market titles should be phrased as questions for clarity',
        code: ValidationWarningCode.AMBIGUOUS_LANGUAGE
      });
    }

    // Check for subjective language
    const lowerTitle = trimmedTitle.toLowerCase();
    const foundSubjectiveWords = this.SUBJECTIVE_WORDS.filter(word => 
      lowerTitle.includes(word.toLowerCase())
    );

    if (foundSubjectiveWords.length > 0) {
      errors.push({
        field: 'title',
        message: `Avoid subjective terms: "${foundSubjectiveWords.join('", "')}". Markets need clear, factual outcomes that can be verified with evidence.`,
        code: ValidationErrorCode.SUBJECTIVE_LANGUAGE
      });
    }

    // Check for ambiguous language
    const foundAmbiguousWords = this.AMBIGUOUS_WORDS.filter(word => 
      lowerTitle.includes(word.toLowerCase())
    );

    if (foundAmbiguousWords.length > 0) {
      warnings.push({
        field: 'title',
        message: `Consider being more specific. Ambiguous terms detected: "${foundAmbiguousWords.join('", "')}". Use specific dates, numbers, or criteria.`,
        code: ValidationWarningCode.AMBIGUOUS_LANGUAGE
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate market description
   */
  static validateDescription(description: string): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field
    if (!description || description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Market description is required',
        code: ValidationErrorCode.DESCRIPTION_REQUIRED
      });
      return { errors, warnings };
    }

    // Minimum length for meaningful description
    if (description.trim().length < 20) {
      errors.push({
        field: 'description',
        message: 'Market description must be at least 20 characters long to provide sufficient context',
        code: ValidationErrorCode.DESCRIPTION_TOO_SHORT
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate market end date
   */
  static validateEndDate(endDate: Date): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field
    if (!endDate) {
      errors.push({
        field: 'endDate',
        message: 'Markets must have a specific end date when the outcome will be known',
        code: ValidationErrorCode.END_DATE_REQUIRED
      });
      return { errors, warnings };
    }

    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    // Must be in the future
    if (endDate <= now) {
      errors.push({
        field: 'endDate',
        message: 'Market end date must be in the future',
        code: ValidationErrorCode.INVALID_END_DATE
      });
    }

    // Not too far in the future (max 12 months)
    if (daysDiff > 365) {
      errors.push({
        field: 'endDate',
        message: 'Market end date cannot be more than 12 months in the future',
        code: ValidationErrorCode.END_DATE_TOO_FAR
      });
    }

    // Warning for very soon end dates (less than 24 hours)
    if (daysDiff < 1 && daysDiff > 0) {
      warnings.push({
        field: 'endDate',
        message: 'Market ends very soon (less than 24 hours). Consider extending to allow more participation.',
        code: ValidationWarningCode.END_DATE_VERY_SOON
      });
    }

    // Warning for very far future dates (more than 6 months)
    if (daysDiff > 180) {
      warnings.push({
        field: 'endDate',
        message: 'Market ends far in the future (more than 6 months). Long-term markets may be harder to predict accurately.',
        code: ValidationWarningCode.END_DATE_FAR_FUTURE
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate market options
   */
  static validateOptions(options: Array<{ id: string; text: string }>): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field
    if (!options || options.length === 0) {
      errors.push({
        field: 'options',
        message: 'Markets must have prediction options',
        code: ValidationErrorCode.OPTIONS_REQUIRED
      });
      return { errors, warnings };
    }

    // Must have 2-5 options
    if (options.length < 2) {
      errors.push({
        field: 'options',
        message: 'Markets must have at least 2 options',
        code: ValidationErrorCode.INVALID_OPTION_COUNT
      });
    }

    if (options.length > 5) {
      errors.push({
        field: 'options',
        message: 'Markets cannot have more than 5 options to keep them simple and focused',
        code: ValidationErrorCode.INVALID_OPTION_COUNT
      });
    }

    // Check for empty option text
    const emptyOptions = options.filter(option => !option.text || option.text.trim().length === 0);
    if (emptyOptions.length > 0) {
      errors.push({
        field: 'options',
        message: 'All options must have text',
        code: ValidationErrorCode.EMPTY_OPTION_TEXT
      });
    }

    // Check for duplicate options
    const optionTexts = options.map(option => option.text.trim().toLowerCase());
    const duplicates = optionTexts.filter((text, index) => optionTexts.indexOf(text) !== index);
    if (duplicates.length > 0) {
      errors.push({
        field: 'options',
        message: 'Options must be unique and mutually exclusive',
        code: ValidationErrorCode.DUPLICATE_OPTIONS
      });
    }

    // Check for similar options (potential confusion)
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const similarity = this.calculateStringSimilarity(
          options[i].text.toLowerCase(),
          options[j].text.toLowerCase()
        );
        if (similarity > 0.8) {
          warnings.push({
            field: 'options',
            message: `Options "${options[i].text}" and "${options[j].text}" are very similar. Consider making them more distinct.`,
            code: ValidationWarningCode.SIMILAR_OPTIONS
          });
        }
      }
    }

    // Check for vague option text
    options.forEach((option, index) => {
      const lowerText = option.text.toLowerCase();
      const foundVagueWords = this.VAGUE_OPTION_WORDS.filter(word => 
        lowerText.includes(word.toLowerCase())
      );

      if (foundVagueWords.length > 0) {
        warnings.push({
          field: 'options',
          message: `Option "${option.text}" contains vague terms: "${foundVagueWords.join('", "')}". Consider being more specific for clearer resolution.`,
          code: ValidationWarningCode.VAGUE_OPTION_TEXT
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Get validation guidance and examples
   */
  static getValidationGuidance(): {
    goodExamples: string[];
    badExamples: Array<{ text: string; reason: string }>;
    tips: string[];
  } {
    return {
      goodExamples: [
        'Will Drake release an album before December 31, 2024?',
        'Will Taylor Swift announce Eras Tour extension by January 15, 2025?',
        'Which song will be #1 on Billboard Hot 100 on New Year\'s Day 2025?',
        'Will the next iPhone be released before September 30, 2024?',
        'Will Bitcoin reach $100,000 before March 1, 2025?'
      ],
      badExamples: [
        {
          text: 'Is Drake the best rapper?',
          reason: 'Subjective opinion - no objective way to determine "best"'
        },
        {
          text: 'Will Drake ever tour again?',
          reason: 'No specific end date - could happen anytime in the future'
        },
        {
          text: 'Will Drake have a good year?',
          reason: 'Subjective and ambiguous - what defines "good"?'
        },
        {
          text: 'Will Drake release music AND go on tour?',
          reason: 'Multiple outcomes required - should be separate markets'
        }
      ],
      tips: [
        'Use specific dates and deadlines',
        'Ask questions that have clear yes/no or specific answers',
        'Avoid subjective words like "best", "good", "popular"',
        'Make sure outcomes can be verified with evidence',
        'Keep options mutually exclusive (only one can be true)',
        'Use 2-5 options maximum for clarity'
      ]
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Create matrix
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [];
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return 1 - (matrix[len1][len2] / maxLen);
  }

  /**
   * Validate a single field for real-time feedback
   */
  static validateField(field: keyof MarketCreationData, value: any): { errors: ValidationError[], warnings: ValidationWarning[] } {
    switch (field) {
      case 'title':
        return this.validateTitle(value);
      case 'description':
        return this.validateDescription(value);
      case 'endDate':
        return this.validateEndDate(value);
      case 'options':
        return this.validateOptions(value);
      default:
        return { errors: [], warnings: [] };
    }
  }

  /**
   * Check if market meets minimum resolvability criteria
   */
  static isResolvable(marketData: MarketCreationData): boolean {
    const validation = this.validateMarket(marketData);
    
    // Market is resolvable if it has no critical errors
    const criticalErrorCodes = [
      ValidationErrorCode.SUBJECTIVE_LANGUAGE,
      ValidationErrorCode.INVALID_END_DATE,
      ValidationErrorCode.INVALID_OPTION_COUNT,
      ValidationErrorCode.TITLE_REQUIRED,
      ValidationErrorCode.END_DATE_REQUIRED,
      ValidationErrorCode.OPTIONS_REQUIRED
    ];

    const hasCriticalErrors = validation.errors.some(error => 
      criticalErrorCodes.includes(error.code as ValidationErrorCode)
    );

    return !hasCriticalErrors;
  }
}