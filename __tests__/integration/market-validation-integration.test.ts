/**
 * Market Validation Integration Tests
 * Tests integration between MarketValidationService and validation schemas
 */

import { MarketValidationService, MarketCreationData } from '@/lib/services/market-validation-service';
import { 
  validateMarketCreationData, 
  validateMarketValidationResult 
} from '@/lib/validation/token-schemas';

describe('Market Validation Integration', () => {
  describe('Schema Integration', () => {
    it('should validate MarketCreationData with Zod schema', () => {
      const validMarketData: MarketCreationData = {
        title: 'Will Drake release an album before December 31, 2024?',
        description: 'This market will resolve based on official announcements from Drake\'s record label.',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ],
        category: 'music'
      };

      // Should pass Zod validation
      expect(() => validateMarketCreationData(validMarketData)).not.toThrow();

      // Should pass business logic validation
      const result = MarketValidationService.validateMarket(validMarketData);
      expect(result.isValid).toBe(true);
    });

    it('should validate MarketValidationResult with Zod schema', () => {
      const marketData: MarketCreationData = {
        title: 'Will Drake release an album before December 31, 2024?',
        description: 'This market will resolve based on official announcements.',
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ]
      };

      const validationResult = MarketValidationService.validateMarket(marketData);

      // Should pass Zod validation for the result structure
      expect(() => validateMarketValidationResult(validationResult)).not.toThrow();
    });

    it('should handle invalid MarketCreationData with Zod schema', () => {
      const invalidMarketData = {
        title: '', // Invalid: empty title
        description: '', // Invalid: empty description
        endDate: 'not-a-date', // Invalid: not a date
        options: [], // Invalid: no options
      };

      // Should fail Zod validation
      expect(() => validateMarketCreationData(invalidMarketData)).toThrow();
    });
  });

  describe('End-to-End Validation Flow', () => {
    it('should handle complete validation workflow', () => {
      // Step 1: Create market data
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3); // 3 months from now
      
      const marketData: MarketCreationData = {
        title: 'Will Taylor Swift announce tour dates by the end of this year?',
        description: 'This market will resolve based on official announcements from Taylor Swift or her management team.',
        endDate: futureDate,
        options: [
          { id: 'yes', text: 'Yes' },
          { id: 'no', text: 'No' }
        ],
        category: 'music'
      };

      // Step 2: Validate with Zod schema
      const schemaValidation = () => validateMarketCreationData(marketData);
      expect(schemaValidation).not.toThrow();

      // Step 3: Validate with business logic
      const businessValidation = MarketValidationService.validateMarket(marketData);
      
      // Debug: log any errors
      if (!businessValidation.isValid) {
        console.log('Validation errors:', businessValidation.errors);
        console.log('Validation warnings:', businessValidation.warnings);
      }
      
      expect(businessValidation.isValid).toBe(true);
      expect(businessValidation.errors).toHaveLength(0);

      // Step 4: Check resolvability
      const isResolvable = MarketValidationService.isResolvable(marketData);
      expect(isResolvable).toBe(true);

      // Step 5: Validate result structure
      const resultValidation = () => validateMarketValidationResult(businessValidation);
      expect(resultValidation).not.toThrow();
    });

    it('should handle validation workflow with errors', () => {
      // Step 1: Create problematic market data
      const problematicMarketData: MarketCreationData = {
        title: 'Is Drake the best rapper?', // Subjective language
        description: 'Short', // Too short
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        options: [
          { id: 'yes', text: 'Yes' }
          // Missing second option
        ]
      };

      // Step 2: Validate with business logic (should have errors)
      const businessValidation = MarketValidationService.validateMarket(problematicMarketData);
      expect(businessValidation.isValid).toBe(false);
      expect(businessValidation.errors.length).toBeGreaterThan(0);

      // Step 3: Check resolvability (should be false)
      const isResolvable = MarketValidationService.isResolvable(problematicMarketData);
      expect(isResolvable).toBe(false);

      // Step 4: Result structure should still be valid
      const resultValidation = () => validateMarketValidationResult(businessValidation);
      expect(resultValidation).not.toThrow();
    });
  });

  describe('Real-time Validation Scenarios', () => {
    it('should support field-by-field validation for UI', () => {
      // Simulate real-time validation as user types
      
      // Title validation
      let titleResult = MarketValidationService.validateField('title', 'Will');
      expect(titleResult.errors.length).toBeGreaterThan(0); // Too short
      
      titleResult = MarketValidationService.validateField('title', 'Will Drake release an album?');
      expect(titleResult.errors).toHaveLength(0); // Valid
      
      // Description validation
      let descResult = MarketValidationService.validateField('description', 'Short');
      expect(descResult.errors.length).toBeGreaterThan(0); // Too short
      
      descResult = MarketValidationService.validateField('description', 'This market will resolve based on official announcements.');
      expect(descResult.errors).toHaveLength(0); // Valid
      
      // End date validation
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let dateResult = MarketValidationService.validateField('endDate', pastDate);
      expect(dateResult.errors.length).toBeGreaterThan(0); // Past date
      
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      dateResult = MarketValidationService.validateField('endDate', futureDate);
      expect(dateResult.errors).toHaveLength(0); // Valid
      
      // Options validation
      let optionsResult = MarketValidationService.validateField('options', []);
      expect(optionsResult.errors.length).toBeGreaterThan(0); // No options
      
      optionsResult = MarketValidationService.validateField('options', [
        { id: 'yes', text: 'Yes' },
        { id: 'no', text: 'No' }
      ]);
      expect(optionsResult.errors).toHaveLength(0); // Valid
    });
  });

  describe('Validation Guidance Integration', () => {
    it('should provide comprehensive guidance for UI', () => {
      const guidance = MarketValidationService.getValidationGuidance();
      
      // Should have all required sections
      expect(guidance.goodExamples).toBeDefined();
      expect(guidance.badExamples).toBeDefined();
      expect(guidance.tips).toBeDefined();
      
      // Should have meaningful content
      expect(guidance.goodExamples.length).toBeGreaterThan(0);
      expect(guidance.badExamples.length).toBeGreaterThan(0);
      expect(guidance.tips.length).toBeGreaterThan(0);
      
      // Bad examples should have reasons
      guidance.badExamples.forEach(example => {
        expect(example.text).toBeDefined();
        expect(example.reason).toBeDefined();
        expect(example.text.length).toBeGreaterThan(0);
        expect(example.reason.length).toBeGreaterThan(0);
      });
    });
  });
});