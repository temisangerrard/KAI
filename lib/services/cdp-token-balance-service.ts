/**
 * CDP Token Balance Service
 * 
 * This service orchestrates token balance API calls across multiple networks
 * and provides unified token balance data for the wallet page.
 */

import { CDPApiClient, CDPTokenBalance, CDPApiClientError, CDPApiErrorType } from './cdp-api-client';

export type SupportedNetwork = 'base' | 'base-sepolia' | 'ethereum';

export interface AggregatedTokenBalance {
  symbol: string;
  name: string;
  contractAddress: string;
  network: SupportedNetwork;
  balance: string;
  decimals: number;
  formattedBalance: string;
  isNative: boolean;
}

export interface NetworkTokenBalance {
  network: SupportedNetwork;
  tokens: AggregatedTokenBalance[];
  error?: string;
  loading: boolean;
}

export interface TokenBalanceServiceError {
  type: 'network_error' | 'authentication_error' | 'rate_limit' | 'service_unavailable' | 'unknown';
  message: string;
  network?: SupportedNetwork;
  retryable: boolean;
}

/**
 * Token Balance Service
 * Orchestrates API calls across networks and provides unified token balance data
 */
export class TokenBalanceService {
  private static readonly SUPPORTED_NETWORKS: SupportedNetwork[] = ['base', 'base-sepolia', 'ethereum'];
  private static readonly NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
  
