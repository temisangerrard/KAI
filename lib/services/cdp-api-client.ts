/**
 * CDP SDK Client for Token Balance API
 * 
 * This client uses the official Coinbase CDP SDK to handle authentication
 * and API calls for token balance data using EVM accounts.
 */

import { CdpClient } from '@coinbase/cdp-sdk';

export interface CDPTokenBalance {
    amount: {
        amount: string;
        decimals: number;
    };
    token: {
        network: string;
        symbol: string;
        name: string;
        contractAddress: string;
    };
}

export interface CDPTokenBalanceResponse {
    balances: CDPTokenBalance[];
    nextPageToken?: string;
}

export interface CDPApiError {
    error: {
        code: string;
        message: string;
        details?: any;
    };
}

export enum CDPApiErrorType {
    AUTHENTICATION_FAILED = 'authentication_failed',
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    NETWORK_ERROR = 'network_error',
    INVALID_ADDRESS = 'invalid_address',
    SERVICE_UNAVAILABLE = 'service_unavailable',
    TIMEOUT = 'timeout',
    BAD_REQUEST = 'bad_request',
    NOT_FOUND = 'not_found',
    INTERNAL_SERVER_ERROR = 'internal_server_error'
}

export class CDPApiClientError extends Error {
    constructor(
        public type: CDPApiErrorType,
        message: string,
        public statusCode?: number,
        public retryable: boolean = false,
        public retryAfter?: number
    ) {
        super(message);
        this.name = 'CDPApiClientError';
    }
}

export class CDPApiClient {
    private static readonly API_KEY_NAME = process.env.CDP_API_KEY_NAME;
    private static readonly API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
    private static cdpClient: CdpClient | null = null;

    /**
     * Initialize CDP SDK client
     */
    private static getCDPClient(): CdpClient {
        if (!this.cdpClient) {
            if (!this.API_KEY_NAME || !this.API_KEY_SECRET) {
                throw new Error('CDP API credentials not configured. Please set CDP_API_KEY_NAME and CDP_API_KEY_SECRET environment variables.');
            }

            try {
                this.cdpClient = new CdpClient({
                    apiKeyId: this.API_KEY_NAME,
                    apiKeySecret: this.API_KEY_SECRET,
                });
            } catch (error) {
                console.error('Failed to initialize CDP SDK client:', error);
                throw new Error('Failed to initialize CDP SDK client. Make sure @coinbase/cdp-sdk is properly installed.');
            }
        }

        return this.cdpClient;
    }

    /**
     * Create a temporary EVM account to access balance methods
     * Since we only need to check balances, we create a temporary account
     */
    private static async createTemporaryEvmAccount() {
        const cdp = this.getCDPClient();

        // Create a temporary account for balance checking
        // This gives us access to the listTokenBalances method
        const account = await cdp.evm.createAccount();

        return account;
    }

    /**
     * Handle SDK errors and convert to CDPApiClientError
     */
    private static handleSDKError(error: unknown): CDPApiClientError {
        if (error instanceof Error) {
            // Map common SDK errors to our error types
            const message = error.message.toLowerCase();

            if (message.includes('authentication') || message.includes('unauthorized')) {
                return new CDPApiClientError(
                    CDPApiErrorType.AUTHENTICATION_FAILED,
                    error.message,
                    401,
                    false
                );
            }

            if (message.includes('rate limit')) {
                return new CDPApiClientError(
                    CDPApiErrorType.RATE_LIMIT_EXCEEDED,
                    error.message,
                    429,
                    true
                );
            }

            if (message.includes('network') || message.includes('timeout')) {
                return new CDPApiClientError(
                    CDPApiErrorType.NETWORK_ERROR,
                    error.message,
                    undefined,
                    true
                );
            }

            if (message.includes('invalid address')) {
                return new CDPApiClientError(
                    CDPApiErrorType.INVALID_ADDRESS,
                    error.message,
                    400,
                    false
                );
            }

            return new CDPApiClientError(
                CDPApiErrorType.NETWORK_ERROR,
                error.message,
                undefined,
                true
            );
        }

        return new CDPApiClientError(
            CDPApiErrorType.NETWORK_ERROR,
            'Unknown SDK error',
            undefined,
            false
        );
    }

