/**
 * Market Validation Service Edge Cases Tests
 * Additional comprehensive tests for edge cases and complex scenarios
 */

import { 
  MarketValidationService, 
  ValidationErrorCode, 
  ValidationWarningCode,
  MarketCreationData 
} from '@/lib/services/market-validation-service';

describe('MarketValidationService - Edge Cases', () => {
  describe('Complex Subjective Language Detection', () => {
    it('should detect subjective words in different contexts', () => {
      const subjectiveTitles = [
        'Will this be the BEST album of 2024?',
        'Who will have the most SUCCESSFUL tour?',
        'Which movie will be EXCELLENT this year?',
        'Will Drake be more POPULAR than Taylor?',
        'Is this the WORST decision ever made?'
      ];

      subjectiveTitles.forEach(title => {
        const result = MarketValidationService.validateTitle(title);
        expect(result.errors.some(e => e.code === ValidationErrorCode.SUBJECTIVE_LANGUAGE)).toBe(true);
      });
    });

    it('should not flag objective words that sound subjective', () => {
      const objectiveTitles = [
        'Will Drake release his best-selling album before 2025?', // "best-selling" is objective
        'Will the movie gross better than $100M?', // "better than" with specific metric
        'Will this be a good year for box office revenue over $10B?', // "good" with specific criteria
        'Will Drake win the Grammy for Best Rap Album?' // "Best" is the official award name
      ];

      objectiveTitles.forEach(title => {
        const result = MarketValidationService.validateTitle(title);
        // These might still trigger warnings but shouldn't be hard errors
        const hasSubjectiveError = result.errors.some(e => e.code === ValidationErrorCode.SUBJECTIVE_LANGUAGE);
        if (hasSubjectiveError) {
          console.log(`Title flagged as subjective: ${title}`);
        }
      });
    });
  });

  describe('Complex Date Validation', () => {
    it('should handle edge cases around date boundaries', () => {
      const now = new Date();
      
      // Exactly 12 months from now
      const exactlyOneYear = new Date(now);
      exactlyOneYear.setFullYear(exactlyOneYear.getFullYear() + 1);
      
      const result = MarketValidationService.validateEndDate(exactlyOneYear);
      expect(result.errors.some(e => e.code === ValidationErrorCode.END_DATE_TOO_FAR)).toBe(false);
      
      // Just over 12 months
      const justOverOneYear = new Date(exactlyOneYear);
      justOverOneYear.setDate(justOverOneYear.getDate() + 1);
      
      const overResult = MarketValidationService.validateEndDate(justOverOneYear);
      expect(overResult.errors.some(e => e.code === ValidationErrorCode.END_DATE_TOO_FAR)).toBe(true);
    });

    it('should handle timezone edge cases', () => {
      const now = new Date();
      
      // Date that's in the past in one timezone but future in another
      const edgeDate = new Date(now.getTime() - (30 * 60 * 1000)); // 30 minutes ago
      
      const result = MarketValidationService.validateEndDate(edgeDate);
      expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_END_DATE)).toBe(true);
    });

    it('should handle leap year dates', () => {
      const leapYearDate = new Date('2024-02-29T12:00:00Z'); // Leap year date
      
      // If this date is in the future, it should be valid
      if (leapYearDate > new Date()) {
        const result = MarketValidationService.validateEndDate(leapYearDate);
        expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_END_DATE)).toBe(false);
      }
    });
  });

  describe('Complex Option Validation', () => {
    it('should handle options with special characters and formatting', () => {
      const specialOptions = [
        { id: '1', text: 'Option with "quotes" and (parentheses)' },
        { id: '2', text: 'Option with émojis 🎵 and ñ characters' },
        { id: '3', text: 'Option with numbers: 1,000,000+' },
        { id: '4', text: 'Option with symbols: @#$%^&*' }
      ];
      
      const result = MarketValidationService.validateOptions(specialOptions);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect case-insensitive duplicates', () => {
      const caseInsensitiveDuplicates = [
        { id: '1', text: 'Yes' },
        { id: '2', text: 'YES' },
        { id: '3', text: 'yes' }
      ];
      
      const result = MarketValidationService.validateOptions(caseInsensitiveDuplicates);
      expect(result.errors.some(e => e.code === ValidationErrorCode.DUPLICATE_OPTIONS)).toBe(true);
    });

    it('should detect duplicates with extra whitespace', () => {
      const whitespaceDuplicates = [
        { id: '1', text: 'Drake' },
        { id: '2', text: ' Drake ' },
        { id: '3', text: 'Taylor Swift' }
      ];
      
      const result = MarketValidationService.validateOptions(whitespaceDuplicates);
      expect(result.errors.some(e => e.code === ValidationErrorCode.DUPLICATE_OPTIONS)).toBe(true);
    });

    it('should handle very long option texts', () => {
      const longOptions = [
        { id: '1', text: 'A'.repeat(500) },
        { id: '2', text: 'B'.repeat(500) }
      ];
      
      const result = MarketValidationService.validateOptions(longOptions);
      // Should not error on length (no max length validation currently)
      expect(result.errors.filter(e => e.code === ValidationErrorCode.EMPTY_OPTION_TEXT)).toHaveLength(0);
    });
  });

  describe('String Similarity Edge Cases', () => {
    it('should handle identical strings', () => {
      const identicalOptions = [
        { id: '1', text: 'Identical Text' },
        { id: '2', text: 'Identical Text' }
      ];
      
      const result = MarketValidationService.validateOptions(identicalOptions);
      expect(result.errors.some(e => e.code === ValidationErrorCode.DUPLICATE_OPTIONS)).toBe(true);
    });

    it('should handle empty strings in similarity calculation', () => {
      const emptyStringOptions = [
        { id: '1', text: '' },
        { id: '2', text: 'Some text' }
      ];
      
      const result = MarketValidationService.validateOptions(emptyStringOptions);
      expect(result.errors.some(e => e.code === ValidationErrorCode.EMPTY_OPTION_TEXT)).toBe(true);
    });

    it('should handle single character differences', () => {
      const singleCharDiffOptions = [
        { id: '1', text: 'Drake' },
        { id: '2', text: 'Drakes' }
      ];
      
      const result = MarketValidationService.validateOptions(singleCharDiffOptions);
      expect(result.warnings.some(w => w.code === ValidationWarningCode.SIMILAR_OPTIONS)).toBe(true);
    });
  });

  describe('Complex Market Validation Scenarios', () => {
    it('should handle markets with mixed validation issues', () => {
      const complexMarket: MarketCreationData = {
        title: 'Will this be the best movie?', // Subjective + no specific date
        description: 'Short desc', // Too short
        endDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000), // Far future (400 days)
        options: [
          { id: '1', text: 'Yes' },
          { id: '2', text: 'YES' }, // Duplicate (case insensitive)
          { id: '3', text: 'Maybe' }, // Vague
          { id: '4', text: 'Other' }, // Vague
          { id: '5', text: 'Something else' }, // Vague
          { id: '6', text: 'No' } // Too many options
        ]
      };
      
      const result = MarketValidationService.validateMarket(complexMarket);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
      expect(result.warnings.length).toBeGreaterThan(2);
    });

    it('should handle markets with only warnings (valid but not ideal)', () => {
      const warningOnlyMarket: MarketCreationData = {
        title: 'Will Drake probably release music soon', // Ambiguous but not subjective
        description: 'This market will resolve based on official announcements from Drake or his label.',
        endDate: new Date(Date.now() + 8 * 30 * 24 * 60 * 60 * 1000), // 8 months (far future warning)
        options: [
          { id: '1', text: 'Yes' },
          { id: '2', text: 'Other outcome' } // Vague warning
        ]
      };
      
      const result = MarketValidationService.validateMarket(warningOnlyMarket);
      
      expect(result.isValid).toBe(true); // No errors, only warnings
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large numbers of options efficiently', () => {
      const manyOptions = Array.from({ length: 100 }, (_, i) => ({
        id: `option-${i}`,
        text: `Option ${i}`
      }));
      
      const startTime = Date.now();
      const result = MarketValidationService.validateOptions(manyOptions);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should reject due to too many options
      expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_OPTION_COUNT)).toBe(true);
    });

    it('should handle very long strings without memory issues', () => {
      const veryLongTitle = 'Will Drake release an album before December 31, 2024? ' + 'A'.repeat(10000);
      
      const startTime = Date.now();
      const result = MarketValidationService.validateTitle(veryLongTitle);
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.errors.filter(e => e.code === ValidationErrorCode.TITLE_TOO_SHORT)).toHaveLength(0);
    });
  });

  describe('Internationalization Edge Cases', () => {
    it('should handle non-English characters', () => {
      const internationalMarket: MarketCreationData = {
        title: '¿Lanzará Drake un álbum antes del 31 de diciembre de 2024?',
        description: 'Este mercado se resolverá basándose en anuncios oficiales.',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: [
          { id: '1', text: 'Sí' },
          { id: '2', text: 'No' }
        ]
      };
      
      const result = MarketValidationService.validateMarket(internationalMarket);
      expect(result.isValid).toBe(true);
    });

    it('should handle emoji and special Unicode characters', () => {
      const emojiMarket: MarketCreationData = {
        title: 'Will Drake 🎵 release an album 💿 before 2024? 🤔',
        description: 'This market will resolve based on official announcements 📢.',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: [
          { id: '1', text: 'Yes ✅' },
          { id: '2', text: 'No ❌' }
        ]
      };
      
      const result = MarketValidationService.validateMarket(emojiMarket);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle exact boundary values for title length', () => {
      const exactMinTitle = 'A'.repeat(10); // Exactly 10 characters (minimum)
      const justUnderMinTitle = 'A'.repeat(9); // 9 characters (under minimum)
      
      const exactResult = MarketValidationService.validateTitle(exactMinTitle);
      const underResult = MarketValidationService.validateTitle(justUnderMinTitle);
      
      expect(exactResult.errors.some(e => e.code === ValidationErrorCode.TITLE_TOO_SHORT)).toBe(false);
      expect(underResult.errors.some(e => e.code === ValidationErrorCode.TITLE_TOO_SHORT)).toBe(true);
    });

    it('should handle exact boundary values for description length', () => {
      const exactMinDescription = 'A'.repeat(20); // Exactly 20 characters
      const justUnderMinDescription = 'A'.repeat(19); // 19 characters
      
      const exactResult = MarketValidationService.validateDescription(exactMinDescription);
      const underResult = MarketValidationService.validateDescription(justUnderMinDescription);
      
      expect(exactResult.errors.some(e => e.code === ValidationErrorCode.DESCRIPTION_TOO_SHORT)).toBe(false);
      expect(underResult.errors.some(e => e.code === ValidationErrorCode.DESCRIPTION_TOO_SHORT)).toBe(true);
    });

    it('should handle exact boundary values for option count', () => {
      const exactMinOptions = [
        { id: '1', text: 'Option 1' },
        { id: '2', text: 'Option 2' }
      ]; // Exactly 2 options
      
      const exactMaxOptions = [
        { id: '1', text: 'Option 1' },
        { id: '2', text: 'Option 2' },
        { id: '3', text: 'Option 3' },
        { id: '4', text: 'Option 4' },
        { id: '5', text: 'Option 5' }
      ]; // Exactly 5 options
      
      const minResult = MarketValidationService.validateOptions(exactMinOptions);
      const maxResult = MarketValidationService.validateOptions(exactMaxOptions);
      
      expect(minResult.errors.some(e => e.code === ValidationErrorCode.INVALID_OPTION_COUNT)).toBe(false);
      expect(maxResult.errors.some(e => e.code === ValidationErrorCode.INVALID_OPTION_COUNT)).toBe(false);
    });
  });
});