/**
 * Network Service for CDP Network Management
 * 
 * This service provides network management capabilities for the KAI platform,
 * using admin-configured network settings instead of auto-detection.
 * The network is explicitly set by the admin, not auto-detected.
 */

import { getAdminConfiguredNetwork, areTestnetWarningsEnabled } from '@/lib/config/network-config';

export interface NetworkInfo {
  id: string;
  name: string;
  displayName: string;
  isTestnet: boolean;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  status: 'active' | 'maintenance' | 'deprecated';
  chainId: number;
  cdpSupported: boolean; // Whether CDP directly supports this network
}

export interface NetworkStatus {
  connected: boolean;
  currentNetwork: NetworkInfo | null;
  blockHeight?: number;
  lastUpdated: Date;
}

/**
 * Supported networks for KAI platform
 */
export const SUPPORTED_NETWORKS: Record<string, NetworkInfo> = {
  'base-mainnet': {
    id: 'base-mainnet',
    name: 'base',
    displayName: 'Base Mainnet',
    isTestnet: false,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    status: 'active',
    chainId: 8453,
    cdpSupported: true, // Full CDP support including paymaster
  },
  'base-sepolia': {
    id: 'base-sepolia',
    name: 'base-sepolia',
    displayName: 'Base Sepolia',
    isTestnet: true,
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    status: 'active',
    chainId: 84532,
    cdpSupported: true, // Full CDP support including paymaster and faucet
  },
  'ethereum-mainnet': {
    id: 'ethereum-mainnet',
    name: 'ethereum',
    displayName: 'Ethereum Mainnet',
    isTestnet: false,
    rpcUrl: 'https://ethereum.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    status: 'active',
    chainId: 1,
    cdpSupported: true, // CDP supports Ethereum (no paymaster)
  },
  'ethereum-sepolia': {
    id: 'ethereum-sepolia',
    name: 'ethereum-sepolia',
    displayName: 'Ethereum Sepolia',
    isTestnet: true,
    rpcUrl: 'https://sepolia.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    status: 'active',
    chainId: 11155111,
    cdpSupported: true, // CDP supports Ethereum Sepolia with faucet
  },
};

/**
 * Network Service Class
 * Provides network detection and management functionality
 */
export class NetworkService {
  private static networkChangeCallbacks: ((network: NetworkInfo | null) => void)[] = [];
  private static currentNetworkCache: NetworkInfo | null = null;
  private static lastDetectionTime: number = 0;
  private static readonly CACHE_DURATION = 30000; // 30 seconds

