# Network Administration Guide

## Overview

The KAI platform now uses **admin-controlled network configuration** instead of auto-detection. As the admin, you have full control over which network the platform uses.

## Fixed Issues

### ✅ JavaScript Error Fixed
- **Issue**: `ReferenceError: Cannot access 'handleNetworkChange' before initialization`
- **Fix**: Moved function definition before usage in the wallet page

### ✅ Architecture Improved
- **Issue**: Network was being auto-detected, which is not ideal for production
- **Fix**: Network is now explicitly configured by admin (you)

## Admin Network Configuration

### 1. Configuration File
The network configuration is located in:
```
lib/config/network-config.ts
```

### 2. Current Configuration
```typescript
export const ADMIN_NETWORK_CONFIG: AdminNetworkConfig = {
  // Set this to your desired network
  currentNetwork: process.env.NODE_ENV === 'development' ? 'base-sepolia' : 'base-mainnet',
  
  // CDP currently doesn't support network switching
  allowNetworkSwitching: false,
  
  // Show warnings when on testnet
  testnetWarningsEnabled: true,
};
```

### 3. Admin Interface
You can now manage network settings through the admin interface:
- **URL**: `/admin/network-settings`
- **Features**:
  - Select active network (Base Mainnet, Base Sepolia, Ethereum Mainnet, Ethereum Sepolia)
  - Toggle testnet warnings
  - View current network status
  - Real-time configuration updates

## Supported Networks

| Network | Chain ID | Type | CDP Support |
|---------|----------|------|-------------|
| Base Mainnet | 8453 | Mainnet | Full (Gasless, Smart Contracts, Trading) |
| Base Sepolia | 84532 | Testnet | Full (Gasless, Faucet, Smart Contracts) |
| Ethereum Mainnet | 1 | Mainnet | Partial (Smart Contracts, Trading, Staking) |
| Ethereum Sepolia | 11155111 | Testnet | Limited (Faucet only) |

## How to Change Networks

### Method 1: Admin Interface (Recommended)
1. Go to `/admin/network-settings`
2. Select your desired network
3. Click "Save Configuration"
4. Changes apply immediately to all users

### Method 2: Configuration File
1. Edit `lib/config/network-config.ts`
2. Change the `currentNetwork` value:
   ```typescript
   currentNetwork: 'base-mainnet', // or 'base-sepolia', 'ethereum-mainnet', 'ethereum-sepolia'
   ```
3. Rebuild the application: `npm run build`

## User Experience

### Network Display
- Users see the current network prominently in the wallet
- Network information is shown in the sidebar
- Testnet warnings appear when on test networks

### Network Switching
- Users **cannot** switch networks themselves
- Network switching is controlled by admin only
- Users see a message: "Network is configured by admin. Contact admin to change networks."

## Development vs Production

### Development Environment
- Default: Base Sepolia (testnet)
- Testnet warnings enabled
- Safe for testing

### Production Environment  
- Default: Base Mainnet
- Real transactions with real value
- Production-ready

## Environment Variables

You can also control the network via environment variables:
```bash
# Force testnet usage
NEXT_PUBLIC_USE_TESTNET=true

# Development mode (automatically uses testnet)
NODE_ENV=development
```

## Recommendations

### For Development/Testing
- Use **Base Sepolia** 
- Keep testnet warnings enabled
- Test all functionality before switching to mainnet

### For Production
- Use **Base Mainnet**
- Monitor network status regularly
- Have a rollback plan if issues occur

## Troubleshooting

### If Network Changes Don't Apply
1. Clear browser cache
2. Restart the application
3. Check the configuration file syntax
4. Verify the network ID is supported

### If Users Report Network Issues
1. Check current configuration in admin panel
2. Verify network connectivity
3. Check CDP service status
4. Review error logs

## Security Notes

- Only admin can change networks
- Network configuration is server-side controlled
- Users cannot bypass network restrictions
- All network changes are logged

## Next Steps

1. **Test the admin interface**: Go to `/admin/network-settings`
2. **Choose your network**: Select Base Mainnet for production or Base Sepolia for testing
3. **Monitor users**: Watch for any network-related issues
4. **Document changes**: Keep track of when you change networks

The network configuration is now fully under your control as the admin! 🎉