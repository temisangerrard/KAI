/**
 * User Token Balance Service
 * 
 * This service fetches token balances for the currently logged-in user
 * using their wallet address and client-side RPC calls.
 */

import { createPublicClient, http, formatUnits } from 'viem'
import { base, baseSepolia, mainnet } from 'viem/chains'

export type SupportedNetwork = 'base' | 'base-sepolia' | 'ethereum';

export interface UserTokenBalance {
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
  tokens: UserTokenBalance[];
  error?: string;
  loading: boolean;
}

/**
 * User Token Balance Service
 * Fetches token balances for the logged-in user using client-side RPC calls
 */
export class UserTokenBalanceService {
  private static readonly SUPPORTED_NETWORKS: SupportedNetwork[] = ['base', 'base-sepolia', 'ethereum'];
  private static readonly NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
  
  // Network configurations
  private static readonly NETWORK_CONFIGS = {
    'base': {
      chain: base,
      rpcUrl: `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY || ''}`,
      nativeSymbol: 'ETH',
      nativeName: 'Ethereum'
    },
    'base-sepolia': {
      chain: baseSepolia,
      rpcUrl: `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY || ''}`,
      nativeSymbol: 'ETH',
      nativeName: 'Ethereum'
    },
    'ethereum': {
      chain: mainnet,
      rpcUrl: `https://api.developer.coinbase.com/rpc/v1/ethereum/${process.env.NEXT_PUBLIC_CDP_CLIENT_API_KEY || ''}`,
      nativeSymbol: 'ETH',
      nativeName: 'Ethereum'
    }
  };

  // Common ERC-20 tokens by network
  private static readonly COMMON_TOKENS = {
    'base': [
      {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      {
        address: '0x4200000000000000000000000000000000000006' as `0x${string}`,
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18
      }
    ],
    'base-sepolia': [
      {
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
        symbol: 'USDC',
        name: 'USD Coin (Testnet)',
        decimals: 6
      }
    ],
    'ethereum': [
      {
        address: '0xA0b86a33E6441c8C673f4c8e4B2F4b8b4B2F4b8b' as `0x${string}`,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      }
    ]
  };

  /**
   * Get viem client for a specific network
   */
  private static getClient(network: SupportedNetwork) {
    const config = this.NETWORK_CONFIGS[network];
    
    return createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * Fetch all token balances for a user across all supported networks
   */
  static async fetchAllTokenBalances(address: string): Promise<UserTokenBalance[]> {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      // Make parallel API calls to all networks
      const networkPromises = this.SUPPORTED_NETWORKS.map(async (network) => {
        try {
          const tokens = await this.fetchNetworkTokens(network, address);
          return tokens;
        } catch (error) {
          console.warn(`Failed to fetch tokens for ${network}:`, error);
          return [];
        }
      });

      const networkResults = await Promise.all(networkPromises);
      
      // Aggregate all tokens from all networks
      const allTokens: UserTokenBalance[] = [];
      
      for (const tokens of networkResults) {
        if (tokens.length > 0) {
          allTokens.push(...tokens);
        }
      }

      return allTokens;
    } catch (error) {
      console.error('Error fetching all token balances:', error);
      throw error;
    }
  }

  /**
   * Fetch token balances for a specific network
   */
  static async fetchNetworkTokens(network: SupportedNetwork, address: string): Promise<UserTokenBalance[]> {
    if (!this.SUPPORTED_NETWORKS.includes(network)) {
      throw new Error(`Unsupported network: ${network}`);
    }

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    try {
      const client = this.getClient(network);
      const config = this.NETWORK_CONFIGS[network];
      const tokens: UserTokenBalance[] = [];

      // Fetch native token balance (ETH)
      try {
        const nativeBalance = await client.getBalance({
          address: address as `0x${string}`
        });

        if (nativeBalance > 0n) {
          tokens.push({
            symbol: config.nativeSymbol,
            name: config.nativeName,
            contractAddress: this.NATIVE_TOKEN_ADDRESS,
            network: network,
            balance: nativeBalance.toString(),
            decimals: 18,
            formattedBalance: this.formatTokenBalance(nativeBalance.toString(), 18),
            isNative: true
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch native balance for ${network}:`, error);
      }

      // Fetch ERC-20 token balances
      const commonTokens = this.COMMON_TOKENS[network] || [];
      
      for (const token of commonTokens) {
        try {
          const balance = await client.readContract({
            address: token.address,
            abi: [
              {
                name: 'balanceOf',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'account', type: 'address' }],
                outputs: [{ name: '', type: 'uint256' }],
              },
            ],
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          });

          if (balance > 0n) {
            tokens.push({
              symbol: token.symbol,
              name: token.name,
              contractAddress: token.address,
              network: network,
              balance: balance.toString(),
              decimals: token.decimals,
              formattedBalance: this.formatTokenBalance(balance.toString(), token.decimals),
              isNative: false
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch ${token.symbol} balance for ${network}:`, error);
        }
      }

      return tokens;
    } catch (error) {
      console.error(`Error fetching tokens for ${network}:`, error);
      throw error;
    }
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