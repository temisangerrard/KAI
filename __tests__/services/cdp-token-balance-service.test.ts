/**
 * CDP Token Balance Service Tests
 */

import { TokenBalanceService, SupportedNetwork } from '@/lib/services/cdp-token-balance-service';
import { CDPApiClient, CDPTokenBalance, CDPApiClientError, CDPApiErrorType } from '@/lib/services/cdp-api-client';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';
import { beforeEach } from 'vitest';
import { describe } from 'vitest';

// Mock the CDP API Client
jest.mock('@/lib/services/cdp-api-client', () => ({
    CDPApiClient: {
        getAllTokenBalances: jest.fn(),
    },
    CDPApiClientError: jest.fn().mockImplementation((type, message, statusCode, retryable) => {
        const error = new Error(message);
        error.name = 'CDPApiClientError';
        (error as any).type = type;
        (error as any).statusCode = statusCode;
        (error as any).retryable = retryable;
        return error;
    }),
    CDPApiErrorType: {
        AUTHENTICATION_FAILED: 'authentication_failed',
        RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
        NETWORK_ERROR: 'network_error',
        SERVICE_UNAVAILABLE: 'service_unavailable',
        TIMEOUT: 'timeout',
    }
}));

const mockCDPApiClient = CDPApiClient as jest.Mocked<typeof CDPApiClient>;

describe('TokenBalanceService', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchAllTokenBalances', () => {
        it('should fetch tokens from all networks successfully', async () => {
            // Mock token data for different networks
            const mockBaseTokens: CDPTokenBalance[] = [
                {
                    amount: { amount: '1000000000000000000', decimals: 18 },
                    token: { network: 'base', symbol: 'ETH', name: 'Ethereum', contractAddress: '0x0000000000000000000000000000000000000000' }
                }
            ];

            const mockEthereumTokens: CDPTokenBalance[] = [
                {
                    amount: { amount: '2000000000000000000', decimals: 18 },
                    token: { network: 'ethereum', symbol: 'ETH', name: 'Ethereum', contractAddress: '0x0000000000000000000000000000000000000000' }
                }
            ];

            // Mock API responses for different networks
            mockCDPApiClient.getAllTokenBalances
                .mockResolvedValueOnce(mockBaseTokens) // base
                .mockResolvedValueOnce([]) // base-sepolia (no tokens)
                .mockResolvedValueOnce(mockEthereumTokens); // ethereum

            const result = await TokenBalanceService.fetchAllTokenBalances(testAddress);

            expect(result).toHaveLength(2);

            // Check Base ETH
            const baseEth = result.find(t => t.network === 'base' && t.symbol === 'ETH');
            expect(baseEth).toBeDefined();
            expect(baseEth?.formattedBalance).toBe('1');
            expect(baseEth?.isNative).toBe(true);

            // Check Ethereum ETH
            const ethEth = result.find(t => t.network === 'ethereum' && t.symbol === 'ETH');
            expect(ethEth).toBeDefined();
            expect(ethEth?.formattedBalance).toBe('2');

            // Verify API was called for all networks
            expect(mockCDPApiClient.getAllTokenBalances).toHaveBeenCalledTimes(3);
        });

        it('should validate address format', async () => {
            await expect(TokenBalanceService.fetchAllTokenBalances('invalid-address'))
                .rejects.toThrow('Invalid Ethereum address format');
        });
    });

    describe('fetchNetworkTokens', () => {
        it('should fetch tokens for a specific network', async () => {
            const mockTokens: CDPTokenBalance[] = [
                {
                    amount: { amount: '1500000000000000000', decimals: 18 },
                    token: { network: 'base', symbol: 'ETH', name: 'Ethereum', contractAddress: '0x0000000000000000000000000000000000000000' }
                }
            ];

            mockCDPApiClient.getAllTokenBalances.mockResolvedValue(mockTokens);

            const result = await TokenBalanceService.fetchNetworkTokens('base', testAddress);

            expect(result).toHaveLength(1);
            expect(result[0].network).toBe('base');
            expect(result[0].symbol).toBe('ETH');
            expect(result[0].formattedBalance).toBe('1.5');
        });

        it('should filter out zero balance tokens', async () => {
            const mockTokens: CDPTokenBalance[] = [
                {
                    amount: { amount: '1000000000000000000', decimals: 18 },
                    token: { network: 'base', symbol: 'ETH', name: 'Ethereum', contractAddress: '0x0000000000000000000000000000000000000000' }
                },
                {
                    amount: { amount: '0', decimals: 6 },
                    token: { network: 'base', symbol: 'USDC', name: 'USD Coin', contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
                }
            ];

            mockCDPApiClient.getAllTokenBalances.mockResolvedValue(mockTokens);

            const result = await TokenBalanceService.fetchNetworkTokens('base', testAddress);

            // Should only return ETH (non-zero balance)
            expect(result).toHaveLength(1);
            expect(result[0].symbol).toBe('ETH');
        });
    });

    describe('utility methods', () => {
        it('should return supported networks', () => {
            const networks = TokenBalanceService.getSupportedNetworks();
            expect(networks).toEqual(['base', 'base-sepolia', 'ethereum']);
        });

        it('should check network support', () => {
            expect(TokenBalanceService.isNetworkSupported('base')).toBe(true);
            expect(TokenBalanceService.isNetworkSupported('ethereum')).toBe(true);
            expect(TokenBalanceService.isNetworkSupported('unsupported')).toBe(false);
        });
    });
});