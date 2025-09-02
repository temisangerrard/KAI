/**
 * Tests for CDP API Client
 */

import { CDPApiClient, CDPApiClientError, CDPApiErrorType } from '@/lib/services/cdp-api-client';

// Mock fetch globally
global.fetch = jest.fn();

describe('CDPApiClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CDP_API_KEY_NAME = 'test-key-name';
        process.env.CDP_API_KEY_SECRET = Buffer.from('test-secret').toString('base64');
    });

    afterEach(() => {
        delete process.env.CDP_API_KEY_NAME;
        delete process.env.CDP_API_KEY_SECRET;
    });

    describe('verifyConfiguration', () => {
        it('should return valid when environment variables are set correctly', () => {
            process.env.CDP_API_KEY_NAME = '12345678-1234-1234-1234-123456789012';
            process.env.CDP_API_KEY_SECRET = Buffer.from('valid-secret').toString('base64');

            const result = CDPApiClient.verifyConfiguration();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return invalid when API key name is missing', () => {
            delete process.env.CDP_API_KEY_NAME;

            const result = CDPApiClient.verifyConfiguration();
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('CDP_API_KEY_NAME environment variable is not set');
        });
    });

    describe('getSupportedNetworks', () => {
        it('should return correct supported networks', () => {
            const networks = CDPApiClient.getSupportedNetworks();
            expect(networks).toEqual(['base', 'base-sepolia', 'ethereum']);
        });
    });

    describe('isNetworkSupported', () => {
        it('should return true for supported networks', () => {
            expect(CDPApiClient.isNetworkSupported('base')).toBe(true);
            expect(CDPApiClient.isNetworkSupported('base-sepolia')).toBe(true);
            expect(CDPApiClient.isNetworkSupported('ethereum')).toBe(true);
        });

        it('should return false for unsupported networks', () => {
            expect(CDPApiClient.isNetworkSupported('polygon')).toBe(false);
            expect(CDPApiClient.isNetworkSupported('arbitrum')).toBe(false);
        });
    });
});