  /**
   * Fetch all token balances across all supported networks
   */
  static async fetchAllTokenBalances(address: string): Promise<AggregatedTokenBalance[]> {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      // Make parallel API calls to all networks
      const networkPromises = this.SUPPORTED_NETWORKS.map(async (network) => {
        try {
          const tokens = await this.fetchNetworkTokens(network, address);
          return { network, tokens, error: undefined };
        } catch (error) {
          console.warn(`Failed to fetch tokens for ${network}:`, error);
          return { 
            network, 
            tokens: [], 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const networkResults = await Promise.all(networkPromises);
      
      // Aggregate all tokens from all networks
      const allTokens: AggregatedTokenBalance[] = [];
      
      for (const result of networkResults) {
        if (result.tokens.length > 0) {
          allTokens.push(...result.tokens);
        }
      }

      return allTokens;
    } catch (error) {
      console.error('Error fetching all token balances:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Fetch token balances for a specific network
   */
  static async fetchNetworkTokens(network: SupportedNetwork, address: string): Promise<AggregatedTokenBalance[]> {
    if (!this.SUPPORTED_NETWORKS.includes(network)) {
      throw new Error(`Unsupported network: ${network}`);
    }

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      // Get all token balances for the network (handles pagination automatically)
      const cdpTokens = await CDPApiClient.getAllTokenBalances(network, address);
      
      // Transform CDP API format to internal format
      const aggregatedTokens = cdpTokens.map(cdpToken => 
        this.mapCDPTokenToAggregated(cdpToken, network)
      );

      // Filter out tokens with zero balances and add network labeling
      return aggregatedTokens.filter(token => {
        const balance = parseFloat(token.balance);
        return balance > 0;
      });
    } catch (error) {
      console.error(`Error fetching tokens for ${network}:`, error);
      
      if (error instanceof CDPApiClientError) {
        throw this.mapCDPErrorToServiceError(error, network);
      }
      
      throw this.handleError(error, network);
    }
  }

  /**
   * Refresh token balances (bypasses any caching in the API client)
   */
  static async refreshTokenBalances(address: string): Promise<AggregatedTokenBalance[]> {
    // For now, this is the same as fetchAllTokenBalances since the API client
    // doesn't implement caching. When caching is added to the API client,
    // this method can be enhanced to bypass cache.
    return this.fetchAllTokenBalances(address);
  }

  /**
   * Get parallel network status for all networks
   */
  static async getNetworkTokenStatus(address: string): Promise<Record<SupportedNetwork, NetworkTokenBalance>> {
    const status: Record<SupportedNetwork, NetworkTokenBalance> = {} as any;

    // Initialize all networks as loading
    for (const network of this.SUPPORTED_NETWORKS) {
      status[network] = {
        network,
        tokens: [],
        loading: true
      };
    }

    // Make parallel calls to all networks
    const networkPromises = this.SUPPORTED_NETWORKS.map(async (network) => {
      try {
        const tokens = await this.fetchNetworkTokens(network, address);
        status[network] = {
          network,
          tokens,
          loading: false
        };
      } catch (error) {
        status[network] = {
          network,
          tokens: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false
        };
      }
    });

    await Promise.all(networkPromises);
    return status;
  }

  /**
   * Transform CDP API token to internal AggregatedTokenBalance format
   */
  private static mapCDPTokenToAggregated(
    cdpToken: CDPTokenBalance, 
    network: SupportedNetwork
  ): AggregatedTokenBalance {
    const balance = cdpToken.amount.amount;
    const decimals = cdpToken.amount.decimals;
    const isNative = cdpToken.token.contractAddress === this.NATIVE_TOKEN_ADDRESS;
    
    return {
      symbol: cdpToken.token.symbol || 'UNKNOWN',
      name: cdpToken.token.name || cdpToken.token.symbol || 'Unknown Token',
      contractAddress: cdpToken.token.contractAddress,
      network: network,
      balance: balance,
      decimals: decimals,
      formattedBalance: this.formatTokenBalance(balance, decimals),
      isNative: isNative
    };
  }

  /**
   * Format token balance for display
   */
  private static formatTokenBalance(balance: string, decimals: number): string {
    try {
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      
      // Convert to decimal
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      
      // Format fractional part with proper decimal places
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      
      // Trim trailing zeros and decimal point if needed
      const trimmedFractional = fractionalStr.replace(/0+$/, '');
      
      if (trimmedFractional === '') {
        return wholePart.toString();
      }
      
      // Limit to 6 decimal places for display
      const displayFractional = trimmedFractional.slice(0, 6);
      return `${wholePart}.${displayFractional}`;
    } catch (error) {
      console.warn('Error formatting token balance:', error);
      return '0';
    }
  }

  /**
   * Map CDP API client errors to service errors
   */
  private static mapCDPErrorToServiceError(
    error: CDPApiClientError, 
    network?: SupportedNetwork
  ): TokenBalanceServiceError {
    let type: TokenBalanceServiceError['type'];
    
    switch (error.type) {
      case CDPApiErrorType.AUTHENTICATION_FAILED:
        type = 'authentication_error';
        break;
      case CDPApiErrorType.RATE_LIMIT_EXCEEDED:
        type = 'rate_limit';
        break;
      case CDPApiErrorType.SERVICE_UNAVAILABLE:
      case CDPApiErrorType.INTERNAL_SERVER_ERROR:
        type = 'service_unavailable';
        break;
      case CDPApiErrorType.NETWORK_ERROR:
      case CDPApiErrorType.TIMEOUT:
        type = 'network_error';
        break;
      default:
        type = 'unknown';
    }

    return {
      type,
      message: error.message,
      network,
      retryable: error.retryable
    };
  }

  /**
   * Handle general errors and convert to service errors
   */
  private static handleError(error: unknown, network?: SupportedNetwork): TokenBalanceServiceError {
    console.error('Token Balance Service Error:', error);

    if (error instanceof Error) {
      return {
        type: 'unknown',
        message: error.message,
        network,
        retryable: true
      };
    }

    return {
      type: 'unknown',
      message: 'An unknown error occurred',
      network,
      retryable: true
    };
  }

  /**
   * Get supported networks
   */
  static getSupportedNetworks(): SupportedNetwork[] {
    return [...this.SUPPORTED_NETWORKS];
  }

  /**
   * Check if a network is supported
   */
  static isNetworkSupported(network: string): network is SupportedNetwork {
    return this.SUPPORTED_NETWORKS.includes(network as SupportedNetwork);
  }

  /**
   * Get network display information
   */
  static getNetworkInfo(network: SupportedNetwork): { name: string; displayName: string; color: string } {
    const networkInfo = {
      'base': { name: 'base', displayName: 'Base', color: '#0052FF' },
      'base-sepolia': { name: 'base-sepolia', displayName: 'Base Sepolia', color: '#FF6B35' },
      'ethereum': { name: 'ethereum', displayName: 'Ethereum', color: '#627EEA' }
    };

    return networkInfo[network] || { name: network, displayName: network, color: '#666666' };
  }
}