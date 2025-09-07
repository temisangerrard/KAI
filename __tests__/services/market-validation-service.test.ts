/**
 * Market Validation Service Tests
 * Comprehensive test suite for market creation validation
 */

import { 
  MarketValidationService, 
  ValidationErrorCode, 
  ValidationWarningCode,
  MarketCreationData 
} from '@/lib/services/market-validation-service';

describe('MarketValidationService', () => {
  describe('validateTitle', () => {
    it('should pass validation for good titles', () => {
      const goodTitles = [
        'Will Drake release an album before December 31, 2024?',
        'Will Taylor Swift announce tour dates by March 1, 2025?',
        'Which artist will have #1 album in Q1 2025?'
      ];

      goodTitles.forEach(title => {
        const result = MarketValidationService.validateTitle(title);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty or missing titles', () => {
      const invalidTitles = ['', '   ', null, undefined];

      invalidTitles.forEach(title => {
        const result = MarketValidationService.validateTitle(title as any);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationErrorCode.TITLE_REQUIRED);
      });
    });

    it('should reject titles that are too short', () => {
      const shortTitle = 'Short?';
      const result = MarketValidationService.validateTitle(shortTitle);
      
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Market title must be at least 10 characters long',
        code: ValidationErrorCode.TITLE_TOO_SHORT
      });
    });

    it('should reject titles with subjective language', () => {
      const subjectiveTitles = [
        'Is Drake the best rapper?',
        'Will this be a good movie?',
        'Who is the worst player?',
        'Which is the most beautiful city?'
      ];

      subjectiveTitles.forEach(title => {
        const result = MarketValidationService.validateTitle(title);
        expect(result.errors.some(e => e.code === ValidationErrorCode.SUBJECTIVE_LANGUAGE)).toBe(true);
      });
    });

    it('should warn about ambiguous language', () => {
      const ambiguousTitles = [
        'Will Drake release music soon?',
        'Will Bitcoin probably reach $100k?',
        'Will there be approximately 10 movies released?'
      ];

      ambiguousTitles.forEach(title => {
        const result = MarketValidationService.validateTitle(title);
        expect(result.warnings.some(w => w.code === ValidationWarningCode.AMBIGUOUS_LANGUAGE)).toBe(true);
      });
    });

    it('should warn about non-question format', () => {
      const nonQuestionTitle = 'Drake will release an album before December 31, 2024';
      const result = MarketValidationService.validateTitle(nonQuestionTitle);
      
      expect(result.warnings.some(w => w.code === ValidationWarningCode.AMBIGUOUS_LANGUAGE)).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should pass validation for good descriptions', () => {
      const goodDescription = 'This market will resolve based on official announcements from Drake\'s record label or verified social media accounts.';
      const result = MarketValidationService.validateDescription(goodDescription);
      
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty or missing descriptions', () => {
      const invalidDescriptions = ['', '   ', null, undefined];

      invalidDescriptions.forEach(description => {
        const result = MarketValidationService.validateDescription(description as any);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationErrorCode.DESCRIPTION_REQUIRED);
      });
    });

    it('should reject descriptions that are too short', () => {
      const shortDescription = 'Short desc';
      const result = MarketValidationService.validateDescription(shortDescription);
      
      expect(result.errors).toContainEqual({
        field: 'description',
        message: 'Market description must be at least 20 characters long to provide sufficient context',
        code: ValidationErrorCode.DESCRIPTION_TOO_SHORT
      });
    });
  });

  describe('validateEndDate', () => {
    it('should pass validation for future dates within 12 months', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      
      const result = MarketValidationService.validateEndDate(futureDate);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing end dates', () => {
      const result = MarketValidationService.validateEndDate(null as any);
      
      expect(result.errors).toContainEqual({
        field: 'endDate',
        message: 'Markets must have a specific end date when the outcome will be known',
        code: ValidationErrorCode.END_DATE_REQUIRED
      });
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const result = MarketValidationService.validateEndDate(pastDate);
      
      expect(result.errors).toContainEqual({
        field: 'endDate',
        message: 'Market end date must be in the future',
        code: ValidationErrorCode.INVALID_END_DATE
      });
    });

    it('should reject dates more than 12 months in the future', () => {
      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 2);
      
      const result = MarketValidationService.validateEndDate(farFutureDate);
      
      expect(result.errors).toContainEqual({
        field: 'endDate',
        message: 'Market end date cannot be more than 12 months in the future',
        code: ValidationErrorCode.END_DATE_TOO_FAR
      });
    });

    it('should warn about very soon end dates', () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12); // 12 hours from now
      
      const result = MarketValidationService.validateEndDate(soonDate);
      
      expect(result.warnings).toContainEqual({
        field: 'endDate',
        message: 'Market ends very soon (less than 24 hours). Consider extending to allow more participation.',
        code: ValidationWarningCode.END_DATE_VERY_SOON
      });
    });

    it('should warn about far future end dates', () => {
      const farDate = new Date();
      farDate.setMonth(farDate.getMonth() + 8); // 8 months from now
      
      const result = MarketValidationService.validateEndDate(farDate);
      
      expect(result.warnings).toContainEqual({
        field: 'endDate',
        message: 'Market ends far in the future (more than 6 months). Long-term markets may be harder to predict accurately.',
        code: ValidationWarningCode.END_DATE_FAR_FUTURE
      });
    });
  });

  describe('validateOptions', () => {
    it('should pass validation for good options', () => {
      const goodOptions = [
        { id: 'yes', text: 'Yes' },
        { id: 'no', text: 'No' }
      ];
      
      const result = MarketValidationService.validateOptions(goodOptions);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing or empty options array', () => {
      const invalidOptions = [null, undefined, []];

      invalidOptions.forEach(options => {
        const result = MarketValidationService.validateOptions(options as any);
        expect(result.errors).toContainEqual({
          field: 'options',
          message: 'Markets must have prediction options',
          code: ValidationErrorCode.OPTIONS_REQUIRED
        });
      });
    });

    it('should reject less than 2 options', () => {
      const singleOption = [{ id: 'yes', text: 'Yes' }];
      const result = MarketValidationService.validateOptions(singleOption);
      
      expect(result.errors).toContainEqual({
        field: 'options',
        message: 'Markets must have at least 2 options',
        code: ValidationErrorCode.INVALID_OPTION_COUNT
      });
    });

    it('should reject more than 5 options', () => {
      const tooManyOptions = [
        { id: '1', text: 'Option 1' },
        { id: '2', text: 'Option 2' },
        { id: '3', text: 'Option 3' },
        { id: '4', text: 'Option 4' },
        { id: '5', text: 'Option 5' },
        { id: '6', text: 'Option 6' }
      ];
      
      const result = MarketValidationService.validateOptions(tooManyOptions);
      
      expect(result.errors).toContainEqual({
        field: 'options',
        message: 'Markets cannot have more than 5 options to keep them simple and focused',
        code: ValidationErrorCode.INVALID_OPTION_COUNT
      });
    });

    it('should reject empty option text', () => {
      const emptyTextOptions = [
        { id: 'yes', text: 'Yes' },
        { id: 'no', text: '' }
      ];
      
      const result = MarketValidationService.validateOptions(emptyTextOptions);
      
      expect(result.errors).toContainEqual({
        field: 'options',
        message: 'All options must have text',
        code: ValidationErrorCode.EMPTY_OPTION_TEXT
      });
    });

    it('should reject duplicate options', () => {
      const duplicateOptions = [
        { id: 'yes1', text: 'Yes' },
        { id: 'yes2', text: 'Yes' }
      ];
      
      const result = MarketValidationService.validateOptions(duplicateOptions);
      
      expect(result.errors).toContainEqual({
        field: 'options',
        message: 'Options must be unique and mutually exclusive',
        code: ValidationErrorCode.DUPLICATE_OPTIONS
      });
    });

    it('should warn about similar options', () => {
      const similarOptions = [
        { id: 'drake1', text: 'Drake wins' },
        { id: 'drake2', text: 'Drake win' }
      ];
      
      const result = MarketValidationService.validateOptions(similarOptions);
      
      expect(result.warnings.some(w => w.code === ValidationWarningCode.SIMILAR_OPTIONS)).toBe(true);
    });

    it('should warn about vague option text', () => {
      const vagueOptions = [
        { id: 'specific', text: 'Drake' },
        { id: 'vague', text: 'Other artist' }
      ];
      
      const result = MarketValidationService.validateOptions(vagueOptions);
      
      expect(result.warnings.some(w => w.code === ValidationWarningCode.VAGUE_OPTION_TEXT)).toBe(true);
    });
  });

  describe('validateMarket', () => {
    const createValidMarket = (): MarketCreationData => ({
      title: 'Will Drake release an album before December 31, 2024?',
      description: 'This market will resolve based on official announcements from Drake\'s record label or verified social media accounts.',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      options: [
        { id: 'yes', text: 'Yes' },
        { id: 'no', text: 'No' }
      ]
    });

    it('should pass validation for a complete valid market', () => {
      const validMarket = createValidMarket();
      const result = MarketValidationService.validateMarket(validMarket);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when multiple fields have errors', () => {
      const invalidMarket: MarketCreationData = {
        title: 'Bad', // Too short
        description: 'Short', // Too short
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        options: [{ id: 'only', text: 'Only option' }] // Not enough options
      };
      
      const result = MarketValidationService.validateMarket(invalidMarket);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it('should collect warnings from all fields', () => {
      const warningMarket: MarketCreationData = {
        title: 'Will Drake probably release music soon', // Ambiguous language, no question mark
        description: 'This market will resolve based on official announcements from Drake\'s record label.',
        endDate: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000), // 8 months from now
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'other', text: 'Other outcome' } // Vague option
        ]
      };
      
      const result = MarketValidationService.validateMarket(warningMarket);
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateField', () => {
    it('should validate individual fields correctly', () => {
      const titleResult = MarketValidationService.validateField('title', 'Will Drake release an album?');
      expect(titleResult.errors).toHaveLength(0);

      const badTitleResult = MarketValidationService.validateField('title', 'Bad');
      expect(badTitleResult.errors.length).toBeGreaterThan(0);
    });

    it('should return empty results for unknown fields', () => {
      const result = MarketValidationService.validateField('unknownField' as any, 'value');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('isResolvable', () => {
    it('should return true for resolvable markets', () => {
      const resolvableMarket: MarketCreationData = {
        title: 'Will Drake release an album before December 31, 2024?',
        description: 'This market will resolve based on official announcements.',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ]
      };
      
      expect(MarketValidationService.isResolvable(resolvableMarket)).toBe(true);
    });

    it('should return false for unresolvable markets', () => {
      const unresolvableMarket: MarketCreationData = {
        title: 'Is Drake the best rapper?', // Subjective
        description: 'This is subjective.',
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        options: [{ id: 'yes', text: 'Yes' }] // Not enough options
      };
      
      expect(MarketValidationService.isResolvable(unresolvableMarket)).toBe(false);
    });
  });

  describe('getValidationGuidance', () => {
    it('should return comprehensive guidance', () => {
      const guidance = MarketValidationService.getValidationGuidance();
      
      expect(guidance.goodExamples).toHaveLength(5);
      expect(guidance.badExamples).toHaveLength(4);
      expect(guidance.tips).toHaveLength(6);
      
      // Check structure of bad examples
      guidance.badExamples.forEach(example => {
        expect(example).toHaveProperty('text');
        expect(example).toHaveProperty('reason');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => MarketValidationService.validateTitle(null as any)).not.toThrow();
      expect(() => MarketValidationService.validateDescription(undefined as any)).not.toThrow();
      expect(() => MarketValidationService.validateEndDate(null as any)).not.toThrow();
      expect(() => MarketValidationService.validateOptions(undefined as any)).not.toThrow();
    });

    it('should handle empty strings and whitespace', () => {
      const emptyStringResult = MarketValidationService.validateTitle('   ');
      expect(emptyStringResult.errors).toHaveLength(1);
      expect(emptyStringResult.errors[0].code).toBe(ValidationErrorCode.TITLE_REQUIRED);
    });

    it('should handle options with whitespace-only text', () => {
      const whitespaceOptions = [
        { id: 'yes', text: 'Yes' },
        { id: 'empty', text: '   ' }
      ];
      
      const result = MarketValidationService.validateOptions(whitespaceOptions);
      expect(result.errors.some(e => e.code === ValidationErrorCode.EMPTY_OPTION_TEXT)).toBe(true);
    });

    it('should handle very long titles and descriptions', () => {
      const longTitle = 'A'.repeat(1000) + '?';
      const longDescription = 'B'.repeat(10000);
      
      const titleResult = MarketValidationService.validateTitle(longTitle);
      const descResult = MarketValidationService.validateDescription(longDescription);
      
      // Should not error on length (no max length validation currently)
      expect(titleResult.errors.filter(e => e.code === ValidationErrorCode.TITLE_TOO_SHORT)).toHaveLength(0);
      expect(descResult.errors.filter(e => e.code === ValidationErrorCode.DESCRIPTION_TOO_SHORT)).toHaveLength(0);
    });

    it('should handle special characters in titles and options', () => {
      const specialCharTitle = 'Will Drake release "Album #2" before 2024?';
      const specialCharOptions = [
        { id: 'yes', text: 'Yes (100%)' },
        { id: 'no', text: 'No & Never' }
      ];
      
      const titleResult = MarketValidationService.validateTitle(specialCharTitle);
      const optionsResult = MarketValidationService.validateOptions(specialCharOptions);
      
      expect(titleResult.errors).toHaveLength(0);
      expect(optionsResult.errors).toHaveLength(0);
    });
  });

  describe('String Similarity', () => {
    it('should detect similar option texts', () => {
      const similarOptions = [
        { id: '1', text: 'Drake will win the Grammy' },
        { id: '2', text: 'Drake will win Grammy' }
      ];
      
      const result = MarketValidationService.validateOptions(similarOptions);
      expect(result.warnings.some(w => w.code === ValidationWarningCode.SIMILAR_OPTIONS)).toBe(true);
    });

    it('should not flag dissimilar options', () => {
      const dissimilarOptions = [
        { id: '1', text: 'Drake' },
        { id: '2', text: 'Taylor Swift' }
      ];
      
      const result = MarketValidationService.validateOptions(dissimilarOptions);
      expect(result.warnings.some(w => w.code === ValidationWarningCode.SIMILAR_OPTIONS)).toBe(false);
    });
  });
});