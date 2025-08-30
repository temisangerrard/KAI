/**
 * Admin Network Configuration
 * 
 * This file contains the network configuration that should be set by the admin.
 * The network is not auto-detected but explicitly configured here.
 */

export interface AdminNetworkConfig {
  currentNetwork: 'base-mainnet' | 'base-sepolia' | 'ethereum-mainnet' | 'ethereum-sepolia';
  allowNetworkSwitching: boolean;
  testnetWarningsEnabled: boolean;
}

/**
 * ADMIN CONFIGURATION
 * 
 * Set your desired network configuration here:
 * - currentNetwork: The network your application should use
 * - allowNetworkSwitching: Whether users can switch networks (currently not supported by CDP)
 * - testnetWarningsEnabled: Whether to show testnet warnings
 */
export const ADMIN_NETWORK_CONFIG: AdminNetworkConfig = {
  // Set this to your desired network
  currentNetwork: process.env.NODE_ENV === 'development' ? 'base-sepolia' : 'base-mainnet',
  
  // CDP currently doesn't support network switching
  allowNetworkSwitching: false,
  
  // Show warnings when on testnet
  testnetWarningsEnabled: true,
};

/**
 * Get the admin-configured network
 */
export function getAdminConfiguredNetwork(): AdminNetworkConfig['currentNetwork'] {
  return ADMIN_NETWORK_CONFIG.currentNetwork;
}

/**
 * Check if network switching is allowed by admin
 */
export function isNetworkSwitchingAllowed(): boolean {
  return ADMIN_NETWORK_CONFIG.allowNetworkSwitching;
}

/**
 * Check if testnet warnings are enabled by admin
 */
export function areTestnetWarningsEnabled(): boolean {
  return ADMIN_NETWORK_CONFIG.testnetWarningsEnabled;
}

/**
 * Override network configuration (for admin use)
 */
export function setAdminNetworkConfig(config: Partial<AdminNetworkConfig>): void {
  Object.assign(ADMIN_NETWORK_CONFIG, config);
}