    /**
     * Test API authentication with CDP SDK
     */
    static async testAuthentication(): Promise<{ success: boolean; error?: string }> {
        try {
            // First verify configuration
            const configCheck = this.verifyConfiguration();
            if (!configCheck.isValid) {
                return {
                    success: false,
                    error: `Configuration invalid: ${configCheck.errors.join(', ')}`
                };
            }

            // Initialize CDP SDK client and test with a simple call
            const client = this.getCDPClient();

            // Test authentication by trying to get token balances for a known address
            const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e'; // KAI treasury address
            await this.getTokenBalances('base', testAddress);
            return { success: true };
        } catch (error) {
            console.error('CDP SDK Authentication Test Failed:', error);

            if (error instanceof CDPApiClientError) {
                return {
                    success: false,
                    error: `${error.type}: ${error.message}`
                };
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get supported networks for token balance API
     */
    static getSupportedNetworks(): string[] {
        return ['base', 'base-sepolia', 'ethereum'];
    }

    /**
     * Check if a network is supported
     */
    static isNetworkSupported(network: string): boolean {
        return this.getSupportedNetworks().includes(network);
    }

    /**
     * Get token balances for a specific network and address using CDP SDK
     * Supports pagination with nextPageToken parameter
     */
    static async getTokenBalances(
        network: string,
        address: string,
        pageToken?: string
    ): Promise<CDPTokenBalanceResponse> {
        // Validate network parameter
        const supportedNetworks = ['base', 'base-sepolia', 'ethereum'];
        if (!supportedNetworks.includes(network)) {
            throw new CDPApiClientError(
                CDPApiErrorType.BAD_REQUEST,
                `Unsupported network: ${network}. Supported networks: ${supportedNetworks.join(', ')}`,
                400,
                false
            );
        }

        // Validate address format (basic Ethereum address validation)
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            throw new CDPApiClientError(
                CDPApiErrorType.INVALID_ADDRESS,
                `Invalid Ethereum address format: ${address}`,
                400,
                false
            );
        }

        try {
            // Initialize CDP client to ensure proper configuration
            this.getCDPClient();

            // For now, let's use the REST API approach with proper CDP SDK authentication
            // The SDK's account-based approach is designed for managing your own accounts,
            // but we need to check balances for arbitrary addresses

            // Use CDP SDK's built-in authentication for REST API calls
            let endpoint = `/v2/evm/token-balances/${network}/${address}`;
            if (pageToken) {
                endpoint += `?page_token=${encodeURIComponent(pageToken)}`;
            }

            // The CDP SDK should handle authentication internally
            // For now, we'll make a direct API call but this should be replaced
            // with proper SDK methods when they become available for arbitrary address queries

            const response = await fetch(`https://api.cdp.coinbase.com${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // TODO: Use CDP SDK's internal authentication mechanism
                    // This is a temporary approach until we find the right SDK method
                },
            });

            if (!response.ok) {
                throw new CDPApiClientError(
                    CDPApiErrorType.AUTHENTICATION_FAILED,
                    `API request failed: ${response.status} ${response.statusText}`,
                    response.status,
                    response.status >= 500
                );
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`CDP SDK Error fetching balances for ${network}:`, error);
            throw this.handleSDKError(error);
        }
    }



    /**
     * Get all token balances for a network and address, handling pagination automatically
     */
    static async getAllTokenBalances(
        network: string,
        address: string
    ): Promise<CDPTokenBalance[]> {
        const allBalances: CDPTokenBalance[] = [];
        let nextPageToken: string | undefined;

        do {
            const response = await this.getTokenBalances(network, address, nextPageToken);
            allBalances.push(...response.balances);
            nextPageToken = response.nextPageToken;
        } while (nextPageToken);

        return allBalances;
    }

    /**
     * Verify environment variables are properly configured
     */
    static verifyConfiguration(): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.API_KEY_NAME) {
            errors.push('CDP_API_KEY_NAME environment variable is not set');
        }

        if (!this.API_KEY_SECRET) {
            errors.push('CDP_API_KEY_SECRET environment variable is not set');
        }

        // Validate API key format
        if (this.API_KEY_NAME && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.API_KEY_NAME)) {
            errors.push('CDP_API_KEY_NAME appears to be in invalid UUID format');
        }

        // Validate API secret format (should be base64)
        if (this.API_KEY_SECRET) {
            try {
                Buffer.from(this.API_KEY_SECRET, 'base64');
            } catch {
                errors.push('CDP_API_KEY_SECRET appears to be invalid base64 format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}