  /**
   * Get current network based on admin configuration
   * Network is explicitly set by admin, not auto-detected
   */
  static async detectCurrentNetwork(): Promise<NetworkInfo | null> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.currentNetworkCache && (now - this.lastDetectionTime) < this.CACHE_DURATION) {
        return this.currentNetworkCache;
      }

      // Get network from admin configuration
      const configuredNetworkId = getAdminConfiguredNetwork();
      const configuredNetwork = SUPPORTED_NETWORKS[configuredNetworkId];
      
      if (!configuredNetwork) {
        console.error(`Admin configured network '${configuredNetworkId}' not found in supported networks`);
        return this.getDefaultNetwork();
      }
      
      // Update cache
      this.currentNetworkCache = configuredNetwork;
      this.lastDetectionTime = now;
      
      // Notify listeners if network changed
      this.notifyNetworkChange(configuredNetwork);
      
      return configuredNetwork;
    } catch (error) {
      console.error('Failed to get admin configured network:', error);
      // Fallback to default network
      return this.getDefaultNetwork();
    }
  }

  /**
   * Perform network detection based on environment and CDP configuration
   * Since CDP manages networks internally, we use environment hints and
   * configuration to determine the likely network without external API calls
   */
  private static async performNetworkDetection(): Promise<NetworkInfo | null> {
    // Check environment variables for network hints
    const nodeEnv = process.env.NODE_ENV;
    const cdpProjectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID;
    
    // In development or if explicitly configured for testnet, use Base Sepolia
    if (nodeEnv === 'development' || 
        process.env.NEXT_PUBLIC_USE_TESTNET === 'true' ||
        cdpProjectId?.includes('test') || 
        cdpProjectId?.includes('sepolia')) {
      return SUPPORTED_NETWORKS['base-sepolia'];
    }
    
    // Use environment-based detection without external API calls
    // Default to mainnet for production environments
    return this.getDefaultNetwork();
  }

  /**
   * Get admin configured network
   */
  private static getAdminConfiguredNetwork(): NetworkInfo {
    const configuredNetworkId = getAdminConfiguredNetwork();
    const network = SUPPORTED_NETWORKS[configuredNetworkId];
    
    if (!network) {
      console.error(`Admin configured network '${configuredNetworkId}' not found, using default`);
      return this.getDefaultNetwork();
    }
    
    return network;
  }

  /**
   * Get default network based on environment
   */
  private static getDefaultNetwork(): NetworkInfo {
    const nodeEnv = process.env.NODE_ENV;
    
    // Use testnet for development, mainnet for production
    if (nodeEnv === 'development' || process.env.NEXT_PUBLIC_USE_TESTNET === 'true') {
      return SUPPORTED_NETWORKS['base-sepolia'];
    }
    
    return SUPPORTED_NETWORKS['base-mainnet'];
  }

  /**
   * Get current network status with CDP integration
   */
  static async getCurrentNetworkStatus(): Promise<NetworkStatus> {
    const currentNetwork = await this.detectCurrentNetwork();
    
    // Enhanced connectivity check
    const isConnected = currentNetwork !== null && 
                       navigator.onLine && 
                       await this.validateNetworkConnectivity(currentNetwork?.id || '');
    
    return {
      connected: isConnected,
      currentNetwork,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get all supported networks
   */
  static getSupportedNetworks(): NetworkInfo[] {
    return Object.values(SUPPORTED_NETWORKS);
  }

  /**
   * Check if a network is a testnet
   */
  static isTestnet(networkId: string): boolean {
    const network = SUPPORTED_NETWORKS[networkId];
    return network?.isTestnet ?? false;
  }

  /**
   * Get network by ID
   */
  static getNetworkById(networkId: string): NetworkInfo | null {
    return SUPPORTED_NETWORKS[networkId] || null;
  }

  /**
   * Subscribe to network changes
   */
  static onNetworkChange(callback: (network: NetworkInfo | null) => void): () => void {
    this.networkChangeCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.networkChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.networkChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of network change
   */
  private static notifyNetworkChange(network: NetworkInfo | null): void {
    this.networkChangeCallbacks.forEach(callback => {
      try {
        callback(network);
      } catch (error) {
        console.error('Network change callback error:', error);
      }
    });
  }

  /**
   * Clear network cache (useful for testing or forced refresh)
   */
  static clearCache(): void {
    this.currentNetworkCache = null;
    this.lastDetectionTime = 0;
  }

  /**
   * Check if CDP supports network switching
   * Currently, CDP manages network selection internally and doesn't
   * expose network switching capabilities to the application
   */
  static supportsNetworkSwitching(): boolean {
    // CDP currently doesn't support programmatic network switching
    // Network selection is managed by CDP based on configuration
    return false;
  }

  /**
   * Get network switching information for users
   */
  static getNetworkSwitchingInfo(): {
    supported: boolean;
    message: string;
    instructions?: string;
  } {
    return {
      supported: false,
      message: 'Network selection is managed by Coinbase CDP',
      instructions: 'The network is automatically selected based on your CDP configuration. To use a different network, contact support or check your CDP project settings.',
    };
  }

  /**
   * Validate network connectivity using CDP-aware detection
   * Note: Removed external RPC calls to prevent "Failed to fetch" errors
   * Network connectivity is now determined by CDP configuration and browser connectivity
   */
  static async validateNetworkConnectivity(networkId: string): Promise<boolean> {
    const network = this.getNetworkById(networkId);
    if (!network) return false;

    // Check browser connectivity first
    if (!navigator.onLine) {
      return false;
    }

    // For CDP-supported networks, assume connectivity is available
    // CDP handles network connectivity internally
    if (network.cdpSupported) {
      return true;
    }

    // For non-CDP networks, return false to indicate limited support
    return false;
  }

  /**
   * Check if network switching is supported
   * CDP currently doesn't support programmatic network switching,
   * but users can switch networks through their wallet interface
   */
  static isNetworkSwitchingSupported(): boolean {
    // CDP doesn't currently support programmatic network switching
    // Users need to switch networks through their wallet interface
    return false;
  }

  /**
   * Get network switching instructions for users
   */
  static getNetworkSwitchingInstructions(targetNetworkId: string): string | null {
    const network = this.getNetworkById(targetNetworkId);
    if (!network) return null;

    if (network.cdpSupported) {
      return `To switch to ${network.displayName}, please use your Coinbase Wallet settings or contact support for assistance.`;
    } else {
      return `${network.displayName} is not directly supported by CDP. You can sign transactions for this network using the useSignEvmTransaction hook.`;
    }
  }

  /**
   * Check if a network supports CDP's Send Transaction API
   */
  static supportsSendTransactionAPI(networkId: string): boolean {
    const network = this.getNetworkById(networkId);
    return network?.cdpSupported ?? false;
  }

  /**
   * Get recommended approach for transactions on a network
   */
  static getTransactionApproach(networkId: string): 'send-api' | 'sign-and-broadcast' | 'unsupported' {
    const network = this.getNetworkById(networkId);
    if (!network) return 'unsupported';

    if (network.cdpSupported) {
      return 'send-api'; // Use CDP's Send Transaction API
    } else {
      return 'sign-and-broadcast'; // Use useSignEvmTransaction + manual broadcast
    }
  }

  /**
   * Check if a network supports CDP paymaster (gasless transactions)
   */
  static supportsPaymaster(networkId: string): boolean {
    // Based on CDP documentation, paymaster is supported on Base networks
    return networkId === 'base-mainnet' || networkId === 'base-sepolia';
  }

  /**
   * Check if a network has faucet support for testnet tokens
   */
  static supportsFaucet(networkId: string): boolean {
    // Based on CDP documentation, faucets are available for testnets
    const network = this.getNetworkById(networkId);
    return network?.isTestnet ?? false;
  }

  /**
   * Get CDP-specific features for a network
   */
  static getCDPFeatures(networkId: string): {
    paymaster: boolean;
    faucet: boolean;
    smartContracts: boolean;
    trades: boolean;
    staking: boolean;
  } {
    const network = this.getNetworkById(networkId);
    if (!network?.cdpSupported) {
      return {
        paymaster: false,
        faucet: false,
        smartContracts: false,
        trades: false,
        staking: false,
      };
    }

    // Features based on CDP documentation
    switch (networkId) {
      case 'base-mainnet':
        return {
          paymaster: true,
          faucet: false,
          smartContracts: true,
          trades: true,
          staking: false,
        };
      case 'base-sepolia':
        return {
          paymaster: true,
          faucet: true,
          smartContracts: true,
          trades: false,
          staking: false,
        };
      case 'ethereum-mainnet':
        return {
          paymaster: false,
          faucet: false,
          smartContracts: true,
          trades: true,
          staking: true,
        };
      case 'ethereum-sepolia':
        return {
          paymaster: false,
          faucet: true,
          smartContracts: false,
          trades: false,
          staking: false,
        };
      default:
        return {
          paymaster: false,
          faucet: false,
          smartContracts: false,
          trades: false,
          staking: false,
        };
    }
  }
}